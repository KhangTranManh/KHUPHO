import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { isoDaysFromToday } from '../src/common/utils/date.js';
import { ResidentChangeModel } from '../src/modules/changes/residentChange.model.js';
import { HouseholdModel } from '../src/modules/households/household.model.js';
import { ReportModel } from '../src/modules/reports/report.model.js';
import type { Role } from '../src/modules/users/user.roles.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { CITIZEN_CCCD, seedHouseholds } from './helpers/fixtures.js';
import { createTestUser, loginBody } from './helpers/users.js';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  await seedHouseholds();
  const someone = { userId: new Types.ObjectId(), name: 'Nguyễn Văn An' };
  await ReportModel.create([
    { code: 'PA-T-1', category: 'trom_cap', title: 'Mất trộm xe máy', description: 'Mất xe trước nhà lúc 2h sáng', reporter: someone },
    { code: 'PA-T-2', category: 'hu_hong_dan_sinh', title: 'Đèn đường hỏng', description: 'Đèn tắt cả tuần', status: 'da_xong', reporter: someone },
    { code: 'SOS-T-1', category: 'sos', title: 'SOS khẩn cấp', reporter: someone },
  ]);
  await ResidentChangeModel.create({
    type: 'tam_tru', residentName: 'Lê Minh Đức', householdCode: 'HK-1001', date: isoDaysFromToday(-3), officer: 'Trần Quốc Huy',
  });
});

async function authFor(role: Role) {
  await createTestUser(role, role === 'cu_dan' ? { citizenId: CITIZEN_CCCD } : {});
  const res = await request(app).post('/api/auth/login').send(loginBody(role));
  return { Authorization: `Bearer ${res.body.accessToken}` };
}

describe('Mã hoá dữ liệu cá nhân', () => {
  it('họ tên, CCCD, SĐT trong MongoDB là bản mã; API trả bản rõ', async () => {
    const raw = await mongoose.connection.collection('households').findOne({ code: 'HK-1001' });
    const head = raw!.members[0];
    const dump = JSON.stringify(raw);

    expect(head.fullName).toMatch(/^v1\./);
    expect(head.citizenId).toMatch(/^v1\./);
    expect(dump).not.toContain('Nguyễn Văn An');
    expect(dump).not.toContain(CITIZEN_CCCD);
    expect(dump).not.toContain('0901234567');

    const res = await request(app).get('/api/residents?search=nguyen van an').set(await authFor('truong_kp'));
    expect(res.body.items[0]).toMatchObject({ fullName: 'Nguyễn Văn An', citizenId: CITIZEN_CCCD, phone: '0901234567' });
    expect(res.body.items[0]).not.toHaveProperty('searchTokens');
  });

  it('tài khoản: tên / SĐT mã hoá, đăng nhập tra qua blind index', async () => {
    await createTestUser('truong_kp');
    const raw = await mongoose.connection.collection('users').findOne({ role: 'truong_kp' });
    expect(raw!.phone).toMatch(/^v1\./);
    expect(raw!.phoneHash).toEqual(expect.any(String));
    expect(JSON.stringify(raw)).not.toContain('0900000002');
  });

  it('biến động: tên nhân khẩu mã hoá', async () => {
    const raw = await mongoose.connection.collection('resident_changes').findOne({});
    expect(raw!.residentName).toMatch(/^v1\./);
  });
});

describe('Phân quyền', () => {
  it.each(['/api/residents', '/api/households', '/api/areas', '/api/changes', '/api/welfare-households', '/api/dashboard/officer'])(
    '%s: chưa đăng nhập → 401, cư dân → 403',
    async (path) => {
      expect((await request(app).get(path)).status).toBe(401);
      expect((await request(app).get(path).set(await authFor('cu_dan'))).status).toBe(403);
    },
  );
});

