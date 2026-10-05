import type { IconName } from '@/components/ui/Icon';
import type { Role } from '@/features/auth/types';

/** Đường dẫn duy nhất của app. Router, menu và link đều tham chiếu từ đây. */
export const ROUTES = {
  dashboard: '/',
  // 1. Nhân hộ khẩu & an ninh trật tự
  residents: '/nhan-khau',
  households: '/ho-gia-dinh',
  changes: '/bien-dong',
  security: '/an-ninh-trat-tu',
  // 2. Thông tin dân sinh
  posts: '/thong-bao',
  directory: '/so-tay-phuong',
  // 3. Thu quỹ dân sinh
  funds: '/quy-dan-sinh',
  // 4. Cộng đồng
  community: '/cong-dong',
  // 5. An sinh xã hội & hỗ trợ khẩn cấp
  welfare: '/an-sinh-xa-hoi',
  sos: '/sos',
  // Tài khoản
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

/** Dân cư + phản ánh: trưởng KP, công an. Quản lý: chỉ trưởng KP. Thông tin: trưởng KP + cư dân. */
const STAFF: Role[] = ['truong_kp', 'cong_an_kv'];
const LEADER: Role[] = ['truong_kp'];
const INFO: Role[] = ['truong_kp', 'cu_dan'];

/** Menu sidebar theo 5 phần của hệ thống. Thêm trang: ROUTES → router.tsx → mục ở đây. */
export const sidebarNav: NavSection[] = [
  {
    items: [{ label: 'Tổng quan', path: ROUTES.dashboard, icon: 'grid' }],
  },
  {
    title: 'Nhân hộ khẩu & ANTT',
    items: [
      { label: 'Nhân khẩu', path: ROUTES.residents, icon: 'users', roles: STAFF },
      { label: 'Hộ gia đình', path: ROUTES.households, icon: 'home', roles: STAFF },
      { label: 'Biến động', path: ROUTES.changes, icon: 'repeat', roles: STAFF },
      { label: 'An ninh trật tự', path: ROUTES.security, icon: 'shield' },
    ],
  },
  {
    title: 'Thông tin dân sinh',
    items: [
      { label: 'Thông báo & tuyên truyền', path: ROUTES.posts, icon: 'megaphone', roles: INFO },
      { label: 'Sổ tay phường', path: ROUTES.directory, icon: 'phone', roles: INFO },
    ],
  },
  {
    title: 'Thu quỹ dân sinh',
    items: [{ label: 'Các khoản quỹ', path: ROUTES.funds, icon: 'wallet', roles: INFO }],
  },
  {
    title: 'Cộng đồng',
    items: [{ label: 'Khảo sát & sinh hoạt', path: ROUTES.community, icon: 'clipboard', roles: INFO }],
  },
  {
    title: 'An sinh xã hội',
    items: [
      { label: 'Hộ chính sách, khó khăn', path: ROUTES.welfare, icon: 'lifeBuoy', roles: LEADER },
      { label: 'SOS khẩn cấp', path: ROUTES.sos, icon: 'siren' },
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
