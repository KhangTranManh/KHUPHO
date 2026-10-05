import { appConfig } from '@/config/app';
import { apiPost, refreshSession, setAccessToken } from '@/services/api';
import type { AuthUser, TempPasswordResult } from './types';

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

/** Đăng nhập bằng SĐT hoặc email. */
export async function login(identifier: string, password: string): Promise<AuthUser> {
  if (appConfig.demoAuth) return (await loadDemo()).login(identifier, password);

  const data = await apiPost<LoginResponse>('/auth/login', { identifier, password });
  setAccessToken(data.accessToken);
  return data.user;
}

/** Đăng nhập bằng SĐT đã xác minh OTP qua Firebase (đăng nhập lần đầu / quên mật khẩu). */
export async function loginWithFirebase(idToken: string): Promise<AuthUser> {
  const data = await apiPost<LoginResponse>('/auth/firebase-login', { idToken });
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

/** Gửi mật khẩu tạm qua SMS tới SĐT (đăng nhập lần đầu / quên mật khẩu). */
export async function requestTempPassword(phone: string): Promise<TempPasswordResult> {
  if (appConfig.demoAuth) return (await loadDemo()).requestTempPassword(phone);

  return apiPost<TempPasswordResult>('/auth/temp-password', { phone });
}

export async function changePassword(newPassword: string, currentPassword?: string): Promise<AuthUser> {
  if (appConfig.demoAuth) return (await loadDemo()).changePassword(newPassword, currentPassword);

  const data = await apiPost<{ user: AuthUser }>('/auth/change-password', { newPassword, currentPassword });
  return data.user;
}

export async function logoutAll() {
  if (appConfig.demoAuth) return (await loadDemo()).logout();

  await apiPost('/auth/logout-all');
  setAccessToken(null);
}
