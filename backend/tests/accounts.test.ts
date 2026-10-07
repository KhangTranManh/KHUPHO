/**
 * Trưởng KP quản lý theo SĐT: tra cứu → sửa tài khoản / nhân khẩu.
 * Kiểm tra sửa xong vẫn đăng nhập, tìm kiếm đúng (trường mã hoá + blind index được tính lại).
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ResidentChangeModel } from '../src/modules/changes/residentChange.model.js';
import { HouseholdModel } from '../src/modules/households/household.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { blindIndex, decryptField, searchTokens } from '../src/common/security/fieldEncryption.js';
import type { Role } from '../src/modules/users/user.roles.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { CITIZEN_CCCD, seedHouseholds } from './helpers/fixtures.js';
import { TEST_PASSWORD, TEST_USERS, createTestUser, loginBody } from './helpers/users.js';

const app = createApp();
const TENANT_PHONE = '0988000111'; // Lê Minh Đức — người thuê trong HK-1001, chưa có tài khoản

let auth: Record<Role, { Authorization: string }>;
let ids: Record<Role, string>;

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  await seedHouseholds();
  const entries = await Promise.all(
    (['truong_kp', 'cong_an_kv', 'cu_dan'] as Role[]).map(async (role) => {
      const user = await createTestUser(role, role === 'cu_dan' ? { citizenId: CITIZEN_CCCD } : {});
      const res = await request(app).post('/api/auth/login').send(loginBody(role));
      return [role, { auth: { Authorization: `Bearer ${res.body.accessToken}` }, id: user.id }] as const;
    }),
  );
  auth = Object.fromEntries(entries.map(([r, v]) => [r, v.auth])) as typeof auth;
  ids = Object.fromEntries(entries.map(([r, v]) => [r, v.id])) as typeof ids;
});

const lookup = (phone: string, as: Role = 'truong_kp') =>
  request(app).get(`/api/accounts/lookup?phone=${encodeURIComponent(phone)}`).set(auth[as]);
const patchAccount = (id: string, body: object) => request(app).patch(`/api/accounts/${id}`).set(auth.truong_kp).send(body);
const login = (identifier: string, password = TEST_PASSWORD) => request(app).post('/api/auth/login').send({ identifier, password });

describe('GET /accounts/lookup', () => {
  it('chỉ Trưởng KP', async () => {
    expect((await lookup(TENANT_PHONE, 'cong_an_kv')).status).toBe(403);
    expect((await lookup(TENANT_PHONE, 'cu_dan')).status).toBe(403);
  });

  it('SĐT chưa có tài khoản → account null + nhân khẩu có SĐT đó (đã giải mã)', async () => {
    const res = await lookup('+84 988 000 111');
    expect(res.status).toBe(200);
    expect(res.body.account).toBeNull();
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].member).toMatchObject({ fullName: 'Lê Minh Đức', residenceStatus: 'tam_tru' });
    expect(res.body.members[0].household.code).toBe('HK-1001');
  });

  it('SĐT có tài khoản → kèm hộ liên kết', async () => {
    const res = await lookup(TEST_USERS.cu_dan.phone!);
    expect(res.body.account).toMatchObject({ role: 'cu_dan', activated: true, status: 'active' });
    expect(res.body.account.linkedHousehold).toMatchObject({ householdCode: 'HK-1001', memberName: 'Nguyễn Văn An' });
  });
});

describe('POST /accounts', () => {
  it('tạo tài khoản chưa kích hoạt; cư dân tự liên kết nhân khẩu cùng SĐT', async () => {
    const res = await request(app).post('/api/accounts').set(auth.truong_kp).send({ phone: TENANT_PHONE, fullName: 'Lê Minh Đức', role: 'cu_dan' });
    expect(res.status).toBe(201);
    expect(res.body.account).toMatchObject({ activated: false, linkedHousehold: { householdCode: 'HK-1001', memberName: 'Lê Minh Đức' } });
  });

  it('SĐT đã có tài khoản → 409', async () => {
    const res = await request(app).post('/api/accounts').set(auth.truong_kp).send({ phone: TEST_USERS.cu_dan.phone, fullName: 'Trùng', role: 'cu_dan' });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /accounts/:id', () => {
  it('đổi SĐT: đăng nhập bằng số mới, số cũ hết dùng, phiên cũ bị thu hồi', async () => {
    const res = await patchAccount(ids.cu_dan, { phone: '0911555666', fullName: 'Nguyễn Văn An (mới)' });
    expect(res.status).toBe(200);
    expect(res.body.account).toMatchObject({ phone: '0911555666', fullName: 'Nguyễn Văn An (mới)' });

    expect((await request(app).get('/api/auth/me').set(auth.cu_dan)).status).toBe(401);
    expect((await login('0911555666')).status).toBe(200);
    expect((await login(TEST_USERS.cu_dan.phone!)).status).toBe(401);
  });

  it('khoá tài khoản → không đăng nhập được; mở lại → được', async () => {
    await patchAccount(ids.cong_an_kv, { status: 'disabled' });
    expect((await login(TEST_USERS.cong_an_kv.phone!)).body.error.code).toBe('ACCOUNT_DISABLED');
    await patchAccount(ids.cong_an_kv, { status: 'active' });
    expect((await login(TEST_USERS.cong_an_kv.phone!)).status).toBe(200);
  });

  it('đặt lại mật khẩu → mật khẩu cũ hết dùng, tài khoản về "chưa kích hoạt"', async () => {
    const res = await patchAccount(ids.cu_dan, { resetPassword: true });
    expect(res.body.account.activated).toBe(false);
    expect((await login(TEST_USERS.cu_dan.phone!)).status).toBe(401);
  });

  it('đổi vai trò có hiệu lực ngay', async () => {
    await patchAccount(ids.cong_an_kv, { role: 'cu_dan' });
    const relogin = await login(TEST_USERS.cong_an_kv.phone!);
    expect(relogin.body.user.role).toBe('cu_dan');
  });

  it('bị chặn: tự khoá / tự hạ quyền, SĐT trùng, chủ hộ đã có tài khoản khác', async () => {
    expect((await patchAccount(ids.truong_kp, { status: 'disabled' })).status).toBe(400);
    expect((await patchAccount(ids.truong_kp, { role: 'cu_dan' })).status).toBe(400);
    expect((await patchAccount(ids.cong_an_kv, { phone: TEST_USERS.cu_dan.phone })).status).toBe(409);
    expect((await patchAccount(ids.cong_an_kv, { householdCode: 'HK-1001' })).status).toBe(409);
    expect((await patchAccount(ids.cong_an_kv, {})).status).toBe(400);
  });

  it('đổi / bỏ hộ liên kết', async () => {
    expect((await patchAccount(ids.cu_dan, { householdCode: '' })).body.account.linkedHousehold).toBeUndefined();
    const relinked = await patchAccount(ids.cu_dan, { householdCode: 'HK1002' });
    expect(relinked.body.account.linkedHousehold).toMatchObject({ householdCode: 'HK-1002', memberName: 'Trần Thị Bình' });
  });
});

describe('Mã hoá + băm lại khi sửa (đọc dữ liệu thô trong DB)', () => {
  it('tài khoản: SĐT / họ tên lưu bản mã mới, phoneHash = HMAC của SĐT mới', async () => {
    await patchAccount(ids.cu_dan, { phone: '0911555666', fullName: 'Tên Mới' });
    const raw = await UserModel.collection.findOne({ _id: (await UserModel.findById(ids.cu_dan))!._id });
    expect(raw!.phone).toMatch(/^v1./);
    expect(raw!.fullName).toMatch(/^v1./);
    expect(decryptField(raw!.phone)).toBe('0911555666');
    expect(raw!.phoneHash).toBe(blindIndex('phone', '0911555666'));
    expect(raw!.phoneHash).not.toBe(blindIndex('phone', TEST_USERS.cu_dan.phone!));
  });

  it('nhân khẩu: họ tên / SĐT / CCCD lưu bản mã mới, các hash + token tìm kiếm tính lại theo giá trị mới', async () => {
    const { household, member } = (await lookup(TENANT_PHONE)).body.members[0];
    await request(app).patch(`/api/accounts/members/${household.id}/${member.id}`).set(auth.truong_kp)
      .send({ fullName: 'Lê Minh Đạt', phone: '0977123456', citizenId: '079098000099' });
    const raw = await HouseholdModel.collection.findOne({ code: 'HK-1001' });
    const m = raw!.members.find((x: { _id: unknown }) => String(x._id) === member.id);
    for (const field of ['fullName', 'phone', 'citizenId']) expect(m[field]).toMatch(/^v1./);
    expect(decryptField(m.fullName)).toBe('Lê Minh Đạt');
    expect(m.phoneHash).toBe(blindIndex('phone', '0977123456'));
    expect(m.citizenIdHash).toBe(blindIndex('cccd', '079098000099'));
    expect(m.searchTokens).toEqual(expect.arrayContaining(searchTokens('Lê Minh Đạt')));
    expect(m.searchTokens).not.toEqual(expect.arrayContaining(searchTokens('Đức')));
    // Token tìm kiếm cấp hộ cũng được tính lại.
    expect(raw!.searchTokens).toEqual(expect.arrayContaining(searchTokens('Đạt')));
  });
});

describe('PATCH /accounts/members/:householdId/:memberId', () => {
  const memberPath = async (phone = TENANT_PHONE) => {
    const { household, member } = (await lookup(phone)).body.members[0];
    return `/api/accounts/members/${household.id}/${member.id}`;
  };

  it('sửa họ tên / SĐT / CCCD → tìm kiếm theo thông tin mới được, theo thông tin cũ không', async () => {
    const res = await request(app).patch(await memberPath()).set(auth.truong_kp).send({ fullName: 'Lê Minh Đạt', phone: '0977123456', citizenId: '079098000099' });
    expect(res.status).toBe(200);
    expect(res.body.member).toMatchObject({ fullName: 'Lê Minh Đạt', phone: '0977123456', citizenId: '079098000099' });

    const search = (q: string) => request(app).get(`/api/residents?search=${encodeURIComponent(q)}`).set(auth.truong_kp);
    expect((await search('Minh Đạt')).body.items.map((r: { fullName: string }) => r.fullName)).toContain('Lê Minh Đạt');
    expect((await search('Minh Đức')).body.total).toBe(0);
    expect((await lookup('0977123456')).body.members).toHaveLength(1);
    expect((await lookup(TENANT_PHONE)).body.members).toHaveLength(0);
  });

  it('xoá SĐT / CCCD bằng chuỗi rỗng', async () => {
    const res = await request(app).patch(await memberPath()).set(auth.truong_kp).send({ phone: '', citizenId: '' });
    expect(res.body.member.phone).toBeUndefined();
    expect(res.body.member.citizenId).toBeUndefined();
  });

  it('đổi tình trạng cư trú → ghi lịch sử + nhật ký biến động', async () => {
    const path = await memberPath('0901234567'); // chủ hộ HK-1001
    const res = await request(app)
      .patch(path)
      .set(auth.truong_kp)
      .send({ residenceStatus: 'tam_vang', residenceFrom: '2026-10-01', residenceTo: '2026-12-31', residenceNote: 'Đi điều trị bệnh' });
    expect(res.status).toBe(200);
    expect(res.body.member).toMatchObject({ residenceStatus: 'tam_vang', residenceFrom: '2026-10-01', residenceTo: '2026-12-31' });
    expect(res.body.member.residenceHistory.at(-1)).toMatchObject({ status: 'tam_vang', note: 'Đi điều trị bệnh' });
    expect(await ResidentChangeModel.countDocuments({ type: 'tam_vang' })).toBe(1);

    const back = await request(app).patch(path).set(auth.truong_kp).send({ residenceStatus: 'thuong_tru' });
    expect(back.body.member.residenceStatus).toBe('thuong_tru');
    expect(back.body.member.residenceFrom).toBeUndefined();
  });

  it('bị chặn: CCCD trùng người khác, đổi chủ hộ, tạm vắng thiếu ngày, cán bộ không phải Trưởng KP', async () => {
    const path = await memberPath();
    expect((await request(app).patch(path).set(auth.truong_kp).send({ citizenId: CITIZEN_CCCD })).status).toBe(409);
    expect((await request(app).patch(path).set(auth.truong_kp).send({ relation: 'chu_ho' })).status).toBe(400);
    expect((await request(app).patch(path).set(auth.truong_kp).send({ residenceStatus: 'tam_vang', residenceFrom: '' })).status).toBe(400);
    expect((await request(app).patch(path).set(auth.cong_an_kv).send({ fullName: 'Hack' })).status).toBe(403);
    // Dữ liệu vẫn nguyên vẹn, hộ vẫn hợp lệ.
    const h = await HouseholdModel.findOne({ code: 'HK-1001' });
    expect(h!.members.filter((m) => m.relation === 'chu_ho')).toHaveLength(1);
  });
});
