/**
 * Đăng nhập lần đầu / quên mật khẩu: xin mật khẩu tạm qua SMS (mock) → đăng nhập → bắt buộc đổi mật khẩu.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { mockOutbox } from '../src/common/sms/sms.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { createUser } from '../src/modules/users/user.service.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { TEST_PASSWORD, createTestUser, loginBody } from './helpers/users.js';

const app = createApp();
const PHONE = '0911222333';
const NEW_PASSWORD = 'MatKhauMoi2026';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  mockOutbox.length = 0;
  await createUser({ role: 'truong_kp', fullName: 'Người Thử Nghiệm', phone: PHONE }); // chưa có mật khẩu
});

const askTempPassword = (phone = PHONE) => request(app).post('/api/auth/temp-password').send({ phone });
const login = (password: string, identifier = PHONE) => request(app).post('/api/auth/login').send({ identifier, password });
const bearer = (res: request.Response) => ({ Authorization: `Bearer ${res.body.accessToken}` });

describe('POST /auth/temp-password', () => {
  it('tài khoản chưa kích hoạt không đăng nhập được bằng mật khẩu bất kỳ', async () => {
    expect((await login('BatKy12345')).status).toBe(401);
  });

  it('gửi SMS chứa mật khẩu tạm; môi trường thử nghiệm trả kèm devTempPassword', async () => {
    const res = await askTempPassword('+84 911 222 333');
    expect(res.status).toBe(200);
    expect(res.body.devTempPassword).toMatch(/^[A-Z2-9]{8}$/);
    expect(mockOutbox).toHaveLength(1);
    expect(mockOutbox[0].to).toBe(PHONE);
    expect(mockOutbox[0].text).toContain(res.body.devTempPassword);
  });

  it('SĐT không có tài khoản: cùng thông điệp, không gửi SMS', async () => {
    const [known, unknown] = [await askTempPassword(), await askTempPassword('0987654321')];
    expect(unknown.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);
    expect(unknown.body.devTempPassword).toBeUndefined();
    expect(mockOutbox).toHaveLength(1);
  });

  it('gửi lại quá sớm thì không gửi thêm SMS', async () => {
    await askTempPassword();
    const again = await askTempPassword();
    expect(again.body.devTempPassword).toBeUndefined();
    expect(mockOutbox).toHaveLength(1);
  });

  it('SĐT sai định dạng → 400', async () => {
    expect((await askTempPassword('123')).status).toBe(400);
  });
});

describe('Đăng nhập bằng mật khẩu tạm', () => {
  it('đăng nhập được (không phân biệt hoa thường), bị buộc đổi mật khẩu', async () => {
    const temp = (await askTempPassword()).body.devTempPassword as string;
    const res = await login(temp.toLowerCase());
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(true);

    // Chỉ /auth/me và /auth/change-password dùng được.
    expect((await request(app).get('/api/auth/me').set(bearer(res))).status).toBe(200);
    const blocked = await request(app).get('/api/dashboard/officer').set(bearer(res));
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('mật khẩu tạm chỉ dùng một lần', async () => {
    const temp = (await askTempPassword()).body.devTempPassword as string;
    expect((await login(temp)).status).toBe(200);
    expect((await login(temp)).status).toBe(401);
  });

  it('mật khẩu tạm hết hạn → không đăng nhập được', async () => {
    const temp = (await askTempPassword()).body.devTempPassword as string;
    await UserModel.updateOne({}, { $set: { 'tempPassword.expiresAt': new Date(Date.now() - 1000) } });
    expect((await login(temp)).status).toBe(401);
  });

  it('đổi mật khẩu → mở khoá mọi chức năng, đăng nhập bằng mật khẩu mới', async () => {
    const temp = (await askTempPassword()).body.devTempPassword as string;
    const session = await login(temp);

    const weak = await request(app).post('/api/auth/change-password').set(bearer(session)).send({ newPassword: '123' });
    expect(weak.status).toBe(400);

    const changed = await request(app).post('/api/auth/change-password').set(bearer(session)).send({ newPassword: NEW_PASSWORD });
    expect(changed.status).toBe(200);
    expect(changed.body.user.mustChangePassword).toBe(false);
    expect((await request(app).get('/api/dashboard/officer').set(bearer(session))).status).toBe(200);

    expect((await login(NEW_PASSWORD)).status).toBe(200);
  });
});

describe('POST /auth/change-password (đã có mật khẩu)', () => {
  it('bắt buộc đúng mật khẩu hiện tại, mật khẩu mới phải khác', async () => {
    await createTestUser('cu_dan');
    const session = await request(app).post('/api/auth/login').send(loginBody('cu_dan'));
    const change = (body: object) => request(app).post('/api/auth/change-password').set(bearer(session)).send(body);

    expect((await change({ newPassword: NEW_PASSWORD })).status).toBe(400);
    expect((await change({ currentPassword: 'Sai12345', newPassword: NEW_PASSWORD })).status).toBe(400);
    expect((await change({ currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD })).status).toBe(400);
    expect((await change({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD })).status).toBe(200);
  });

  it('quên mật khẩu: mật khẩu tạm dùng được cả khi đã có mật khẩu', async () => {
    await createTestUser('cu_dan');
    const temp = (await askTempPassword('0900000004')).body.devTempPassword as string;
    const res = await login(temp, '0900000004');
    expect(res.body.user.mustChangePassword).toBe(true);
  });
});
