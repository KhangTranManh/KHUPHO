import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { FundModel } from '../src/modules/funds/fund.model.js';
import type { Role } from '../src/modules/users/user.roles.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { CITIZEN_CCCD, seedHouseholds } from './helpers/fixtures.js';
import { createTestUser, loginBody } from './helpers/users.js';

const app = createApp();
const year = new Date().getFullYear();

beforeAll(startTestDb);
afterAll(stopTestDb);

let auth: Record<Role, { Authorization: string }>;
let fx: Awaited<ReturnType<typeof seedHouseholds>>;

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

/** [method, path, body] */
type Call = [method: 'get' | 'post' | 'put', path: string, body?: object];

const call = (role: Role, [method, path, body]: Call) => {
  const req = request(app)[method](path).set(auth[role]);
  return body ? req.send(body) : req;
};

describe('Phân quyền 3 vai trò', () => {
  /** Dân cư + phản ánh: trưởng KP và công an. */
  const STAFF: Call[] = [
    ['get', '/api/residents'],
    ['get', '/api/households'],
    ['get', '/api/areas'],
    ['get', '/api/changes'],
    ['get', '/api/dashboard/police'],
  ];
  /** Quản lý thông báo, quỹ, cộng đồng, an sinh: chỉ trưởng KP. */
  const LEADER: Call[] = [
    ['get', '/api/dashboard/officer'],
    ['get', '/api/welfare-households'],
    ['post', '/api/posts', { kind: 'thong_bao_nhanh', category: 'rac', title: 'Lịch thu gom rác', content: 'Thu gom rác lúc 18 giờ hằng ngày' }],
    ['post', '/api/directory', { group: 'khu_pho', unit: 'Trưởng khu phố', phone: '0900000002' }],
    ['post', '/api/activities', { title: 'Họp khu phố quý IV', kind: 'hop_khu_pho', date: `${year}-12-01`, startTime: '19:30', location: 'Nhà văn hoá' }],
  ];

  it.each(STAFF)('%s %s: trưởng KP + công an được, cư dân bị chặn', async (...c) => {
    expect((await call('truong_kp', c)).status).toBe(200);
    expect((await call('cong_an_kv', c)).status).toBe(200);
    expect((await call('cu_dan', c)).status).toBe(403);
  });

  it.each(LEADER)('%s %s: chỉ trưởng KP', async (...c) => {
    expect((await call('truong_kp', c)).status).toBeLessThan(300);
    expect((await call('cong_an_kv', c)).status).toBe(403);
    expect((await call('cu_dan', c)).status).toBe(403);
  });

  it('quỹ: công an không xem được danh sách thu', async () => {
    const fund = await FundModel.create({ code: 'KHUYEN-HOC', name: 'Khuyến học', defaultAmount: 20_000, period: { type: 'nam', year } });
    expect((await call('truong_kp', ['get', `/api/funds/${fund.id}/households`])).status).toBe(200);
    expect((await call('cong_an_kv', ['get', `/api/funds/${fund.id}/households`])).status).toBe(403);
  });

  it('dashboard cư dân chỉ dành cho cư dân', async () => {
    expect((await call('cu_dan', ['get', '/api/dashboard/resident'])).status).toBe(200);
    expect((await call('truong_kp', ['get', '/api/dashboard/resident'])).status).toBe(403);
  });

  it('công an xử lý được phản ánh', async () => {
    const created = await call('cu_dan', ['post', '/api/reports', {
      category: 'lua_dao', title: 'Cuộc gọi lừa đảo', description: 'Giả danh công an yêu cầu chuyển tiền', address: '12 Lê Lợi',
    }]);
    const res = await request(app).patch(`/api/reports/${created.body.id}`).set(auth.cong_an_kv).send({ status: 'dang_xu_ly' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dang_xu_ly');
  });
});

describe('GET /api/dashboard/police', () => {
  it('SOS, phản ánh chưa xong (giao công an + khẩn trước), tạm trú / tạm vắng', async () => {
    await call('cu_dan', ['post', '/api/sos', {}]);
    await call('cu_dan', ['post', '/api/reports', { category: 'hu_hong_dan_sinh', title: 'Đèn đường hỏng', description: 'Đèn tắt cả tuần nay rồi', address: 'Hẻm 120' }]);
    await call('cu_dan', ['post', '/api/reports', { category: 'trom_cap', severity: 'khan', title: 'Mất trộm xe máy', description: 'Mất xe trước nhà lúc 2h sáng', address: '12 Lê Lợi' }]);

    const d = (await call('cong_an_kv', ['get', '/api/dashboard/police'])).body;
    expect(d.openSosCount).toBe(1);
    expect(d.newReportCount).toBe(2);
    expect(d.openByType).toMatchObject({ an_ninh: 1, hu_hong_dan_sinh: 1, sos: 1 });
    expect(d.pendingReports.map((r: { title: string }) => r.title)).toEqual(['Mất trộm xe máy', 'Đèn đường hỏng']);
    expect(d.temporaryResidents).toBe(1);
    expect(d.temporaryAbsent).toBe(1);
    expect(d.recentTemporary.map((t: { fullName: string }) => t.fullName).sort()).toEqual(['Lê Minh Đức', 'Trần Thị Bình']);
    expect(d.recentTemporary.find((t: { fullName: string }) => t.fullName === 'Lê Minh Đức')).toMatchObject({
      householdCode: 'HK-1001', residenceTo: '2026-12-31', note: 'Thuê trọ đi làm',
    });
    expect(d.areas.find((a: { name: string }) => a.name === 'Tổ 1')).toMatchObject({ temporaryResidents: 1 });
  });
});

describe('GET /api/dashboard/resident', () => {
  it('hộ của mình, phản ánh của mình, quỹ chưa đóng, khảo sát, thông báo', async () => {
    const fund = await FundModel.create({ code: 'KHUYEN-HOC', name: 'Khuyến học', defaultAmount: 20_000, unit: 'nguoi', period: { type: 'nam', year }, dueDate: `${year}-12-31` });
    await FundModel.create({ code: 'BIEN-DAO', name: 'Vì biển đảo', defaultAmount: 15_000, period: { type: 'nam', year } });
    await call('truong_kp', ['post', `/api/funds/${fund.id}/payments`, { householdId: fx.h1.id, method: 'tien_mat' }]);
    await call('cu_dan', ['post', '/api/reports', { category: 'ngap_nuoc', title: 'Ngập sâu sau mưa', description: 'Nước ngập ngang gối trong hẻm', address: 'Hẻm 120' }]);
    await call('truong_kp', ['post', '/api/surveys', {
      title: 'Lắp camera an ninh', startDate: `${year}-01-01`, endDate: `${year + 1}-12-31`,
      questions: [{ text: 'Đồng ý?', options: ['Có', 'Không'] }],
    }]);
    await call('truong_kp', ['post', '/api/posts', { kind: 'thong_bao_nhanh', category: 'rac', title: 'Lịch thu gom rác', content: 'Thu gom rác lúc 18 giờ hằng ngày' }]);

    const d = (await call('cu_dan', ['get', '/api/dashboard/resident'])).body;
    expect(d.household).toMatchObject({ code: 'HK-1001', memberCount: 3 });
    expect(d.household.members.map((m: { fullName: string }) => m.fullName)).toContain('Nguyễn Văn An');
    expect(d.myReports).toHaveLength(1);
    expect(d.openReportCount).toBe(1);
    expect(d.unpaidFunds).toEqual([expect.objectContaining({ name: 'Vì biển đảo', amountDue: 15_000 })]);
    expect(d.openSurveys).toEqual([expect.objectContaining({ title: 'Lắp camera an ninh' })]);
    expect(d.latestPosts[0]).toMatchObject({ title: 'Lịch thu gom rác', isRead: false });
    expect(d.unreadPostCount).toBe(1);
    expect(d.notifications[0]).toMatchObject({ kind: 'quy_dan_sinh' });
  });
});
