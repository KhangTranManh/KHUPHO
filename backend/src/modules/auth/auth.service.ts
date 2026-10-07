import type { Types } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { logger } from '../../common/logger.js';
import { burnPasswordCheck, generateTempPassword, hashPassword, verifyPassword } from '../../common/security/password.js';
import { randomToken, sha256 } from '../../common/security/tokens.js';
import { sms } from '../../common/sms/sms.js';
import { verifyFirebasePhoneToken } from '../../common/security/firebaseToken.js';
import { env } from '../../config/env.js';
import { blindIndex } from '../../common/security/fieldEncryption.js';
import { toPublicUser, type PublicUser } from '../users/user.mapper.js';
import { UserModel } from '../users/user.model.js';
import { getUserById } from '../users/user.service.js';
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from './accessToken.js';
import type { ChangePasswordInput, LoginInput } from './auth.schemas.js';
import type { AuthContext, ClientInfo } from './auth.types.js';
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
 * Đăng nhập: kiểm tra khoá tạm → mật khẩu (hoặc mật khẩu tạm) → trạng thái tài khoản, rồi tạo phiên mới.
 * Sai mật khẩu và sai tên đăng nhập trả cùng một lỗi để không lộ tài khoản nào tồn tại.
 * Đăng nhập bằng SĐT hoặc email — tra qua blind index vì giá trị gốc đã mã hoá.
 * Đăng nhập bằng mật khẩu tạm: mật khẩu tạm bị huỷ ngay (dùng một lần) và tài khoản bị đánh dấu
 * mustChangePassword → mọi API khác trả 403 PASSWORD_CHANGE_REQUIRED cho tới khi đổi mật khẩu.
 */
export async function login(input: LoginInput, client: ClientInfo): Promise<AuthResult> {
  const user = await UserModel.findOne(identifierFilter(input.identifier)).select(
    '+passwordHash +failedLoginCount +lockedUntil +tempPassword',
  );

  if (!user) {
    await burnPasswordCheck(input.password);
    throw Errors.invalidCredentials();
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) throw Errors.accountLocked(user.lockedUntil);

  let viaPassword = false;
  if (user.passwordHash) viaPassword = await verifyPassword(input.password, user.passwordHash);
  else await burnPasswordCheck(input.password); // chưa kích hoạt: giữ thời gian phản hồi như thường
  const viaTempPassword =
    !viaPassword &&
    !!user.tempPassword &&
    user.tempPassword.expiresAt > now &&
    (await verifyPassword(input.password.trim().toUpperCase(), user.tempPassword.hash));

  if (!viaPassword && !viaTempPassword) await registerFailedLogin(user._id, now);

  if (user.status !== 'active') throw Errors.accountDisabled();

  if (viaTempPassword) {
    user.tempPassword = undefined;
    user.mustChangePassword = true;
  }
  return startSession(user, client, now);
}

/**
 * Đăng nhập bằng SĐT đã xác minh OTP qua Firebase (đăng nhập lần đầu / quên mật khẩu).
 * Người dùng đã chứng minh sở hữu SĐT nên được báo rõ khi SĐT chưa có tài khoản.
 * Giống mật khẩu tạm: sau khi vào phải đặt mật khẩu mới (mustChangePassword).
 */
export async function loginWithFirebase(idToken: string, client: ClientInfo): Promise<AuthResult> {
  const phone = await verifyFirebasePhoneToken(idToken);
  const user = await UserModel.findOne({ phoneHash: blindIndex('phone', phone) }).select('+lockedUntil');
  if (!user) throw Errors.notFound('Số điện thoại này chưa được khu phố cấp tài khoản, vui lòng liên hệ trưởng khu phố');

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) throw Errors.accountLocked(user.lockedUntil);
  if (user.status !== 'active') throw Errors.accountDisabled();

  user.mustChangePassword = true;
  user.tempPassword = undefined;
  return startSession(user, client, now);
}

/** Document user đã tải (kể cả khi select thêm trường ẩn). */
type LoadedUser = NonNullable<Awaited<ReturnType<typeof UserModel.findOne>>>;

/** Đăng nhập thành công: xoá bộ đếm sai, lưu user, tạo phiên + token. */
async function startSession(user: LoadedUser, client: ClientInfo, now: Date): Promise<AuthResult> {
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
  await revokeExcessSessions(user._id);

  logger.info({ userId: user.id, role: user.role }, 'Đăng nhập thành công');
  return buildResult(user, session._id, refreshToken, session.expiresAt);
}

