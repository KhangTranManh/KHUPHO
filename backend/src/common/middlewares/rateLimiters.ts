import type { Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { Errors } from '../errors/AppError.js';

/**
 * Giới hạn số request theo IP (bộ đếm trong bộ nhớ, tự xoá sau mỗi cửa sổ thời gian → bộ nhớ chỉ tăng theo
 * số IP đang hoạt động, không theo số lần bấm). Mọi con số lấy từ .env.
 *
 *   apiRateLimiter       mọi /api                      API_RATE_LIMIT / phút          (chống spam chung)
 *   writeRateLimiter     POST/PUT/PATCH/DELETE         WRITE_RATE_LIMIT / phút        (chống spam phản ánh, SOS…)
 *   loginRateLimiter     đăng nhập, OTP, đổi mật khẩu  LOGIN_RATE_LIMIT / 15 phút     (bcrypt tốn CPU, chống dò mật khẩu)
 *   tempPasswordRateLimiter  xin mật khẩu tạm          TEMP_PASSWORD_RATE_LIMIT / 15 phút (mỗi SMS tốn tiền)
 *
 * Cùng với khoá tài khoản sau LOGIN_MAX_FAILED_ATTEMPTS lần sai (theo tài khoản, không theo IP).
 * Sau proxy (Cloudflare, Vercel) cần TRUST_PROXY đúng, nếu không mọi người dùng chung một "IP".
 * Chạy nhiều bản backend cùng lúc → cần store dùng chung (Redis) thay cho bộ nhớ.
 * RATE_LIMIT_ENABLED=false để tắt (test).
 */
const make = (windowMs: number, limit: number, skip?: (req: Request) => boolean) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => !env.RATE_LIMIT_ENABLED || (skip?.(req) ?? false),
    handler: (_req, _res, next) => next(Errors.tooManyRequests()),
  });

const MINUTE = 60_000;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** Không giới hạn: kiểm tra sống (giám sát gọi liên tục) và webhook ngân hàng (đã xác thực bằng API key, ngân hàng gửi dồn). */
const isExempt = (req: Request) => req.path === '/health' || req.path.startsWith('/payments/');

export const apiRateLimiter = make(MINUTE, env.API_RATE_LIMIT, isExempt);

export const writeRateLimiter = make(MINUTE, env.WRITE_RATE_LIMIT, (req) => !WRITE_METHODS.has(req.method) || isExempt(req));

export const loginRateLimiter = make(15 * MINUTE, env.LOGIN_RATE_LIMIT);

export const tempPasswordRateLimiter = make(15 * MINUTE, env.TEMP_PASSWORD_RATE_LIMIT);
