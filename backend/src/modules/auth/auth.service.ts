import type { Types } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { logger } from '../../common/logger.js';
import { burnPasswordCheck, verifyPassword } from '../../common/security/password.js';
import { randomToken, sha256 } from '../../common/security/tokens.js';
import { env } from '../../config/env.js';
import { blindIndex } from '../../common/security/fieldEncryption.js';
import { toPublicUser, type PublicUser } from '../users/user.mapper.js';
import { UserModel } from '../users/user.model.js';
import { getUserById } from '../users/user.service.js';
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from './accessToken.js';
import type { LoginInput } from './auth.schemas.js';
import type { ClientInfo } from './auth.types.js';
import { SessionModel } from './session.model.js';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  /** Số giây access token còn hiệu lực. */
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

const DAY_MS = 86_400_000;

/** Có '@' → email, ngược lại → SĐT. */
const identifierFilter = (identifier: string) =>
  identifier.includes('@')
    ? { emailHash: blindIndex('email', identifier) }
    : { phoneHash: blindIndex('phone', identifier) };
const refreshExpiry = () => new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);

function buildResult(
  user: object & { _id: Types.ObjectId },
  sessionId: Types.ObjectId,
  refreshToken: string,
  expiresAt: Date,
): AuthResult {
  return {
    user: toPublicUser(user as Parameters<typeof toPublicUser>[0]),
    accessToken: signAccessToken({ sub: user._id.toString(), sid: sessionId.toString() }),
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
  };
}

/**
 * Đăng nhập: kiểm tra khoá tạm → mật khẩu → trạng thái tài khoản, rồi tạo phiên mới.
 * Sai mật khẩu và sai tên đăng nhập trả cùng một lỗi để không lộ tài khoản nào tồn tại.
 * Đăng nhập bằng SĐT hoặc email — tra qua blind index vì giá trị gốc đã mã hoá.
 */
export async function login(input: LoginInput, client: ClientInfo): Promise<AuthResult> {
  const user = await UserModel.findOne(identifierFilter(input.identifier)).select(
    '+passwordHash +failedLoginCount +lockedUntil',
  );

  if (!user) {
    await burnPasswordCheck(input.password);
    throw Errors.invalidCredentials();
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) throw Errors.accountLocked(user.lockedUntil);

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    await registerFailedLogin(user._id, now);
  }

  if (user.status !== 'active') throw Errors.accountDisabled();

  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = now;
  await user.save();

  const refreshToken = randomToken();
  const session = await SessionModel.create({
    userId: user._id,
    tokenHash: sha256(refreshToken),
    expiresAt: refreshExpiry(),
    lastUsedAt: now,
    ...client,
  });

  logger.info({ userId: user.id, role: user.role }, 'Đăng nhập thành công');
  return buildResult(user, session._id, refreshToken, session.expiresAt);
}

/** Tăng bộ đếm sai (atomic); đủ ngưỡng thì khoá tạm. Luôn ném lỗi. */
async function registerFailedLogin(userId: Types.ObjectId, now: Date): Promise<never> {
  const updated = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { failedLoginCount: 1 } },
    { returnDocument: 'after' },
  ).select('+failedLoginCount');

  if (updated && (updated.failedLoginCount ?? 0) >= env.LOGIN_MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + env.LOGIN_LOCK_MINUTES * 60_000);
    await UserModel.updateOne({ _id: userId }, { $set: { lockedUntil, failedLoginCount: 0 } });
    logger.warn({ userId: userId.toString() }, 'Khoá tạm tài khoản do đăng nhập sai nhiều lần');
    throw Errors.accountLocked(lockedUntil);
  }
  throw Errors.invalidCredentials();
}

/**
 * Cấp access token mới từ refresh token và xoay vòng refresh token.
 * Dùng lại refresh token đã xoay (bị đánh cắp / gửi trùng) → thu hồi cả phiên.
 */
export async function refresh(refreshToken: string, client: ClientInfo): Promise<AuthResult> {
  const hash = sha256(refreshToken);
  const now = new Date();
  const session = await SessionModel.findOne({
    $or: [{ tokenHash: hash }, { previousTokenHash: hash }],
  });

  if (!session || session.revokedAt || session.expiresAt <= now) throw Errors.unauthorized();

  if (session.previousTokenHash === hash) {
    await revokeSession(session._id, 'token_reuse');
    logger.warn({ sessionId: session.id }, 'Refresh token cũ bị dùng lại — đã thu hồi phiên');
    throw Errors.unauthorized();
  }

  const user = await UserModel.findById(session.userId);
  if (!user || user.status !== 'active') {
    await revokeSession(session._id, 'user_disabled');
    throw Errors.unauthorized();
  }

  const nextToken = randomToken();
  const expiresAt = refreshExpiry();
  // Điều kiện tokenHash đảm bảo hai request refresh đồng thời chỉ một cái thắng.
  const rotated = await SessionModel.updateOne(
    { _id: session._id, tokenHash: hash, revokedAt: null },
    {
      $set: {
        tokenHash: sha256(nextToken),
        previousTokenHash: hash,
        expiresAt,
        lastUsedAt: now,
        ...client,
      },
    },
  );
  if (rotated.modifiedCount === 0) throw Errors.unauthorized();

  return buildResult(user, session._id, nextToken, expiresAt);
}

/** Đăng xuất phiên hiện tại — xác định qua id phiên (từ access token) hoặc refresh token. */
export async function logout(target: { sessionId?: string; refreshToken?: string }) {
  const filter = target.sessionId
    ? { _id: target.sessionId }
    : target.refreshToken
      ? { tokenHash: sha256(target.refreshToken) }
      : undefined;
  if (!filter) return;

  await SessionModel.updateOne(
    { ...filter, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'logout' } },
  );
}

/** Đăng xuất khỏi mọi thiết bị. */
export async function logoutAll(userId: string) {
  await SessionModel.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'logout_all' } },
  );
}

export const getCurrentUser = (userId: string) => getUserById(userId);

async function revokeSession(sessionId: Types.ObjectId, reason: 'token_reuse' | 'user_disabled') {
  await SessionModel.updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}
