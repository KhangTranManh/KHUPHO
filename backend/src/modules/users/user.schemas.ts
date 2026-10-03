import { z } from 'zod';
import { ROLES } from './user.roles.js';

/** Chính sách mật khẩu khi tạo / đổi. (bcrypt chỉ dùng 72 byte đầu → giới hạn 72.) */
export const passwordSchema = z
  .string({ error: 'Vui lòng nhập mật khẩu' })
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất một chữ cái')
  .regex(/\d/, 'Mật khẩu phải có ít nhất một chữ số');

export const createUserSchema = z
  .object({
    username: z.string().trim().toLowerCase().min(3).max(64).regex(/^[a-z0-9._-]+$/, 'Chỉ dùng chữ thường, số, dấu . _ -'),
    password: passwordSchema,
    role: z.enum(ROLES),
    fullName: z.string().trim().min(2).max(120),
    email: z.email().optional(),
    phone: z.string().trim().max(20).optional(),
    citizenId: z.string().regex(/^\d{12}$/, 'Số CCCD gồm 12 chữ số').optional(),
  })
  .refine((u) => u.role !== 'nguoi_dan' || u.citizenId, {
    path: ['citizenId'],
    message: 'Tài khoản người dân phải có số CCCD',
  });

export type CreateUserInput = z.input<typeof createUserSchema>;
