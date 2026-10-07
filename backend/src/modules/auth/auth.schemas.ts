import { z } from 'zod';
import { passwordSchema, phoneSchema } from '../users/user.schemas.js';

/**
 * Đăng nhập chung cho mọi vai trò bằng SĐT hoặc email.
 * Không kiểm tra độ mạnh mật khẩu ở đây (đó là việc khi tạo / đổi mật khẩu).
 */
export const loginSchema = z.object({
  identifier: z
    .string({ error: 'Vui lòng nhập số điện thoại hoặc email' })
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại hoặc email')
    .max(254, 'Quá dài'),
  password: z
    .string({ error: 'Vui lòng nhập mật khẩu' })
    .min(1, 'Vui lòng nhập mật khẩu')
    .max(128, 'Mật khẩu quá dài'),
});

export type LoginInput = z.output<typeof loginSchema>;

/** POST /auth/temp-password — xin mật khẩu tạm qua SMS (đăng nhập lần đầu / quên mật khẩu). */
export const tempPasswordRequestSchema = z.object({
  phone: phoneSchema,
});

/** POST /auth/firebase-login — ID token Firebase sau khi người dùng nhập đúng OTP. */
export const firebaseLoginSchema = z.object({
  idToken: z.string().min(20).max(4096),
});

/**
 * POST /auth/change-password.
 * Vừa đăng nhập bằng mật khẩu tạm (mustChangePassword) → không cần mật khẩu hiện tại.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.output<typeof changePasswordSchema>;
