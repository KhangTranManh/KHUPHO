/**
 * Tạo 3 tài khoản mẫu (admin, cán bộ, người dân) nếu chưa có.
 *   npm run seed:users
 * Mật khẩu lấy từ SEED_*_PASSWORD trong .env; bỏ trống → tự sinh và in ra một lần.
 * Chạy lại an toàn: tài khoản đã tồn tại sẽ được bỏ qua, không đổi mật khẩu.
 */
import { generatePassword } from '../src/common/security/password.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { UserModel } from '../src/modules/users/user.model.js';
import type { CreateUserInput } from '../src/modules/users/user.schemas.js';
import { createUser } from '../src/modules/users/user.service.js';

const SEED_USERS: (Omit<CreateUserInput, 'password'> & { passwordEnv: string })[] = [
  { username: 'admin', role: 'admin', fullName: 'Quản trị hệ thống', passwordEnv: 'SEED_ADMIN_PASSWORD' },
  { username: 'canbo01', role: 'can_bo', fullName: 'Trần Quốc Huy', passwordEnv: 'SEED_OFFICER_PASSWORD' },
  {
    username: '001099012345',
    role: 'nguoi_dan',
    fullName: 'Nguyễn Văn An',
    citizenId: '001099012345',
    passwordEnv: 'SEED_CITIZEN_PASSWORD',
  },
];

async function main() {
  await connectDatabase();
  const created: { role: string; username: string; password: string }[] = [];

  for (const { passwordEnv, ...user } of SEED_USERS) {
    if (await UserModel.exists({ username: user.username })) {
      console.log(`• Bỏ qua "${user.username}" — đã tồn tại`);
      continue;
    }
    const password = process.env[passwordEnv] || generatePassword();
    await createUser({ ...user, password });
    created.push({ role: user.role, username: user.username, password });
  }

  if (created.length) {
    console.log('\nĐã tạo tài khoản (lưu lại mật khẩu, sẽ không hiển thị lần nữa):');
    console.table(created);
  }
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDatabase();
  process.exit(1);
});
