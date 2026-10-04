import { appConfig } from '@/config/app';
import { apiPost, refreshSession, setAccessToken } from '@/services/api';
import type { AuthUser } from './types';

/*
 * Mặc định gọi backend thật — cần chạy backend: cd backend && npm run dev.
 * Endpoint: xem backend/README.md, mục "Xác thực".
 * VITE_AUTH_MODE=demo → dùng tài khoản mẫu ngay trên trình duyệt (src/mocks/demoAuth.ts), không cần backend.
 */

const loadDemo = () => import('@/mocks/demoAuth').then((m) => m.demoAuth);

interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

/** Admin / cán bộ: tên đăng nhập. Người dân: số CCCD. */
export async function login(username: string, password: string): Promise<AuthUser> {
  if (appConfig.demoAuth) return (await loadDemo()).login(username, password);

  const data = await apiPost<LoginResponse>('/auth/login', { username, password });
  setAccessToken(data.accessToken);
  return data.user;
}

/** Khôi phục phiên khi tải lại trang (dựa vào refresh cookie). Không còn phiên → null. */
export async function restoreSession(): Promise<AuthUser | null> {
  if (appConfig.demoAuth) return (await loadDemo()).restoreSession();

  try {
    const session = await refreshSession();
    return session ? (session.user as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function logout() {
  if (appConfig.demoAuth) return (await loadDemo()).logout();

  try {
    await apiPost('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function logoutAll() {
  if (appConfig.demoAuth) return (await loadDemo()).logout();

  await apiPost('/auth/logout-all');
  setAccessToken(null);
}
