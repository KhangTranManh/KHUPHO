import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ROUTES } from '@/config/navigation';
import { INFO_ROLES, LEADER_ROLES, STAFF_ROLES } from '@/features/auth/constants';
import { RequireAuth, RequireRole } from '@/features/auth/RequireAuth';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** Đường dẫn con (bỏ dấu "/" đầu) để lồng trong layout. */
const child = (path: string) => path.replace(/^\//, '');

/** Route tải trang khi mở (tách chunk). `pick` chọn component trong module. */
const lazyRoute = <M,>(path: string, load: () => Promise<M>, pick: (m: M) => ComponentType) => ({
  path: child(path),
  lazy: () => load().then((m) => ({ Component: pick(m) })),
});

/*
 * Quyền theo vai trò (khớp backend guards):
 *   Mọi vai trò          tổng quan (dashboard riêng từng vai trò), phản ánh, SOS, hồ sơ
 *   Trưởng KP + công an  nhân khẩu, hộ, biến động
 *   Trưởng KP + cư dân   thông báo, sổ tay, quỹ, cộng đồng
 *   Chỉ trưởng KP        hộ chính sách
 * Thêm trang: ROUTES → route ở đây (đặt dưới RequireRole phù hợp) → mục sidebarNav kèm `roles`.
 */
export const router = createBrowserRouter([
  {
    path: ROUTES.signIn,
    lazy: () => import('@/pages/auth/SignInPage').then((m) => ({ Component: m.SignInPage })),
  },
  {
    path: ROUTES.dashboard,
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      lazyRoute(ROUTES.security, () => import('@/pages/security/SecurityPage'), (m) => m.SecurityPage),
      lazyRoute(ROUTES.sos, () => import('@/pages/sos/SosPage'), (m) => m.SosPage),
      lazyRoute(ROUTES.profile, () => import('@/pages/profile/ProfilePage'), (m) => m.ProfilePage),
      {
        element: <RequireRole roles={STAFF_ROLES} />,
        children: [
          lazyRoute(ROUTES.residents, () => import('@/pages/residents/ResidentsPage'), (m) => m.ResidentsPage),
          lazyRoute(ROUTES.households, () => import('@/pages/households/HouseholdsPage'), (m) => m.HouseholdsPage),
          lazyRoute(ROUTES.changes, () => import('@/pages/changes/ChangesPage'), (m) => m.ChangesPage),
        ],
      },
      {
        element: <RequireRole roles={INFO_ROLES} />,
        children: [
          lazyRoute(ROUTES.posts, () => import('@/pages/posts/PostsPage'), (m) => m.PostsPage),
          lazyRoute(ROUTES.directory, () => import('@/pages/directory/DirectoryPage'), (m) => m.DirectoryPage),
          lazyRoute(ROUTES.funds, () => import('@/pages/funds/FundsPage'), (m) => m.FundsPage),
          lazyRoute(ROUTES.community, () => import('@/pages/community/CommunityPage'), (m) => m.CommunityPage),
        ],
      },
      {
        element: <RequireRole roles={LEADER_ROLES} />,
        children: [lazyRoute(ROUTES.welfare, () => import('@/pages/welfare/WelfarePage'), (m) => m.WelfarePage)],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
