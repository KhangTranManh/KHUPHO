import { ROUTES } from '@/config/navigation';
import type { Role } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  truong_kp: 'Trưởng khu phố',
  cong_an_kv: 'Công an khu vực',
  cu_dan: 'Cư dân',
};

/** Cán bộ — xem dân cư, xử lý phản ánh / SOS. Khớp backend requireStaff. */
export const STAFF_ROLES: Role[] = ['truong_kp', 'cong_an_kv'];

/** Trưởng khu phố — quản lý thông báo, quỹ, cộng đồng, an sinh. Khớp backend requireLeader. */
export const LEADER_ROLES: Role[] = ['truong_kp'];

/** Thông tin & phản hồi (thông báo, sổ tay, quỹ, cộng đồng): trưởng khu phố + cư dân. */
export const INFO_ROLES: Role[] = ['truong_kp', 'cu_dan'];

/** Trang mặc định sau khi đăng nhập: mỗi vai trò có dashboard riêng tại trang chủ. */
export const homeFor = (_role: Role) => ROUTES.dashboard;