describe('GET /api/residents (nhân khẩu nhúng trong hộ)', () => {
  it('trả Paged<Resident>: chủ hộ đứng đầu, kèm hộ, vai trò, lịch sử cư trú', async () => {
    const res = await request(app).get('/api/residents').set(await authFor('truong_kp'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, page: 1, pageSize: 10 });
    expect(res.body.items[0]).toMatchObject({
      householdCode: 'HK-1001',
      householdRole: 'chu_ho',
      categories: ['nguoi_cao_tuoi', 'cuu_chien_binh'],
    });

    const tenant = res.body.items.find((p: { fullName: string }) => p.fullName === 'Lê Minh Đức');
    expect(tenant).toMatchObject({
      householdRole: 'thanh_vien',
      relationToHead: 'nguoi_thue',
      residenceStatus: 'tam_tru',
      residenceFrom: '2025-01-10',
      residenceTo: '2026-12-31',
      residenceHistory: [{ status: 'tam_tru', from: '2025-01-10', to: '2026-12-31', note: 'Thuê trọ đi làm' }],
    });
  });

  it('lọc theo cư trú, nhóm đối tượng; tìm theo tên / CCCD / SĐT / mã hộ', async () => {
    const auth = await authFor('cong_an_kv');
    const get = (qs: string) => request(app).get(`/api/residents?${qs}`).set(auth);

    expect((await get('filter=tam_vang')).body.items.map((p: { fullName: string }) => p.fullName)).toEqual(['Trần Thị Bình']);
    expect((await get('category=cuu_chien_binh')).body.total).toBe(1);
    expect((await get('search=thi cuc')).body.items[0].fullName).toBe('Nguyễn Thị Cúc');
    expect((await get('search=079098000003')).body.items[0].fullName).toBe('Lê Minh Đức');
    expect((await get('search=0988000111')).body.total).toBe(1);
    expect((await get('search=HK-1002')).body.total).toBe(1);
  });

  it('GET /api/residents/:id', async () => {
    const auth = await authFor('truong_kp');
    const list = await request(app).get('/api/residents?filter=tam_vang').set(auth);
    const res = await request(app).get(`/api/residents/${list.body.items[0].id}`).set(auth);
    expect(res.body).toMatchObject({ fullName: 'Trần Thị Bình', householdCode: 'HK-1002' });
  });

  it('query sai → 400', async () => {
    const res = await request(app).get('/api/residents?filter=abc&pageSize=1000').set(await authFor('truong_kp'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/households', () => {
  it('lọc theo loại nhà ở; chủ hộ suy ra từ thành viên; có loại hộ, toạ độ', async () => {
    const res = await request(app).get('/api/households?filter=cao_tang').set(await authFor('truong_kp'));
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      code: 'HK-1002',
      apartment: 'A-1205',
      headName: 'Trần Thị Bình',
      householdType: 'ngheo',
      location: { lat: 10.78, lng: 106.7 },
      memberCount: 1,
    });
  });

  it('chi tiết hộ kèm nhân khẩu; tìm hộ theo tên thành viên', async () => {
    const auth = await authFor('truong_kp');
    const found = await request(app).get('/api/households?search=le minh duc').set(auth);
    expect(found.body.items[0].code).toBe('HK-1001');
    const detail = await request(app).get(`/api/households/${found.body.items[0].id}`).set(auth);
    expect(detail.body.members).toHaveLength(3);
    expect(detail.body.headPhone).toBe('0901234567');
  });

  it('mỗi hộ phải có đúng một chủ hộ', async () => {
    const h = await HouseholdModel.findOne({ code: 'HK-1002' });
    h!.members.push({ fullName: 'Người thứ hai', gender: 'nam', dateOfBirth: '1990-01-01', relation: 'chu_ho', registeredAt: '2020-01-01' });
    await expect(h!.save()).rejects.toThrow(/đúng một chủ hộ/);
  });
});

describe('GET /api/dashboard/officer', () => {
  it('tổng hợp từ hộ / nhân khẩu nhúng và phản ánh + SOS', async () => {
    const res = await request(app).get('/api/dashboard/officer').set(await authFor('truong_kp'));
    const d = res.body;
    expect(d.households.value).toBe(2);
    expect(d.residents.value).toBe(4);
    expect(d.temporaryResidents.value).toBe(1);
    expect(d.temporaryAbsent.value).toBe(1);
    expect(d.byHousingType.thap_tang).toMatchObject({ households: 1, residents: 3 });
    expect(d.byCategory).toMatchObject({ nguoi_cao_tuoi: 1, cuu_chien_binh: 1, tre_em: 1, nguoi_di_lam: 2 });
    expect(d.areas.find((a: { name: string }) => a.name === 'Tổ 1')).toMatchObject({ households: 1, residents: 3, temporaryResidents: 1 });
    expect(d.pendingReportCount).toBe(1);
    expect(d.pendingReports[0]).toMatchObject({ code: 'PA-T-1', type: 'an_ninh' });
    expect(d.openSosCount).toBe(1);
    expect(d.recentChanges[0]).toMatchObject({ residentName: 'Lê Minh Đức' });
  });
});
