import { z } from 'zod';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { GENDERS, RELATIONS, RESIDENCE_STATUSES, RESIDENT_CATEGORIES } from '../residents/resident.constants.js';
import { phoneSchema } from '../users/user.schemas.js';
import { ROLES, USER_STATUSES } from '../users/user.roles.js';

/** Chuỗi tuỳ chọn: bỏ khoảng trắng; chuỗi rỗng = xoá giá trị (null). */
const clearable = (schema: z.ZodString) =>
  z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .pipe(schema.nullable())
    .optional();

const householdCode = z.string().trim().toUpperCase().min(2).max(20);

/** GET /accounts/lookup?phone= */
export const lookupQuerySchema = z.object({ phone: phoneSchema });

/** POST /accounts — tạo tài khoản CHƯA KÍCH HOẠT (người dùng tự đặt mật khẩu khi đăng nhập lần đầu). */
export const createAccountSchema = z.object({
  phone: phoneSchema,
  fullName: z.string().trim().min(2, 'Họ tên quá ngắn').max(120),
  role: z.enum(ROLES),
  /** Cư dân: liên kết với chủ hộ của hộ này (bỏ trống → tự liên kết nhân khẩu cùng SĐT nếu có). */
  householdCode: householdCode.optional(),
});
export type CreateAccountInput = z.output<typeof createAccountSchema>;

/** PATCH /accounts/:id — chỉ gửi trường cần đổi. */
export const updateAccountSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Họ tên quá ngắn').max(120).optional(),
    phone: phoneSchema.optional(),
    role: z.enum(ROLES).optional(),
    status: z.enum(USER_STATUSES).optional(),
    /** true → xoá mật khẩu: người dùng phải đăng nhập lần đầu lại (OTP / mật khẩu tạm) và đặt mật khẩu mới. */
    resetPassword: z.literal(true).optional(),
    /** Đổi hộ liên kết (cư dân): mã hộ → liên kết chủ hộ; chuỗi rỗng → bỏ liên kết. */
    householdCode: z.union([householdCode, z.literal('')]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Không có thông tin nào để cập nhật');
export type UpdateAccountInput = z.output<typeof updateAccountSchema>;

/** PATCH /accounts/members/:householdId/:memberId — sửa thông tin một nhân khẩu. */
export const updateMemberSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Họ tên quá ngắn').max(120).optional(),
    phone: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : v))
      .pipe(phoneSchema.nullable())
      .optional(),
    citizenId: clearable(z.string().regex(/^\d{12}$/, 'Số CCCD gồm 12 chữ số')),
    dateOfBirth: z.string().regex(ISO_DATE_REGEX, 'Ngày sinh dạng yyyy-mm-dd').optional(),
    gender: z.enum(GENDERS).optional(),
    relation: z.enum(RELATIONS).optional(),
    otherContact: clearable(z.string().max(255)),
    categories: z.array(z.enum(RESIDENT_CATEGORIES)).max(RESIDENT_CATEGORIES.length).optional(),
    residenceStatus: z.enum(RESIDENCE_STATUSES).optional(),
    residenceFrom: clearable(z.string().regex(ISO_DATE_REGEX, 'Ngày dạng yyyy-mm-dd')),
    residenceTo: clearable(z.string().regex(ISO_DATE_REGEX, 'Ngày dạng yyyy-mm-dd')),
    /** Ghi chú kèm thay đổi cư trú (lý do, nơi đến…). */
    residenceNote: z.string().trim().max(255).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Không có thông tin nào để cập nhật');
export type UpdateMemberInput = z.output<typeof updateMemberSchema>;
