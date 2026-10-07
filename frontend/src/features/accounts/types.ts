/**
 * Quản lý tài khoản theo SĐT (chỉ Trưởng KP). Khớp backend/src/modules/accounts.
 */
import type { Role } from '@/features/auth/types';
import type { Household } from '@/features/households/types';
import type { Gender, Relation, ResidenceStatus, Resident, ResidentCategory } from '@/features/residents/types';

export type AccountStatus = 'active' | 'disabled';

export interface AccountView {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  role: Role;
  status: AccountStatus;
  /** false = chưa đặt mật khẩu (đăng nhập lần đầu bằng OTP / mật khẩu tạm). */
  activated: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  linkedHousehold?: { householdId: string; householdCode: string; address: string; memberId: string; memberName?: string };
}

/** GET /accounts/lookup?phone= */
export interface PhoneLookup {
  phone: string;
  account: AccountView | null;
  members: { household: Household; member: Resident }[];
}

export interface CreateAccountInput {
  phone: string;
  fullName: string;
  role: Role;
  householdCode?: string;
}

/** Chỉ gửi trường cần đổi. householdCode = '' → bỏ liên kết hộ. */
export interface UpdateAccountInput {
  fullName?: string;
  phone?: string;
  role?: Role;
  status?: AccountStatus;
  resetPassword?: true;
  householdCode?: string;
}

/** Chỉ gửi trường cần đổi. Chuỗi rỗng ở SĐT / CCCD / liên hệ khác / ngày = xoá giá trị. */
export interface UpdateMemberInput {
  fullName?: string;
  phone?: string;
  citizenId?: string;
  dateOfBirth?: string;
  gender?: Gender;
  relation?: Relation;
  otherContact?: string;
  categories?: ResidentCategory[];
  residenceStatus?: ResidenceStatus;
  residenceFrom?: string;
  residenceTo?: string;
  residenceNote?: string;
}
