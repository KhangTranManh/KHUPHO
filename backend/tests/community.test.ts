import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { DirectoryModel } from '../src/modules/directory/directory.model.js';
import { FundModel } from '../src/modules/funds/fund.model.js';
import type { Role } from '../src/modules/users/user.roles.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { CITIZEN_CCCD, seedHouseholds } from './helpers/fixtures.js';
import { createTestUser, loginBody, TEST_USERS } from './helpers/users.js';

const app = createApp();
const year = new Date().getFullYear();

beforeAll(startTestDb);
afterAll(stopTestDb);

let auth: Record<Role, { Authorization: string }>;
let fx: Awaited<ReturnType<typeof seedHouseholds>>;

/** Hộ mẫu + 4 tài khoản; cư dân liên kết tới chủ hộ HK-1001 (Tổ 1, người cao tuổi, CCB). */
beforeEach(async () => {
  await clearTestDb();
  fx = await seedHouseholds();
  const entries = await Promise.all(
    (['truong_kp', 'cong_an_kv', 'cu_dan'] as Role[]).map(async (role) => {
      await createTestUser(role, role === 'cu_dan' ? { citizenId: CITIZEN_CCCD } : {});
      const res = await request(app).post('/api/auth/login').send(loginBody(role));
      return [role, { Authorization: `Bearer ${res.body.accessToken}` }] as const;
    }),
  );
  auth = Object.fromEntries(entries) as typeof auth;
});

describe('Tài khoản cư dân liên kết nhân khẩu', () => {
  it('/auth/me trả hộ của cư dân', async () => {
    const res = await request(app).get('/api/auth/me').set(auth.cu_dan);
    expect(res.body.user).toMatchObject({ role: 'cu_dan', householdId: fx.h1.id });
  });
});

describe('3. Phản ánh & SOS (cùng collection reports)', () => {
  const body = {
    category: 'trom_cap',
    title: 'Mất trộm xe máy',
    description: 'Xe dựng trước cửa bị mất lúc 2h sáng',
    address: '12 Lê Lợi',
    point: { lat: 10.77, lng: 106.69 },
    images: ['https://example.com/anh-1.jpg'],
    reporterName: 'Giả mạo tên', // phải bị bỏ qua
  };

  it('cư dân gửi phản ánh: mã tự sinh, người gửi + hộ lấy từ tài khoản, giao công an KV, có lịch sử', async () => {
    const res = await request(app).post('/api/reports').set(auth.cu_dan).send(body);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      code: `PA-${year}-0001`,
      type: 'an_ninh',
      severity: 'thuong',
      status: 'moi',
      assignedRole: 'cong_an_kv',
      images: ['https://example.com/anh-1.jpg'],
      location: { address: '12 Lê Lợi', point: { type: 'Point', coordinates: [106.69, 10.77] } },
      reporter: { name: TEST_USERS.cu_dan.fullName, householdCode: 'HK-1001' },
      history: [{ action: 'tao', toStatus: 'moi', byName: TEST_USERS.cu_dan.fullName }],
    });

    const raw = await mongoose.connection.collection('reports').findOne({ code: res.body.code });
    expect(raw!.reporter.name).toMatch(/^v1\./);
  });

  it('cư dân chỉ thấy của mình; cán bộ cập nhật → ghi lịch sử, đặt người xử lý, thời gian xong', async () => {
    const created = await request(app).post('/api/reports').set(auth.cu_dan).send(body);
    await request(app).post('/api/reports').set(auth.truong_kp).send({ ...body, title: 'Cán bộ tự ghi nhận' });
    expect((await request(app).get('/api/reports').set(auth.cu_dan)).body.total).toBe(1);
    expect((await request(app).get('/api/reports').set(auth.cong_an_kv)).body.total).toBe(2);

    const path = `/api/reports/${created.body.id}`;
    expect((await request(app).patch(path).set(auth.cu_dan).send({ status: 'da_xong' })).status).toBe(403);
    await request(app).patch(path).set(auth.cong_an_kv).send({ status: 'dang_xu_ly', note: 'Đang xác minh' });
    const done = await request(app).patch(path).set(auth.cong_an_kv).send({ status: 'da_xong', note: 'Đã thu hồi xe' });

    expect(done.body).toMatchObject({ status: 'da_xong', assignee: { name: TEST_USERS.cong_an_kv.fullName } });
    expect(done.body.resolvedAt).toEqual(expect.any(String));
    expect(done.body.history.map((h: { action: string }) => h.action)).toEqual(['tao', 'cap_nhat_trang_thai', 'cap_nhat_trang_thai']);
  });

  it('SOS: không cần nhập gì — khẩn, SĐT / hộ / địa chỉ / toạ độ lấy từ tài khoản và hộ', async () => {
    // Gán toạ độ cho hộ của cư dân.
    await mongoose.connection.collection('households').updateOne({ _id: fx.h1._id }, { $set: { location: { type: 'Point', coordinates: [106.7, 10.8] } } });
    const res = await request(app).post('/api/sos').set(auth.cu_dan).send({});
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: 'sos',
      severity: 'khan',
      assignedRole: 'cong_an_kv',
      reporter: { householdCode: 'HK-1001', phone: TEST_USERS.cu_dan.phone },
      location: { address: '12/3, Hẻm 120 Lê Lợi', point: { coordinates: [106.7, 10.8] } },
    });
    expect((await request(app).get('/api/sos').set(auth.cong_an_kv)).body.total).toBe(1);
    expect((await request(app).get('/api/reports?kind=phan_anh').set(auth.cong_an_kv)).body.total).toBe(0);
  });
});

