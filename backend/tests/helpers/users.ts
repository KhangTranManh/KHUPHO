import type { Role } from '../../src/modules/users/user.roles.js';
import { createUser } from '../../src/modules/users/user.service.js';

export const TEST_PASSWORD = 'MatKhau123';

/** Tài khoản mẫu cho từng vai trò. */
export const TEST_USERS: Record<Role, { username: string; fullName: string; citizenId?: string }> = {
  admin: { username: 'admin', fullName: 'Quản trị hệ thống' },
  can_bo: { username: 'canbo01', fullName: 'Trần Quốc Huy' },
  nguoi_dan: { username: '001099012345', fullName: 'Nguyễn Văn An', citizenId: '001099012345' },
};

export function createTestUser(role: Role) {
  return createUser({ ...TEST_USERS[role], role, password: TEST_PASSWORD });
}
