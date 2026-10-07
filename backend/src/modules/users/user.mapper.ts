import type { Types } from 'mongoose';
import { decryptMaybe } from '../../common/security/fieldEncryption.js';
import type { Role } from './user.roles.js';

/** Dạng user trả cho client — không chứa mật khẩu, hash, bộ đếm đăng nhập sai… */
export interface PublicUser {
  id: string;
  role: Role;
  fullName: string;
  phone?: string;
  email?: string;
  /** Hộ của cư dân (nếu tài khoản liên kết nhân khẩu). */
  householdId?: string;
  memberId?: string;
  lastLoginAt?: string;
  /** Đăng nhập bằng mật khẩu tạm — phải đổi mật khẩu trước. */
  mustChangePassword: boolean;
}

interface UserLike {
  _id: Types.ObjectId;
  role: string;
  fullName?: unknown;
  phone?: unknown;
  email?: unknown;
  residentRef?: { householdId: Types.ObjectId; memberId: Types.ObjectId } | null;
  lastLoginAt?: Date | null;
  mustChangePassword?: boolean | null;
  toObject?: (opts: { getters: boolean }) => UserLike;
}

/** Nhận document hoặc kết quả .lean() — giải mã tại đây. */
export function toPublicUser(input: UserLike): PublicUser {
  const u = input.toObject ? input.toObject({ getters: false }) : input;
  return {
    id: u._id.toString(),
    role: u.role as Role,
    fullName: decryptMaybe(u.fullName) ?? '',
    phone: decryptMaybe(u.phone),
    email: decryptMaybe(u.email),
    householdId: u.residentRef?.householdId?.toString(),
    memberId: u.residentRef?.memberId?.toString(),
    lastLoginAt: u.lastLoginAt?.toISOString(),
    mustChangePassword: u.mustChangePassword ?? false,
  };
}