describe('4. Bài đăng & sổ tay phường', () => {
  const post = (extra: object) =>
    request(app)
      .post('/api/posts')
      .set(auth.truong_kp)
      .send({ kind: 'thong_bao_nhanh', category: 'kham_suc_khoe', title: 'Khám sức khoẻ định kỳ', content: 'Khám miễn phí tại nhà văn hoá', ...extra });

  it('đối tượng nhận: cư dân chỉ thấy bài cho tất cả / khu vực mình / nhóm mình', async () => {
    expect((await request(app).post('/api/posts').set(auth.cu_dan).send({})).status).toBe(403);
    await post({ title: 'Cho tất cả cư dân' });
    await post({ title: 'Cho người cao tuổi', audience: { scope: 'group', categories: ['nguoi_cao_tuoi'] } });
    await post({ title: 'Cho trẻ em', audience: { scope: 'group', categories: ['tre_em'] } });
    await post({ title: 'Cho Block A', audience: { scope: 'area', areaIds: [fx.blockA.id] } });
    await post({ title: 'Cho Tổ 1', audience: { scope: 'area', areaIds: [fx.to1.id] }, pinned: true });

    const mine = await request(app).get('/api/posts').set(auth.cu_dan);
    expect(mine.body.items.map((p: { title: string }) => p.title)).toEqual(['Cho Tổ 1', 'Cho người cao tuổi', 'Cho tất cả cư dân']);
    expect((await request(app).get('/api/posts').set(auth.truong_kp)).body.total).toBe(5);
  });

  it('trạng thái đọc: đánh dấu đã đọc một lần, đếm readCount', async () => {
    const created = await post({ attachments: [{ url: 'https://example.com/lich.pdf', name: 'Lịch khám.pdf' }] });
    expect(created.body.attachments[0].name).toBe('Lịch khám.pdf');

    await request(app).post(`/api/posts/${created.body.id}/read`).set(auth.cu_dan).expect(204);
    await request(app).post(`/api/posts/${created.body.id}/read`).set(auth.cu_dan).expect(204);
    const list = await request(app).get('/api/posts').set(auth.cu_dan);
    expect(list.body.items[0]).toMatchObject({ isRead: true, readCount: 1 });
  });

  it('sổ tay phường', async () => {
    await DirectoryModel.create([
      { group: 'khan_cap', unit: 'Cứu hoả', phone: '114', order: 2 },
      { group: 'chinh_quyen', unit: 'Công an khu vực', personInCharge: 'Trần Quốc Huy', phone: '0900000003', order: 1 },
    ]);
    const res = await request(app).get('/api/directory').set(auth.cu_dan);
    expect(res.body.map((d: { unit: string }) => d.unit)).toEqual(['Công an khu vực', 'Cứu hoả']);
  });
});

