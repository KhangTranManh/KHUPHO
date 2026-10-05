import { z } from 'zod';

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
