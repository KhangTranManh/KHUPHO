import { Errors } from '../../common/errors/AppError.js';
import { parseInput } from '../../common/http/validation.js';
import { hashPassword } from '../../common/security/password.js';
import { toPublicUser, type PublicUser } from './user.mapper.js';
import { UserModel } from './user.model.js';
import { createUserSchema, type CreateUserInput } from './user.schemas.js';

/** Tạo tài khoản mới (dùng cho seed, sau này cho API quản trị). Mật khẩu được băm trước khi lưu. */
export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const { password, ...data } = parseInput(createUserSchema, input);

  if (await UserModel.exists({ username: data.username })) {
    throw Errors.conflict(`Tên đăng nhập "${data.username}" đã tồn tại`);
  }

  const user = await UserModel.create({ ...data, passwordHash: await hashPassword(password) });
  return toPublicUser(user);
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await UserModel.findById(id).lean();
  if (!user) throw Errors.notFound('Không tìm thấy tài khoản');
  return toPublicUser(user);
}
