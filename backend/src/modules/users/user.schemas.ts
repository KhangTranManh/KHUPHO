import { z } from 'zod';
import { ROLES } from './user.roles.js';

/** Chính sách mật khẩu khi tạo / đổi. (bcrypt chỉ dùng 72 byte đầu → giới hạn 72.) */
export const passwordSchema = z
  .string({ error: 'Vui lòng nhập mật khẩu' })
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất một chữ cái')
  .regex(/\d/, 'Mật khẩu phải có ít nhất một chữ số');

/** SĐT Việt Nam: 10 số bắt đầu bằng 0 (chấp nhận +84, khoảng trắng, dấu chấm). */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s.()-]/g, '').replace(/^\+84/, '0'))
  .pipe(z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'));

export const createUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone: phoneSchema.optional(),
    email: z.email().transform((v) => v.toLowerCase()).optional(),
    password: passwordSchema,
    role: z.enum(ROLES),
    /** Cư dân: CCCD của nhân khẩu để liên kết tài khoản. */
    citizenId: z.string().regex(/^\d{12}$/, 'Số CCCD gồm 12 chữ số').optional(),
  })
  .refine((u) => u.phone || u.email, { path: ['phone'], message: 'Cần SĐT hoặc email để đăng nhập' });

export type CreateUserInput = z.input<typeof createUserSchema>;
