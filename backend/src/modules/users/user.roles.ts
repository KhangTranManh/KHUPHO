/**
 * Vai trò người dùng. Giá trị lưu trong DB và gửi cho frontend — đổi tên phải migrate dữ liệu.
 *   truong_kp   — trưởng khu phố: xem và quản lý tất cả (dân cư, phản ánh, thông báo, quỹ, cộng đồng, an sinh)
 *   cong_an_kv  — công an khu vực: xem dân cư (nhân khẩu, hộ, biến động) và xử lý phản ánh / SOS
 *   cu_dan      — cư dân: xem thông tin, gửi phản ánh / SOS, trả lời khảo sát
 */
export const ROLES = ['truong_kp', 'cong_an_kv', 'cu_dan'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  truong_kp: 'Trưởng khu phố',
  cong_an_kv: 'Công an khu vực',
  cu_dan: 'Cư dân',
};

/** Cán bộ (xem dân cư, xử lý phản ánh) — khớp guards.requireStaff. */
export const STAFF_ROLES: Role[] = ['truong_kp', 'cong_an_kv'];
export const isStaffRole = (role: Role) => STAFF_ROLES.includes(role);

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
