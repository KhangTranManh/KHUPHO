import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageState } from '@/components/ui/PageState';
import { ROUTES } from '@/config/navigation';
import { useAuth } from './AuthContext';
import { homeFor } from './constants';
import type { Role } from './types';

/** Trạng thái truyền sang trang đăng nhập để quay lại đúng trang sau khi đăng nhập. */
export interface SignInLocationState {
  from?: string;
}

/** Bắt buộc đăng nhập: chưa đăng nhập → chuyển sang trang đăng nhập. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <PageState />;

  if (state.status === 'anonymous') {
    // Tự đăng xuất thì không cần quay lại trang cũ.
    const from = state.reason === 'logout' ? undefined : location.pathname + location.search;
    return <Navigate to={ROUTES.signIn} replace state={{ from } satisfies SignInLocationState} />;
  }

  // Vừa đăng nhập bằng mật khẩu tạm → phải đổi mật khẩu trước.
  if (state.user.mustChangePassword) return <Navigate to={ROUTES.changePassword} replace />;

  return children;
}

/** Chỉ cho các vai trò được liệt kê; vai trò khác → về trang mặc định của họ. Dùng làm route cha. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
