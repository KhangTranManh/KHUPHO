import { isValidObjectId, type Types } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { logger } from '../../common/logger.js';
import { blindIndex } from '../../common/security/fieldEncryption.js';
import { toISODate } from '../../common/utils/date.js';
import { SessionModel } from '../auth/session.model.js';
import { ResidentChangeModel } from '../changes/residentChange.model.js';
import { toHouseholdView, toResidentView } from '../households/household.mapper.js';
import { HouseholdModel, type HouseholdDocument } from '../households/household.model.js';
import type { Actor } from '../users/currentUser.js';
import { UserModel } from '../users/user.model.js';
import { createUser } from '../users/user.service.js';
import type { CreateAccountInput, UpdateAccountInput, UpdateMemberInput } from './account.schemas.js';

/**
 * Quản lý tài khoản & thông tin theo SĐT — chỉ Trưởng khu phố.
 * Mọi thay đổi đi qua document Mongoose (không update thẳng) → setter mã hoá + hook tính lại
 * phoneHash / citizenIdHash / searchTokens chạy đầy đủ: sửa xong vẫn đăng nhập, tìm kiếm đúng.
 * Log chỉ ghi ai sửa trường nào, không ghi giá trị.
 */

/** Document user đã tải (kể cả khi select thêm trường ẩn) — cùng cách khai báo với auth.service. */
type UserDoc = NonNullable<Awaited<ReturnType<typeof UserModel.findOne>>>;

async function linkedHouseholdOf(user: UserDoc) {
  if (!user.residentRef) return undefined;
  const household = await HouseholdModel.findById(user.residentRef.householdId);
  const member = household?.members.id(user.residentRef.memberId);
  return household
    ? {
        householdId: household.id as string,
        householdCode: household.code,
        address: household.address,
        memberId: String(user.residentRef.memberId),
        memberName: member ? (member.get('fullName') as string) : undefined,
      }
    : undefined;
}

async function accountView(user: UserDoc) {
  return {
    id: user.id as string,
    fullName: user.get('fullName') as string,
    phone: user.get('phone') as string | undefined,
    email: user.get('email') as string | undefined,
    role: user.role,
    status: user.status,
    /** Đã đặt mật khẩu (false = chưa kích hoạt, đăng nhập lần đầu bằng OTP / mật khẩu tạm). */
    activated: !!user.passwordHash,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt ?? undefined,
    linkedHousehold: await linkedHouseholdOf(user),
  };
}

/** Tra một SĐT: tài khoản đăng nhập (nếu có) + mọi nhân khẩu ghi SĐT đó trong hồ sơ hộ. */
export async function lookupByPhone(phone: string) {
  const hash = blindIndex('phone', phone);
  const [user, households] = await Promise.all([
    UserModel.findOne({ phoneHash: hash }).select('+passwordHash'),
    HouseholdModel.find({ 'members.phoneHash': hash }),
  ]);
  return {
    phone,
    account: user ? await accountView(user) : null,
    members: households.flatMap((h) =>
      h.members
        .filter((m) => m.phoneHash === hash)
        .map((m) => ({ household: toHouseholdView(h), member: toResidentView(h, m) })),
    ),
  };
}

/** Chủ hộ của hộ có mã `code` — để liên kết tài khoản cư dân. Chủ hộ đã có tài khoản khác → 409. */
async function headOfHousehold(code: string, exceptUserId?: string) {
  const household = await HouseholdModel.findOne({ code: { $in: [code, code.replace(/^([A-Z]+)(\d+)$/, '$1-$2')] } });
  if (!household) throw Errors.notFound(`Không có hộ ${code}`);
  const head = household.members.find((m) => m.relation === 'chu_ho');
  if (!head) throw Errors.badRequest(`Hộ ${household.code} chưa có chủ hộ`);
  const taken = await UserModel.exists({ 'residentRef.memberId': head._id, ...(exceptUserId ? { _id: { $ne: exceptUserId } } : {}) });
  if (taken) throw Errors.conflict(`Chủ hộ ${household.code} đã có tài khoản khác`);
  return { householdId: household._id, memberId: head._id };
}

