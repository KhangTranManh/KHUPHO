import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { normalizeText } from '../utils/text.js';

/**
 * Mã hoá dữ liệu cá nhân ở tầng ứng dụng (trước khi ghi MongoDB).
 *
 *  - encryptField / decryptField: AES-256-GCM, IV ngẫu nhiên mỗi lần → cùng một giá trị cho ra
 *    bản mã khác nhau, không đọc / so khớp được nếu lộ DB. Định dạng: "v1.<iv>.<tag>.<ciphertext>" (base64url).
 *  - blindIndex: HMAC-SHA256 của giá trị đã chuẩn hoá → tra cứu CHÍNH XÁC (CCCD, SĐT, email) mà
 *    không cần giải mã. Dùng khoá riêng với khoá mã hoá.
 *  - searchTokens: HMAC từng từ → tìm theo từ đầy đủ ("nguyen an" khớp "Nguyễn Văn An"),
 *    KHÔNG hỗ trợ tìm một phần của từ.
 *
 * Đổi khoá = phải mã hoá lại toàn bộ dữ liệu (tiền tố "v1" để sau này hỗ trợ xoay khoá).
 */

const VERSION = 'v1';
const encryptionKey = Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64');
const indexKey = Buffer.from(env.DATA_INDEX_KEY, 'utf8');

export const isEncrypted = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(`${VERSION}.`) && value.split('.').length === 4;

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptField(token: string): string {
  const [, iv, tag, ciphertext] = token.split('.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

/** Giải mã nếu là bản mã, giữ nguyên nếu không (an toàn khi đọc dữ liệu cũ / rỗng). */
export const decryptMaybe = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : isEncrypted(value) ? decryptField(value) : String(value);

/** Chuẩn hoá trước khi băm: bỏ dấu, chữ thường; SĐT bỏ ký tự thừa và đổi +84 → 0. */
export function normalizeForIndex(kind: 'cccd' | 'phone' | 'email' | 'text', value: string) {
  const v = value.trim();
  if (kind === 'phone') return v.replace(/[^\d+]/g, '').replace(/^\+84/, '0');
  if (kind === 'cccd') return v.replace(/\D/g, '');
  if (kind === 'email') return v.toLowerCase();
  return normalizeText(v);
}

export function blindIndex(kind: 'cccd' | 'phone' | 'email' | 'text', value: string): string {
  return createHmac('sha256', indexKey).update(`${kind}:${normalizeForIndex(kind, value)}`).digest('base64url');
}

/** Token tìm kiếm cho từng từ (≥ 2 ký tự) của các giá trị truyền vào. */
export function searchTokens(...values: (string | undefined | null)[]): string[] {
  const words = values
    .filter((v): v is string => !!v)
    .flatMap((v) => normalizeText(v).split(/\s+/))
    .filter((w) => w.length >= 2);
  return [...new Set(words.map((w) => blindIndex('text', w)))];
}

/** Điều kiện MongoDB cho ô tìm kiếm trên trường token (mọi từ phải khớp). */
export function tokenSearchCondition(field: string, search?: string): Record<string, unknown> {
  const tokens = search ? searchTokens(search) : [];
  return tokens.length ? { [field]: { $all: tokens } } : {};
}
