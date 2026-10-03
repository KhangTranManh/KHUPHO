import { createHash, randomBytes } from 'node:crypto';

/** Chuỗi ngẫu nhiên an toàn, dạng base64url. 32 byte ≈ 43 ký tự. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

/** Băm SHA-256 — dùng để lưu refresh token trong DB thay vì lưu bản gốc. */
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
