import { createContext, useContext } from 'react';
import type { AuthState, AuthUser } from './types';

export interface AuthContextValue {
  state: AuthState;
  /** Người đang đăng nhập, null nếu chưa. */
  user: AuthUser | null;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  /** Đăng nhập bằng ID token Firebase (sau khi nhập đúng OTP). */
  loginWithFirebase: (idToken: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  /** Đổi mật khẩu; `currentPassword` không cần khi vừa đăng nhập bằng mật khẩu tạm. */
  changePassword: (newPassword: string, currentPassword?: string) => Promise<AuthUser>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}
