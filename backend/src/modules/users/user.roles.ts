/**
 * Vai trò người dùng. Giá trị lưu trong DB và gửi cho frontend — đổi tên phải migrate dữ liệu.
 *   admin      — quản trị hệ thống: quản lý tài khoản, cấu hình
 *   can_bo     — cán bộ: quản lý nhân khẩu, hộ, tạm trú/tạm vắng tại tổ được phân công
 *   nguoi_dan  — người dân: xem thông tin cư trú của bản thân / hộ, gửi khai báo
 */
export const ROLES = ['admin', 'can_bo', 'nguoi_dan'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Quản trị viên',
  can_bo: 'Cán bộ',
  nguoi_dan: 'Người dân',
};

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
