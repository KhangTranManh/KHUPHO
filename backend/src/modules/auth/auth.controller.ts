import type { Request, Response } from 'express';
import { Errors } from '../../common/errors/AppError.js';
import { requireAuth } from '../../common/middlewares/authenticate.js';
import { parseInput } from '../../common/http/validation.js';
import { readBearerToken, verifyAccessToken } from './accessToken.js';
import { loginSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';
import type { AuthResult } from './auth.service.js';
import type { ClientInfo } from './auth.types.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './refreshCookie.js';

/*
 * Controller chỉ làm việc với HTTP (đọc request, đặt cookie, trả response).
 * Logic nghiệp vụ nằm trong auth.service.ts.
 */

const clientInfo = (req: Request): ClientInfo => ({
  ip: req.ip,
  userAgent: req.get('user-agent')?.slice(0, 256),
});

/** Body trả về khi đăng nhập / refresh. Refresh token chỉ nằm trong cookie, không có trong body. */
function sendAuthResult(res: Response, result: AuthResult) {
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  res.json({
    accessToken: result.accessToken,
    tokenType: 'Bearer',
    expiresIn: result.expiresIn,
    user: result.user,
  });
}

/** POST /auth/login */
export async function login(req: Request, res: Response) {
  const input = parseInput(loginSchema, req.body);
  sendAuthResult(res, await authService.login(input, clientInfo(req)));
}

/** POST /auth/refresh — dùng cookie refresh token, trả access token mới. */
export async function refresh(req: Request, res: Response) {
  const token = readRefreshCookie(req);
  try {
    if (!token) throw Errors.unauthorized();
    sendAuthResult(res, await authService.refresh(token, clientInfo(req)));
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

/**
 * POST /auth/logout — không bắt buộc access token còn hạn (người dùng vẫn đăng xuất được
 * khi token đã hết hạn). Xác định phiên qua access token nếu hợp lệ, nếu không thì qua cookie.
 */
export async function logout(req: Request, res: Response) {
  await authService.logout({
    sessionId: trySessionIdFromBearer(req),
    refreshToken: readRefreshCookie(req),
  });
  clearRefreshCookie(res);
  res.status(204).end();
}

/** POST /auth/logout-all — đăng xuất khỏi mọi thiết bị. */
export async function logoutAll(req: Request, res: Response) {
  await authService.logoutAll(requireAuth(req).userId);
  clearRefreshCookie(res);
  res.status(204).end();
}

/** GET /auth/me */
export async function me(req: Request, res: Response) {
  res.json({ user: await authService.getCurrentUser(requireAuth(req).userId) });
}

function trySessionIdFromBearer(req: Request): string | undefined {
  const token = readBearerToken(req);
  if (!token) return undefined;
  try {
    return verifyAccessToken(token).sid;
  } catch {
    return undefined;
  }
}
