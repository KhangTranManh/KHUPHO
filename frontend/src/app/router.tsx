import { createBrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ROUTES } from '@/config/navigation';
import { STAFF_ROLES } from '@/features/auth/constants';
import { RequireAuth, RequireRole } from '@/features/auth/RequireAuth';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** Đường dẫn con (bỏ dấu "/" đầu) để lồng trong layout. */
const child = (path: string) => path.replace(/^\//, '');

/*
 * Trang tổng quan tải sẵn; các trang khác tách chunk, chỉ tải khi mở.
 * Thêm trang: ROUTES (config/navigation.ts) → thêm route ở đây (đặt dưới RequireRole phù hợp)
 * → thêm mục sidebarNav kèm `roles`.
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
      // Quản lý dân cư: chỉ admin + cán bộ.
      {
        element: <RequireRole roles={STAFF_ROLES} />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: child(ROUTES.residents),
            lazy: () => import('@/pages/residents/ResidentsPage').then((m) => ({ Component: m.ResidentsPage })),
          },
          {
            path: child(ROUTES.households),
            lazy: () => import('@/pages/households/HouseholdsPage').then((m) => ({ Component: m.HouseholdsPage })),
          },
          {
            path: child(ROUTES.temporary),
            lazy: () => import('@/pages/temporary/TemporaryPage').then((m) => ({ Component: m.TemporaryPage })),
          },
          {
            path: child(ROUTES.changes),
            lazy: () => import('@/pages/changes/ChangesPage').then((m) => ({ Component: m.ChangesPage })),
          },
        ],
      },
      // Mọi vai trò.
      {
        path: child(ROUTES.profile),
        lazy: () => import('@/pages/profile/ProfilePage').then((m) => ({ Component: m.ProfilePage })),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
