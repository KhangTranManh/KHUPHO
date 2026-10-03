import { z } from 'zod';

/**
 * Đăng nhập chung cho cả 3 vai trò.
 * Admin / cán bộ: tên đăng nhập được cấp. Người dân: số CCCD.
 * Không kiểm tra độ mạnh mật khẩu ở đây (đó là việc khi tạo / đổi mật khẩu).
 */
export const loginSchema = z.object({
  username: z
    .string({ error: 'Vui lòng nhập tên đăng nhập' })
    .trim()
    .toLowerCase()
    .min(1, 'Vui lòng nhập tên đăng nhập')
    .max(64, 'Tên đăng nhập quá dài'),
  password: z
    .string({ error: 'Vui lòng nhập mật khẩu' })
    .min(1, 'Vui lòng nhập mật khẩu')
    .max(128, 'Mật khẩu quá dài'),
});

export type LoginInput = z.output<typeof loginSchema>;
