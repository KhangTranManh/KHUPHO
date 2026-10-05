/**
 * Vai trò và người dùng đăng nhập.
 * Giữ đồng bộ với backend/src/modules/users/user.roles.ts và user.mapper.ts (PublicUser).
 */
export type Role = 'truong_kp' | 'cong_an_kv' | 'cu_dan';

export interface AuthUser {
  id: string;
  role: Role;
  fullName: string;
  phone?: string;
  email?: string;
  /** Hộ của cư dân (nếu tài khoản liên kết nhân khẩu). */
  householdId?: string;
  memberId?: string;
  lastLoginAt?: string;
}

/** `reason` cho biết vì sao chưa đăng nhập: để trang đăng nhập hiện thông báo phù hợp. */
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; reason?: 'logout' | 'expired' }
  | { status: 'authenticated'; user: AuthUser };
