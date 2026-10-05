import type { Types } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { decryptMaybe } from '../../common/security/fieldEncryption.js';
import type { AuthContext } from '../auth/auth.types.js';
import { HouseholdModel } from '../households/household.model.js';
import { UserModel } from './user.model.js';
import { isStaffRole } from './user.roles.js';

/** Thông tin người đang gọi API mà các nghiệp vụ hay cần (tên hiển thị, SĐT, hộ của cư dân). */
export interface Actor {
  userId: string;
  role: AuthContext['role'];
  isStaff: boolean;
  fullName: string;
  phone?: string;
  householdId?: Types.ObjectId;
  memberId?: Types.ObjectId;
}

export async function loadActor(auth: AuthContext): Promise<Actor> {
  const user = await UserModel.findById(auth.userId).select('fullName phone residentRef').lean();
  if (!user) throw Errors.unauthorized();
  return {
    userId: auth.userId,
    role: auth.role,
    isStaff: isStaffRole(auth.role),
    fullName: decryptMaybe(user.fullName) ?? '',
    phone: decryptMaybe(user.phone),
    householdId: user.residentRef?.householdId,
    memberId: user.residentRef?.memberId,
  };
}

/** Hộ gia đình của tài khoản cư dân (qua liên kết nhân khẩu). Null nếu chưa liên kết. */
export async function findHouseholdOf(actor: Pick<Actor, 'householdId'>) {
  return actor.householdId ? HouseholdModel.findById(actor.householdId) : null;
}

/**
 * Bối cảnh của cư dân để lọc nội dung theo đối tượng nhận:
 * khu vực của hộ và các nhóm đối tượng của chính nhân khẩu đó.
 */
export async function residentContext(actor: Actor): Promise<{ areaId?: Types.ObjectId; categories: string[] }> {
  const household = await findHouseholdOf(actor);
  if (!household) return { categories: [] };
  const member = actor.memberId ? household.members.id(actor.memberId) : null;
  return { areaId: household.areaId, categories: member?.categories ?? [] };
}