/** Tạo tài khoản chưa kích hoạt cho một SĐT; cư dân tự liên kết nhân khẩu cùng SĐT (hoặc chủ hộ của householdCode). */
export async function createAccount(input: CreateAccountInput, actor: Actor) {
  const link = input.householdCode ? await headOfHousehold(input.householdCode) : undefined;
  const created = await createUser({ phone: input.phone, fullName: input.fullName, role: input.role });

  let residentRef = link;
  if (!residentRef && input.role === 'cu_dan') {
    const hash = blindIndex('phone', input.phone);
    const household = await HouseholdModel.findOne({ 'members.phoneHash': hash });
    const member = household?.members.find((m) => m.phoneHash === hash);
    if (household && member && !(await UserModel.exists({ 'residentRef.memberId': member._id }))) {
      residentRef = { householdId: household._id, memberId: member._id };
    }
  }
  if (residentRef) await UserModel.updateOne({ _id: created.id }, { $set: { residentRef } });

  logger.info({ actorId: actor.userId, userId: created.id, role: input.role }, 'Trưởng KP tạo tài khoản');
  return lookupByPhone(input.phone);
}

/** Thu hồi mọi phiên → thay đổi quyền / khoá / đặt lại mật khẩu có hiệu lực ngay. */
const revokeSessions = (userId: Types.ObjectId) =>
  SessionModel.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: 'account_updated' } });

export async function updateAccount(id: string, input: UpdateAccountInput, actor: Actor) {
  const user = isValidObjectId(id) ? await UserModel.findById(id).select('+passwordHash +tempPassword +failedLoginCount +lockedUntil') : null;
  if (!user) throw Errors.notFound('Không tìm thấy tài khoản');

  const isSelf = user.id === actor.userId;
  if (isSelf && ((input.role && input.role !== user.role) || input.status === 'disabled' || input.resetPassword)) {
    throw Errors.badRequest('Không thể tự đổi vai trò, khoá hoặc đặt lại mật khẩu cho chính mình');
  }
  // Không để khu phố mất Trưởng KP đang hoạt động cuối cùng.
  const leavesLeader = user.role === 'truong_kp' && ((input.role && input.role !== 'truong_kp') || input.status === 'disabled');
  if (leavesLeader && !(await UserModel.exists({ _id: { $ne: user._id }, role: 'truong_kp', status: 'active' }))) {
    throw Errors.badRequest('Đây là Trưởng khu phố duy nhất — tạo / mở tài khoản Trưởng KP khác trước');
  }

  const changed: string[] = [];
  let mustRevoke = false;

  if (input.fullName !== undefined && input.fullName !== user.get('fullName')) {
    user.set('fullName', input.fullName);
    changed.push('fullName');
  }
  if (input.phone !== undefined && input.phone !== user.get('phone')) {
    if (await UserModel.exists({ _id: { $ne: user._id }, phoneHash: blindIndex('phone', input.phone) })) {
      throw Errors.conflict('Số điện thoại đã được dùng cho tài khoản khác');
    }
    user.set('phone', input.phone); // hook pre-validate tính lại phoneHash
    changed.push('phone');
    mustRevoke = true;
  }
  if (input.role !== undefined && input.role !== user.role) {
    user.role = input.role;
    changed.push('role');
    mustRevoke = true;
  }
  if (input.status !== undefined && input.status !== user.status) {
    user.status = input.status;
    changed.push('status');
    mustRevoke = true;
  }
  if (input.resetPassword) {
    user.passwordHash = undefined;
    user.tempPassword = undefined;
    user.mustChangePassword = false;
    user.failedLoginCount = 0;
    user.lockedUntil = undefined;
    changed.push('password');
    mustRevoke = true;
  }
  if (input.householdCode !== undefined) {
    user.residentRef = input.householdCode === '' ? undefined : await headOfHousehold(input.householdCode, user.id);
    changed.push('residentRef');
  }

  if (changed.length) {
    await user.save();
    if (mustRevoke) await revokeSessions(user._id);
    logger.info({ actorId: actor.userId, userId: user.id, changed }, 'Trưởng KP sửa tài khoản');
  }
  return lookupByPhone(user.get('phone') as string);
}

