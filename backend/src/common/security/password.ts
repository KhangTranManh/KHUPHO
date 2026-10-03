import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { env } from '../../config/env.js';
import { randomToken } from './tokens.js';

/** Cost bcrypt: 12 khi chạy thật; giảm trong test cho nhanh. */
const BCRYPT_COST = env.isTest ? 4 : 12;

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

/** Sinh mật khẩu ngẫu nhiên thoả chính sách (có chữ và số) — dùng cho seed / cấp lại mật khẩu. */
export function generatePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  return `${randomToken(9)}${letters[randomInt(letters.length)]}${randomInt(10)}`;
}
