import { ROUTES } from '@/config/navigation';
import type { Role } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Quản trị viên',
  can_bo: 'Cán bộ',
  nguoi_dan: 'Người dân',
};

/** Vai trò được vào các trang quản lý dân cư. */
export const STAFF_ROLES: Role[] = ['admin', 'can_bo'];

/** Trang mặc định sau khi đăng nhập / khi vào trang không đủ quyền. */
export const homeFor = (role: Role) => (role === 'nguoi_dan' ? ROUTES.profile : ROUTES.dashboard);
