import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { SessionModel } from '../src/modules/auth/session.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { ROLES, type Role } from '../src/modules/users/user.roles.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { createTestUser, TEST_PASSWORD, TEST_USERS } from './helpers/users.js';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

/** Lấy cặp "wkp_rt=..." từ Set-Cookie để gửi lại ở request sau. */
function refreshCookie(res: request.Response) {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith('wkp_rt='));
}
const cookiePair = (setCookie: string | undefined) => setCookie?.split(';')[0] ?? '';

async function loginAs(role: Role) {
  await createTestUser(role);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: TEST_USERS[role].username, password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  return { token: res.body.accessToken as string, cookie: cookiePair(refreshCookie(res)), body: res.body };
}

describe('POST /api/auth/login', () => {
  it.each(ROLES)('đăng nhập thành công với vai trò %s', async (role) => {
    const { body, cookie } = await loginAs(role);

    expect(body.tokenType).toBe('Bearer');
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.expiresIn).toBeGreaterThan(0);
    expect(body.user).toMatchObject({ role, username: TEST_USERS[role].username });
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('refreshToken');
    expect(cookie).toMatch(/^wkp_rt=.+/);
  });

  it('đặt refresh cookie httpOnly, SameSite=Strict, chỉ cho /api/auth', async () => {
    await createTestUser('admin');
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: TEST_PASSWORD });
    const setCookie = refreshCookie(res)!;

    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toMatch(/Path=\/api\/auth/);
  });

  it('không phân biệt hoa thường / khoảng trắng ở tên đăng nhập', async () => {
    await createTestUser('can_bo');
    const res = await request(app).post('/api/auth/login').send({ username: '  CanBo01 ', password: TEST_PASSWORD });
    expect(res.status).toBe(200);
  });

  it('sai mật khẩu và sai tên đăng nhập trả cùng một lỗi', async () => {
    await createTestUser('admin');
    const wrongPass = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'sai' });
    const noUser = await request(app).post('/api/auth/login').send({ username: 'khongco', password: 'sai' });

    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(noUser.body.error).toEqual(wrongPass.body.error);
  });

  it('trả lỗi VALIDATION_ERROR khi thiếu trường', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['username', 'password']),
    );
  });

  it('trả 400 khi body không phải JSON hợp lệ', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"x":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('khoá tạm tài khoản sau số lần sai tối đa (3 trong test), kể cả khi sau đó nhập đúng', async () => {
    await createTestUser('can_bo');
    const attempt = (password: string) =>
      request(app).post('/api/auth/login').send({ username: 'canbo01', password });

    expect((await attempt('sai1')).status).toBe(401);
    expect((await attempt('sai2')).status).toBe(401);
    const locked = await attempt('sai3');
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');

    expect((await attempt(TEST_PASSWORD)).status).toBe(423);
  });

  it('đăng nhập đúng sẽ reset bộ đếm sai', async () => {
    await createTestUser('can_bo');
    const attempt = (password: string) =>
      request(app).post('/api/auth/login').send({ username: 'canbo01', password });

    await attempt('sai1');
    await attempt('sai2');
    expect((await attempt(TEST_PASSWORD)).status).toBe(200);
    expect((await attempt('sai3')).status).toBe(401);
  });

  it('từ chối tài khoản bị vô hiệu hoá', async () => {
    await createTestUser('nguoi_dan');
    await UserModel.updateOne({ username: TEST_USERS.nguoi_dan.username }, { status: 'disabled' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERS.nguoi_dan.username, password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });
});

describe('GET /api/auth/me', () => {
  it('trả thông tin người đang đăng nhập', async () => {
    const { token } = await loginAs('can_bo');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'canbo01', role: 'can_bo' });
  });

  it.each([
    ['không có token', undefined],
    ['token rác', 'Bearer abc.def.ghi'],
    ['sai kiểu header', 'Basic xyz'],
  ])('trả 401 khi %s', async (_label, header) => {
    const req = request(app).get('/api/auth/me');
    const res = await (header ? req.set('Authorization', header) : req);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('trả 401 ngay khi tài khoản bị vô hiệu hoá sau khi đăng nhập', async () => {
    const { token } = await loginAs('admin');
    await UserModel.updateOne({ username: 'admin' }, { status: 'disabled' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('cấp access token mới và xoay vòng refresh token', async () => {
    const { cookie } = await loginAs('nguoi_dan');
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    const nextCookie = cookiePair(refreshCookie(res));
    expect(nextCookie).toMatch(/^wkp_rt=.+/);
    expect(nextCookie).not.toBe(cookie);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
  });

  it('trả 401 khi không có cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('dùng lại refresh token cũ → thu hồi cả phiên', async () => {
    const { cookie: first } = await loginAs('can_bo');
    const rotated = await request(app).post('/api/auth/refresh').set('Cookie', first);
    const second = cookiePair(refreshCookie(rotated));

    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', first);
    expect(reuse.status).toBe(401);

    // Token mới nhất cũng không còn dùng được, access token của phiên cũng vậy.
    expect((await request(app).post('/api/auth/refresh').set('Cookie', second)).status).toBe(401);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${rotated.body.accessToken}`);
    expect(me.status).toBe(401);

    const session = await SessionModel.findOne().lean();
    expect(session?.revokedReason).toBe('token_reuse');
  });
});

describe('POST /api/auth/logout', () => {
  it('thu hồi phiên: access token và refresh token đều hết hiệu lực ngay', async () => {
    const { token, cookie } = await loginAs('admin');

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect(refreshCookie(res)).toMatch(/wkp_rt=;/); // cookie bị xoá

    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });

  it('đăng xuất được chỉ với cookie (khi access token đã hết hạn)', async () => {
    const { token, cookie } = await loginAs('nguoi_dan');

    expect((await request(app).post('/api/auth/logout').set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  it('không lỗi khi gọi mà không có phiên', async () => {
    expect((await request(app).post('/api/auth/logout')).status).toBe(204);
  });

  it('logout-all đăng xuất mọi thiết bị', async () => {
    const deviceA = await loginAs('can_bo');
    const loginB = await request(app).post('/api/auth/login').send({ username: 'canbo01', password: TEST_PASSWORD });
    const tokenB = loginB.body.accessToken as string;

    const res = await request(app).post('/api/auth/logout-all').set('Authorization', `Bearer ${deviceA.token}`);
    expect(res.status).toBe(204);

    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenB}`)).status).toBe(401);
    expect(await SessionModel.countDocuments({ revokedAt: null })).toBe(0);
  });
});

describe('Khác', () => {
  it('GET /api/health báo DB đang hoạt động', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('route không tồn tại trả 404 đúng định dạng', async () => {
    const res = await request(app).get('/api/khong-co');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
