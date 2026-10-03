import type { Types } from 'mongoose';
import type { User } from './user.model.js';
import type { Role } from './user.roles.js';

/** Dạng user trả cho client — không chứa mật khẩu, bộ đếm đăng nhập sai… */
export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  lastLoginAt?: string;
}

type UserLike = Pick<User, 'username' | 'role' | 'fullName' | 'email' | 'phone' | 'citizenId' | 'lastLoginAt'> & {
  _id: Types.ObjectId;
};

export function toPublicUser(user: UserLike): PublicUser {
  return {
    id: user._id.toString(),
    username: user.username,
    role: user.role as Role,
    fullName: user.fullName,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    citizenId: user.citizenId ?? undefined,
    lastLoginAt: user.lastLoginAt?.toISOString(),
  };
}