describe('5. Thu quỹ', () => {
  const createFund = (extra: object = {}) =>
    FundModel.create({ code: 'KHUYEN-HOC', name: 'Khuyến học', defaultAmount: 20_000, period: { type: 'nam', year }, dueDate: `${year}-12-31`, ...extra });

  it('theo người: số tiền = mức × số nhân khẩu; đánh dấu đã đóng → thông báo đến hộ', async () => {
    const fund = await createFund({ unit: 'nguoi' });
    const unpaid = await request(app).get(`/api/funds/${fund.id}/households?filter=chua_dong`).set(auth.truong_kp);
    expect(unpaid.body.items.find((h: { householdCode: string }) => h.householdCode === 'HK-1001').amountDue).toBe(60_000);

    const pay = () =>
      request(app).post(`/api/funds/${fund.id}/payments`).set(auth.truong_kp).send({ householdId: fx.h1.id, method: 'qr', transactionCode: 'FT123' });
    const res = await pay();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ notified: true, payment: { amount: 60_000, status: 'da_dong', transactionCode: 'FT123' } });
    expect((await pay()).status).toBe(409);

    const notes = await request(app).get('/api/notifications').set(auth.cu_dan);
    expect(notes.body[0]).toMatchObject({ kind: 'quy_dan_sinh' });
    const summary = await request(app).get('/api/funds').set(auth.cu_dan);
    expect(summary.body[0]).toMatchObject({ unit: 'nguoi', paidHouseholds: 1, totalHouseholds: 2, collectedAmount: 60_000 });
  });

  it('nhắc hộ chưa đóng', async () => {
    const fund = await createFund();
    await request(app).post(`/api/funds/${fund.id}/payments`).set(auth.truong_kp).send({ householdId: fx.h2.id, method: 'tien_mat' });
    const res = await request(app).post(`/api/funds/${fund.id}/reminders`).set(auth.truong_kp);
    expect(res.body).toEqual({ notified: 1 });
    const notes = await request(app).get('/api/notifications').set(auth.cu_dan);
    expect(notes.body[0]).toMatchObject({ kind: 'nhac_dong_quy', title: 'Nhắc đóng quỹ Khuyến học' });
    expect((await request(app).post(`/api/funds/${fund.id}/reminders`).set(auth.cu_dan)).status).toBe(403);
  });
});

describe('6. Cộng đồng', () => {
  it('khảo sát theo phạm vi khu vực; trả lời một lần, kết quả cộng dồn', async () => {
    const create = (title: string, areaIds: string[]) =>
      request(app).post('/api/surveys').set(auth.truong_kp).send({
        title,
        startDate: `${year}-01-01`,
        endDate: `${year + 1}-12-31`,
        scope: { type: 'area', areaIds },
        questions: [{ text: 'Bạn có đồng ý?', options: ['Đồng ý', 'Không'] }],
      });
    const mineSurvey = await create('Lắp camera Tổ 1', [fx.to1.id]);
    await create('Sửa thang máy Block A', [fx.blockA.id]);

    const visible = await request(app).get('/api/surveys').set(auth.cu_dan);
    expect(visible.body.map((s: { title: string }) => s.title)).toEqual(['Lắp camera Tổ 1']);

    const answer = () => request(app).post(`/api/surveys/${mineSurvey.body.id}/responses`).set(auth.cu_dan).send({ answers: [0] });
    expect((await answer()).body).toMatchObject({ responseCount: 1, results: [[1, 0]], hasResponded: true });
    expect((await answer()).status).toBe(409);
  });

  it('gia đình văn hoá nhúng trong hộ: tự tính số năm liên tiếp', async () => {
    const res = await request(app).put('/api/cultural-families').set(auth.truong_kp).send({ householdId: fx.h1.id, year, result: 'dat' });
    expect(res.body).toMatchObject({ householdCode: 'HK-1001', headName: 'Nguyễn Văn An', consecutiveYears: 2 });
    const list = await request(app).get(`/api/cultural-families?year=${year}&filter=dat`).set(auth.cu_dan);
    expect(list.body.total).toBe(1);
  });

  it('lịch sinh hoạt có biên bản', async () => {
    await request(app).post('/api/activities').set(auth.truong_kp).send({
      title: 'Họp khu phố quý IV', kind: 'hop_khu_pho', date: `${year}-12-01`, startTime: '19:30', location: 'Nhà văn hoá',
      minutes: 'Thống nhất lắp camera đầu hẻm',
    });
    const res = await request(app).get('/api/activities').set(auth.cu_dan);
    expect(res.body[0]).toMatchObject({ title: 'Họp khu phố quý IV', minutes: 'Thống nhất lắp camera đầu hẻm' });
  });
});

describe('An sinh: hộ chính sách / khó khăn', () => {
  it('suy ra từ householdType; cán bộ cập nhật loại hộ + toạ độ', async () => {
    const list = await request(app).get('/api/welfare-households').set(auth.truong_kp);
    expect(list.body.map((h: { code: string }) => h.code)).toEqual(['HK-1002']);

    const res = await request(app)
      .put('/api/welfare-households')
      .set(auth.truong_kp)
      .send({ householdId: fx.h1.id, householdType: 'chinh_sach', location: { lat: 10.8, lng: 106.7 } });
    expect(res.body).toMatchObject({ code: 'HK-1001', householdType: 'chinh_sach', location: { lat: 10.8, lng: 106.7 }, elderlyCount: 1 });
    expect((await request(app).get('/api/welfare-households').set(auth.truong_kp)).body).toHaveLength(2);
  });
});
