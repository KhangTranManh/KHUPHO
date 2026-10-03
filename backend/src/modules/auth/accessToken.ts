import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { env } from '../../config/env.js';

const ISSUER = 'webkhupho-api';
const AUDIENCE = 'webkhupho-web';

/**
 * Access token: JWT ngắn hạn gửi qua header `Authorization: Bearer <token>`.
 * Chỉ chứa id người dùng (`sub`) và id phiên (`sid`). Vai trò luôn đọc từ DB khi xác thực,
 * để đổi quyền / khoá tài khoản có hiệu lực ngay.
 */
export interface AccessTokenClaims {
  sub: string;
  sid: string;
}

export const ACCESS_TOKEN_TTL_SECONDS = env.JWT_ACCESS_TTL_MINUTES * 60;

export function signAccessToken({ sub, sid }: AccessTokenClaims) {
  return jwt.sign({ sid }, env.JWT_ACCESS_SECRET, {
    subject: sub,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
  } catch {
    throw Errors.unauthorized();
  }

  if (typeof decoded === 'string' || !isValidObjectId(decoded.sub) || !isValidObjectId(decoded.sid)) {
    throw Errors.unauthorized();
  }
  return { sub: String(decoded.sub), sid: String(decoded.sid) };
}

/** Lấy token từ header `Authorization: Bearer ...`, không có → undefined. */
export function readBearerToken(req: Request): string | undefined {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim() || undefined;
}