/**
 * Giữ tối đa MAX_SESSIONS_PER_USER phiên còn hiệu lực mỗi tài khoản: đăng nhập liên tục (bấm nhiều lần,
 * nhiều thiết bị) không làm collection sessions phình ra — phiên cũ nhất bị thu hồi.
 */
async function revokeExcessSessions(userId: Types.ObjectId) {
  const excess = await SessionModel.find({ userId, revokedAt: null })
    .sort({ createdAt: -1 })
    .skip(env.MAX_SESSIONS_PER_USER)
    .select('_id')
    .lean();
  if (!excess.length) return;
  await SessionModel.updateMany(
    { _id: { $in: excess.map((s) => s._id) } },
    { $set: { revokedAt: new Date(), revokedReason: 'session_limit' } },
  );
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

/**
 * Gửi mật khẩu tạm qua SMS — cho đăng nhập lần đầu (tài khoản chưa có mật khẩu) và quên mật khẩu.
 * Luôn trả cùng một kết quả dù SĐT có tài khoản hay không (không lộ tài khoản nào tồn tại);
 * gửi lại cho cùng một số phải cách nhau TEMP_PASSWORD_RESEND_SECONDS.
 * Mật khẩu cũ (nếu có) vẫn dùng được cho tới khi đổi.
 * SMS mock và không phải production → trả kèm `devTempPassword` để thử nghiệm.
 */
export async function requestTempPassword(phone: string): Promise<{ devTempPassword?: string }> {
  const user = await UserModel.findOne({ phoneHash: blindIndex('phone', phone) }).select('+tempPassword');
  if (!user || user.status !== 'active') return {};

  const now = new Date();
  const lastSent = user.tempPassword?.sentAt?.getTime() ?? 0;
  if (now.getTime() - lastSent < env.TEMP_PASSWORD_RESEND_SECONDS * 1000) return {};

  const tempPassword = generateTempPassword();
  user.tempPassword = {
    hash: await hashPassword(tempPassword),
    expiresAt: new Date(now.getTime() + env.TEMP_PASSWORD_TTL_MINUTES * 60_000),
    sentAt: now,
  };
  await user.save();

  await sms.send(
    phone,
    `[Khu pho] Mat khau tam: ${tempPassword}. Het han sau ${env.TEMP_PASSWORD_TTL_MINUTES} phut. ` +
      'Dang nhap va doi mat khau ngay. Khong chia se ma nay cho bat ky ai.',
  );
  logger.info({ userId: user.id }, 'Đã gửi mật khẩu tạm');
  return sms.isMock && !env.isProduction ? { devTempPassword: tempPassword } : {};
}

/**
 * Đổi mật khẩu. Vừa đăng nhập bằng mật khẩu tạm → không cần mật khẩu hiện tại.
 * Xong thì đăng xuất mọi thiết bị khác (giữ phiên hiện tại).
 */
export async function changePassword(auth: AuthContext, input: ChangePasswordInput): Promise<PublicUser> {
  const user = await UserModel.findById(auth.userId).select('+passwordHash +tempPassword');
  if (!user) throw Errors.unauthorized();

  if (!user.mustChangePassword) {
    const ok =
      !!input.currentPassword && !!user.passwordHash && (await verifyPassword(input.currentPassword, user.passwordHash));
    if (!ok) throw Errors.badRequest('Mật khẩu hiện tại không đúng');
  }
  if (user.passwordHash && (await verifyPassword(input.newPassword, user.passwordHash))) {
    throw Errors.badRequest('Mật khẩu mới phải khác mật khẩu cũ');
  }

  user.passwordHash = await hashPassword(input.newPassword);
  user.mustChangePassword = false;
  user.tempPassword = undefined;
  await user.save();

  await SessionModel.updateMany(
    { userId: user._id, _id: { $ne: auth.sessionId }, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'password_changed' } },
  );
  logger.info({ userId: user.id }, 'Đã đổi mật khẩu');
  return toPublicUser(user);
}

async function revokeSession(sessionId: Types.ObjectId, reason: 'token_reuse' | 'user_disabled') {
  await SessionModel.updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}
