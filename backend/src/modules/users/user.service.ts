import { Errors } from '../../common/errors/AppError.js';
import { parseInput } from '../../common/http/validation.js';
import { hashPassword } from '../../common/security/password.js';
import { blindIndex } from '../../common/security/fieldEncryption.js';
import { HouseholdModel } from '../households/household.model.js';
import { toPublicUser, type PublicUser } from './user.mapper.js';
import { UserModel } from './user.model.js';
import { createUserSchema, type CreateUserInput } from './user.schemas.js';

/** Tìm nhân khẩu theo CCCD (qua blind index) để liên kết tài khoản cư dân. */
async function findMemberByCitizenId(citizenId: string) {
  const hash = blindIndex('cccd', citizenId);
  const household = await HouseholdModel.findOne({ 'members.citizenIdHash': hash }).select('members._id members.citizenIdHash');
  const member = household?.members.find((m) => m.citizenIdHash === hash);
  return household && member ? { householdId: household._id, memberId: member._id } : null;
}

/**
 * Tạo tài khoản (seed, sau này cho API quản trị). Mật khẩu được băm, thông tin cá nhân được mã hoá.
 * Không có mật khẩu → tài khoản chưa kích hoạt; người dùng xin mật khẩu tạm qua SMS (POST /auth/temp-password).
 */
export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const { password, citizenId, ...data } = parseInput(createUserSchema, input);

  if (data.phone && (await UserModel.exists({ phoneHash: blindIndex('phone', data.phone) }))) {
    throw Errors.conflict('Số điện thoại đã được dùng cho tài khoản khác');
  }
  if (data.email && (await UserModel.exists({ emailHash: blindIndex('email', data.email) }))) {
    throw Errors.conflict('Email đã được dùng cho tài khoản khác');
  }

  const residentRef = citizenId ? await findMemberByCitizenId(citizenId) : null;
  if (citizenId && !residentRef) throw Errors.badRequest('Không tìm thấy nhân khẩu có số CCCD này');

  const user = await UserModel.create({
    ...data,
    residentRef: residentRef ?? undefined,
    passwordHash: password ? await hashPassword(password) : undefined,
  });
  return toPublicUser(user);
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await UserModel.findById(id).lean();
  if (!user) throw Errors.notFound('Không tìm thấy tài khoản');
  return toPublicUser(user);
}
