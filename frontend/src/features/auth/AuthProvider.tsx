import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onSessionExpired } from '@/services/api';
import { AuthContext, type AuthContextValue } from './AuthContext';
import * as authService from './authService';
import type { AuthState } from './types';

/** Kênh báo giữa các tab: đăng xuất ở một tab → các tab khác cũng về trang đăng nhập. */
const CHANNEL_NAME = 'wkp-auth';
type AuthMessage = { type: 'logout' };

const openChannel = () =>
  typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(CHANNEL_NAME);

/** Giữ trạng thái đăng nhập cho toàn app. Bọc ngoài RouterProvider trong main.tsx. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // Tải trang: thử khôi phục phiên từ refresh cookie.
  useEffect(() => {
    let cancelled = false;
    authService.restoreSession().then((user) => {
      if (cancelled) return;
      setState(user ? { status: 'authenticated', user } : { status: 'anonymous' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh thất bại giữa chừng (phiên bị thu hồi / hết hạn) → về trạng thái chưa đăng nhập.
  useEffect(() => {
    onSessionExpired(() => setState({ status: 'anonymous', reason: 'expired' }));
    return () => onSessionExpired(undefined);
  }, []);

  // Nghe tab khác đăng xuất.
  useEffect(() => {
    const channel = openChannel();
    if (!channel) return;
    channel.onmessage = (e: MessageEvent<AuthMessage>) => {
      if (e.data?.type === 'logout') setState({ status: 'anonymous', reason: 'logout' });
    };
    return () => channel.close();
  }, []);

  const broadcastLogout = () => {
    const channel = openChannel();
    channel?.postMessage({ type: 'logout' } satisfies AuthMessage);
    channel?.close();
  };

  const login = useCallback(async (identifier: string, password: string) => {
    const user = await authService.login(identifier, password);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setState({ status: 'anonymous', reason: 'logout' });
      broadcastLogout();
    }
  }, []);

  const logoutAll = useCallback(async () => {
    await authService.logoutAll();
    setState({ status: 'anonymous', reason: 'logout' });
    broadcastLogout();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === 'authenticated' ? state.user : null,
      login,
      logout,
      logoutAll,
    }),
    [state, login, logout, logoutAll],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
