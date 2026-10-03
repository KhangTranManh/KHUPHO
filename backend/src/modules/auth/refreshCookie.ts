import type { CookieOptions, Request, Response } from 'express';
import { API_PREFIX } from '../../config/constants.js';
import { env } from '../../config/env.js';

/**
 * Refresh token nằm trong cookie httpOnly → JavaScript phía trình duyệt không đọc được (chống XSS lấy token).
 * `sameSite: strict` + chỉ gửi kèm các route /api/auth → giảm rủi ro CSRF.
 */
export const REFRESH_COOKIE_NAME = 'wkp_rt';

const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'strict',
  path: `${API_PREFIX}/auth`,
});

export function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...baseOptions(), expires: expiresAt });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions());
}

export function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value ? value : undefined;
}
