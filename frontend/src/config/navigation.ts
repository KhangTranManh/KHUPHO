import type { IconName } from '@/components/ui/Icon';
import type { Role } from '@/features/auth/types';

/** Đường dẫn duy nhất của app. Router, menu và link đều tham chiếu từ đây. */
export const ROUTES = {
  dashboard: '/',
  residents: '/nhan-khau',
  households: '/ho-gia-dinh',
  temporary: '/tam-tru-tam-vang',
  changes: '/bien-dong',
  profile: '/ho-so',
  signIn: '/dang-nhap',
} as const;

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  /** Vai trò thấy mục này. Bỏ trống = mọi vai trò. Phải khớp RequireRole trong router.tsx. */
  roles?: Role[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const STAFF: Role[] = ['admin', 'can_bo'];

/** Menu sidebar. Thêm trang mới: khai báo ở ROUTES, router.tsx, rồi thêm mục ở đây. */
export const sidebarNav: NavSection[] = [
  {
    items: [{ label: 'Tổng quan', path: ROUTES.dashboard, icon: 'grid', roles: STAFF }],
  },
  {
    title: 'Quản lý dân cư',
    items: [
      { label: 'Nhân khẩu', path: ROUTES.residents, icon: 'users', roles: STAFF },
      { label: 'Hộ gia đình', path: ROUTES.households, icon: 'home', roles: STAFF },
      { label: 'Tạm trú – Tạm vắng', path: ROUTES.temporary, icon: 'mapPin', roles: STAFF },
      { label: 'Biến động', path: ROUTES.changes, icon: 'repeat', roles: STAFF },
    ],
  },
  {
    title: 'Tài khoản',
    items: [{ label: 'Hồ sơ của tôi', path: ROUTES.profile, icon: 'user' }],
  },
];

/** Menu đã lọc theo vai trò (bỏ nhóm rỗng). */
export function navForRole(role: Role): NavSection[] {
  return sidebarNav
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || i.roles.includes(role)) }))
    .filter((s) => s.items.length > 0);
}

/** Tìm mục menu khớp đường dẫn hiện tại — dùng cho breadcrumb / tiêu đề trang. */
export function findNavItem(pathname: string): NavItem | undefined {
  return sidebarNav.flatMap((s) => s.items).find((i) => i.path === pathname);
}
