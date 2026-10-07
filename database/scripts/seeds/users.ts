/**
 * Bước 4 — tài khoản: một tài khoản cho mỗi vai trò, rồi liên kết tài khoản cư dân với nhân khẩu.
 * Mật khẩu lấy từ SEED_*_PASSWORD trong .env; bỏ trống → tự sinh và in ra một lần.
 * Chạy lại an toàn: tài khoản đã có (cùng SĐT) được bỏ qua, không đổi mật khẩu.
 */
import { blindIndex } from '../../../backend/src/common/security/fieldEncryption.js';
import { generatePassword } from '../../../backend/src/common/security/password.js';
import { HouseholdModel } from '../../../backend/src/modules/households/household.model.js';
import { UserModel } from '../../../backend/src/modules/users/user.model.js';
import { ROLES, type Role } from '../../../backend/src/modules/users/user.roles.js';
import { createUser } from '../../../backend/src/modules/users/user.service.js';
import { step } from '../lib/run.js';

export const SEED_USERS: { role: Role; fullName: string; phone: string; passwordEnv: string }[] = [
  { role: 'truong_kp', fullName: 'Lê Văn Tổ', phone: '0900000002', passwordEnv: 'SEED_TRUONG_KP_PASSWORD' },
  { role: 'cong_an_kv', fullName: 'Trần Quốc Huy', phone: '0900000003', passwordEnv: 'SEED_CONG_AN_KV_PASSWORD' },
  { role: 'cu_dan', fullName: 'Nguyễn Văn An', phone: '0900000004', passwordEnv: 'SEED_CU_DAN_PASSWORD' },
];

/**
 * Tài khoản CHƯA KÍCH HOẠT (không có mật khẩu) — để thử luồng đăng nhập lần đầu:
 * nhập SĐT → nhận mật khẩu tạm qua SMS → đăng nhập → bắt buộc đổi mật khẩu.
 * Khai báo trong .env (SĐT thật không nằm trong code / git), dạng `SĐT:vai_trò[:Họ tên]`, cách nhau dấu phẩy:
 *   SEED_FIRST_LOGIN=0912345678:truong_kp,0987654321:cu_dan
 * Cư dân trong danh sách được gán làm chủ hộ HK-1002, HK-1003… khi tạo dữ liệu mẫu (--demo) để liên kết hộ.
 */
export function firstLoginAccounts(raw = process.env.SEED_FIRST_LOGIN ?? '') {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [phone, role, fullName] = entry.split(':').map((s) => s.trim());
      if (!/^0\d{9}$/.test(phone)) throw new Error(`SEED_FIRST_LOGIN: SĐT không hợp lệ "${phone}"`);
      if (!(ROLES as readonly string[]).includes(role)) {
        throw new Error(`SEED_FIRST_LOGIN: vai trò "${role}" không hợp lệ (${ROLES.join(' / ')})`);
      }
      return { phone, role: role as Role, fullName: fullName || `Người dùng ${phone.slice(-4)}` };
    });
}

export async function seedUsers() {
  const created: { role: string; login: string; password: string }[] = [];
  const exists = (phone: string) => UserModel.exists({ phoneHash: blindIndex('phone', phone) });

  for (const { passwordEnv, ...user } of SEED_USERS) {
    if (await exists(user.phone)) continue;
    const password = process.env[passwordEnv] || generatePassword();
    await createUser({ ...user, password });
    created.push({ role: user.role, login: user.phone, password: process.env[passwordEnv] ? `(${passwordEnv})` : password });
  }

  const firstLogin = firstLoginAccounts();
  for (const user of firstLogin) {
    if (await exists(user.phone)) continue;
    await createUser(user);
    created.push({ role: user.role, login: user.phone, password: '— chưa có: đăng nhập lần đầu bằng mật khẩu tạm (SMS)' });
  }
  step('Tài khoản', `thêm ${created.length}/${SEED_USERS.length + firstLogin.length}`);

  const linked = await linkResidentAccounts();
  step('Liên kết cư dân ↔ nhân khẩu', `${linked} tài khoản`);

  if (created.length) {
    console.log('\nTài khoản mới (lưu lại mật khẩu tự sinh — sẽ không hiển thị lần nữa):');
    console.table(created);
  }
}

/**
 * Tài khoản cư dân chưa liên kết → tìm nhân khẩu có cùng SĐT (so blind index, không giải mã).
 * Nhờ vậy thứ tự tạo tài khoản / tạo hộ không quan trọng.
 */
export async function linkResidentAccounts() {
  const users = await UserModel.find({ role: 'cu_dan', residentRef: { $exists: false }, phoneHash: { $type: 'string' } });
  let linked = 0;
  for (const user of users) {
    const household = await HouseholdModel.findOne({ 'members.phoneHash': user.phoneHash }).select('members._id members.phoneHash');
    const member = household?.members.find((m) => m.phoneHash === user.phoneHash);
    if (!household || !member) continue;
    if (await UserModel.exists({ 'residentRef.memberId': member._id })) continue;
    user.residentRef = { householdId: household._id, memberId: member._id };
    await user.save();
    linked++;
  }
  return linked;
}
