import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { Errors } from '../errors/AppError.js';

/**
 * Giới hạn số lần thử đăng nhập theo IP (bổ sung cho cơ chế khoá theo tài khoản).
 * Tắt khi chạy test. Nếu deploy sau reverse proxy, cần cấu hình `app.set('trust proxy', ...)`
 * để lấy đúng IP người dùng.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => next(Errors.tooManyRequests()),
});
