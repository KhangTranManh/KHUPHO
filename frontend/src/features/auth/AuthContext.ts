import { createContext, useContext } from 'react';
import type { AuthState, AuthUser } from './types';

export interface AuthContextValue {
  state: AuthState;
  /** Người đang đăng nhập, null nếu chưa. */
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}
