import type { Role } from '../users/user.roles.js';

/** Thông tin người đang gọi API, gắn vào `req.auth` bởi middleware `authenticate`. */
export interface AuthContext {
  userId: string;
  role: Role;
  sessionId: string;
}

/** Thông tin thiết bị lưu kèm phiên đăng nhập (phục vụ "đăng xuất thiết bị khác" sau này). */
export interface ClientInfo {
  ip?: string;
  userAgent?: string;
}
