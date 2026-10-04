import { apiPost, refreshSession, setAccessToken } from '@/services/api';
import type { AuthUser } from './types';

/*
 * Xác thực luôn gọi backend thật (không dùng mock) — cần chạy backend: cd backend && npm run dev.
 * Endpoint: xem backend/README.md, mục "Xác thực".
 */

interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

/** Admin / cán bộ: tên đăng nhập. Người dân: số CCCD. */
export async function login(username: string, password: string): Promise<AuthUser> {
  const data = await apiPost<LoginResponse>('/auth/login', { username, password });
  setAccessToken(data.accessToken);
  return data.user;
}

/** Khôi phục phiên khi tải lại trang (dựa vào refresh cookie). Không còn phiên → null. */
export async function restoreSession(): Promise<AuthUser | null> {
  try {
    const session = await refreshSession();
    return session ? (session.user as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await apiPost('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function logoutAll() {
  await apiPost('/auth/logout-all');
  setAccessToken(null);
}