/** Sửa một nhân khẩu trong hộ. Đổi tình trạng cư trú → ghi lịch sử cư trú + nhật ký biến động. */
export async function updateMember(householdId: string, memberId: string, input: UpdateMemberInput, actor: Actor) {
  const household: HouseholdDocument | null = isValidObjectId(householdId) ? await HouseholdModel.findById(householdId) : null;
  const member = household && isValidObjectId(memberId) ? household.members.id(memberId) : null;
  if (!household || !member) throw Errors.notFound('Không tìm thấy nhân khẩu');

  if (input.relation !== undefined && (input.relation === 'chu_ho') !== (member.relation === 'chu_ho')) {
    throw Errors.badRequest('Đổi chủ hộ cần thực hiện bằng nghiệp vụ chuyển chủ hộ, không sửa trực tiếp ở đây');
  }
  if (input.citizenId) {
    const hash = blindIndex('cccd', input.citizenId);
    const dup = await HouseholdModel.findOne({ 'members.citizenIdHash': hash }).select('code members._id members.citizenIdHash');
    const owner = dup?.members.find((m) => m.citizenIdHash === hash);
    if (owner && String(owner._id) !== memberId) throw Errors.conflict(`Số CCCD đã thuộc một nhân khẩu khác (hộ ${dup!.code})`);
  }

  const changed: string[] = [];
  const setField = (field: 'fullName' | 'phone' | 'citizenId' | 'otherContact', value: string | null | undefined) => {
    if (value === undefined || (value ?? undefined) === (member.get(field) as string | undefined)) return;
    member.set(field, value ?? undefined); // setter mã hoá; hook tính lại *Hash + searchTokens
    changed.push(field);
  };
  setField('fullName', input.fullName);
  setField('phone', input.phone);
  setField('citizenId', input.citizenId);
  setField('otherContact', input.otherContact);

  for (const field of ['dateOfBirth', 'gender', 'relation', 'categories'] as const) {
    if (input[field] !== undefined) {
      member.set(field, input[field]);
      changed.push(field);
    }
  }

  // Tình trạng cư trú
  const newStatus = input.residenceStatus ?? member.residenceStatus;
  const statusChanged = newStatus !== member.residenceStatus;
  if (statusChanged || input.residenceFrom !== undefined || input.residenceTo !== undefined) {
    // Không gửi residenceFrom → mặc định hôm nay (khi đổi tình trạng); gửi chuỗi rỗng (null) = cố ý xoá → báo thiếu.
    const from =
      newStatus === 'thuong_tru' || input.residenceFrom === null
        ? undefined
        : (input.residenceFrom ?? (statusChanged ? toISODate(new Date()) : member.residenceFrom) ?? undefined);
    const to = newStatus === 'thuong_tru' ? undefined : input.residenceTo === undefined ? (statusChanged ? undefined : member.residenceTo) : (input.residenceTo ?? undefined);
    if (newStatus !== 'thuong_tru' && !from) throw Errors.badRequest('Tạm trú / tạm vắng cần ngày bắt đầu');

    if (statusChanged) {
      const today = toISODate(new Date());
      const open = member.residenceHistory.at(-1);
      if (open && !open.to) open.to = from ?? today; // đóng giai đoạn đang mở
      member.residenceHistory.push({ status: newStatus, from: from ?? today, to, note: input.residenceNote, recordedBy: actor.fullName });
      member.residenceStatus = newStatus;
      changed.push('residenceStatus');
    }
    member.residenceFrom = from;
    member.residenceTo = to;
    if (!statusChanged) changed.push('residencePeriod');
  }

  if (!changed.length) return { household: toHouseholdView(household), member: toResidentView(household, member) };

  await household.save(); // validate cả hộ: đúng một chủ hộ, tính lại token tìm kiếm của hộ

  if (statusChanged && (newStatus === 'tam_tru' || newStatus === 'tam_vang')) {
    await ResidentChangeModel.create({
      type: newStatus,
      householdId: household._id,
      memberId: member._id,
      residentName: member.get('fullName') as string,
      householdCode: household.code,
      date: member.residenceFrom!,
      officer: actor.fullName,
      officerId: actor.userId,
      note: input.residenceNote,
    });
  }
  logger.info({ actorId: actor.userId, householdId, memberId, changed }, 'Trưởng KP sửa nhân khẩu');
  return { household: toHouseholdView(household), member: toResidentView(household, member) };
}
