import type { IconName } from '@/components/ui/Icon';

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
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/** Menu sidebar. Thêm trang mới: khai báo ở ROUTES, router.tsx, rồi thêm mục ở đây. */
export const sidebarNav: NavSection[] = [
  {
    items: [{ label: 'Tổng quan', path: ROUTES.dashboard, icon: 'grid' }],
  },
  {
    title: 'Quản lý dân cư',
    items: [
      { label: 'Nhân khẩu', path: ROUTES.residents, icon: 'users' },
      { label: 'Hộ gia đình', path: ROUTES.households, icon: 'home' },
      { label: 'Tạm trú – Tạm vắng', path: ROUTES.temporary, icon: 'mapPin' },
      { label: 'Biến động', path: ROUTES.changes, icon: 'repeat' },
    ],
  },
  {
    title: 'Tài khoản',
    items: [
      { label: 'Hồ sơ cán bộ', path: ROUTES.profile, icon: 'user' },
      { label: 'Đăng xuất', path: ROUTES.signIn, icon: 'logOut' },
    ],
  },
];

/** Tìm mục menu khớp đường dẫn hiện tại — dùng cho breadcrumb / tiêu đề trang. */
export function findNavItem(pathname: string): NavItem | undefined {
  return sidebarNav.flatMap((s) => s.items).find((i) => i.path === pathname);
}
