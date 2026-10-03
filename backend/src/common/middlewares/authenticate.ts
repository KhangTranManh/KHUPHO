import type { Request, RequestHandler } from 'express';
import { readBearerToken, verifyAccessToken } from '../../modules/auth/accessToken.js';
import type { AuthContext } from '../../modules/auth/auth.types.js';
import { SessionModel } from '../../modules/auth/session.model.js';
import { UserModel } from '../../modules/users/user.model.js';
import type { Role } from '../../modules/users/user.roles.js';
import { Errors } from '../errors/AppError.js';

/**
 * Bắt buộc đăng nhập. Ngoài chữ ký JWT còn kiểm tra phiên trong DB, nên:
 *  - đăng xuất / đăng xuất mọi thiết bị có hiệu lực ngay, không chờ token hết hạn;
 *  - khoá tài khoản hoặc đổi vai trò áp dụng ngay ở request kế tiếp.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) throw Errors.unauthorized();

  const { sub, sid } = verifyAccessToken(token);

  const session = await SessionModel.findById(sid).select('userId revokedAt expiresAt').lean();
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.userId.toString() !== sub) {
    throw Errors.unauthorized();
  }

  const user = await UserModel.findById(sub).select('role status').lean();
  if (!user || user.status !== 'active') throw Errors.unauthorized();

  req.auth = { userId: sub, role: user.role as Role, sessionId: sid };
  next();
};

/** Lấy AuthContext trong controller đứng sau `authenticate`. */
export function requireAuth(req: Request): AuthContext {
  if (!req.auth) throw Errors.unauthorized();
  return req.auth;
}
