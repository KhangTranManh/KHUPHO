import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { env } from '../../config/env.js';
import { randomToken } from './tokens.js';

/** Cost bcrypt lấy từ BCRYPT_COST (mặc định 12; test đặt 4 cho nhanh). */
const BCRYPT_COST = env.BCRYPT_COST;

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST);

export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

let dummyHash: Promise<string> | undefined;

/**
 * Khi không tìm thấy tài khoản vẫn chạy một lần so sánh bcrypt, để thời gian phản hồi
 * không tiết lộ tên đăng nhập nào tồn tại.
 */
export async function burnPasswordCheck(plain: string) {
  dummyHash ??= bcrypt.hash('khong-phai-mat-khau-that', BCRYPT_COST);
  await bcrypt.compare(plain, await dummyHash);
}

/**
 * Mật khẩu tạm gửi qua SMS: 8 ký tự in hoa + số, bỏ ký tự dễ nhầm (0/O, 1/I/L) cho dễ gõ.
 * Không cần thoả chính sách mật khẩu vì chỉ dùng một lần, có hạn, rồi bắt buộc đổi.
 */
export function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join('');
}

/** Sinh mật khẩu ngẫu nhiên thoả chính sách (có chữ và số) — dùng cho seed / cấp lại mật khẩu. */
export function generatePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  return `${randomToken(9)}${letters[randomInt(letters.length)]}${randomInt(10)}`;
}
