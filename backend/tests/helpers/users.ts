import type { Role } from '../../src/modules/users/user.roles.js';
import { createUser } from '../../src/modules/users/user.service.js';

export const TEST_PASSWORD = 'MatKhau123';

/** Tài khoản mẫu cho từng vai trò. `login` = giá trị dùng để đăng nhập (SĐT hoặc email). */
export const TEST_USERS: Record<Role, { fullName: string; phone?: string; email?: string; login: string }> = {
  truong_kp: { fullName: 'Lê Văn Tổ', phone: '0900000002', email: 'truongkp@khupho.local', login: '0900000002' },
  cong_an_kv: { fullName: 'Trần Quốc Huy', phone: '0900000003', login: '0900000003' },
  cu_dan: { fullName: 'Nguyễn Văn An', phone: '0900000004', login: '0900000004' },
};

/** Tạo tài khoản; cư dân có thể liên kết nhân khẩu qua `citizenId`. */
export function createTestUser(role: Role, opts: { citizenId?: string } = {}) {
  const { login: _login, ...u } = TEST_USERS[role];
  return createUser({ ...u, role, password: TEST_PASSWORD, citizenId: opts.citizenId });
}

export const loginBody = (role: Role) => ({ identifier: TEST_USERS[role].login, password: TEST_PASSWORD });
