/**
 * Vai trò và người dùng đăng nhập.
 * Giữ đồng bộ với backend/src/modules/users/user.roles.ts và user.mapper.ts (PublicUser).
 */
export type Role = 'admin' | 'can_bo' | 'nguoi_dan';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  lastLoginAt?: string;
}

/** `reason` cho biết vì sao chưa đăng nhập: để trang đăng nhập hiện thông báo phù hợp. */
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; reason?: 'logout' | 'expired' }
  | { status: 'authenticated'; user: AuthUser };
