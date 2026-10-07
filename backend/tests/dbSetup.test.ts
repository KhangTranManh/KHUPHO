/**
 * Kiểm tra công cụ database (database/scripts): khởi tạo đủ các bước trên DB in-memory,
 * dữ liệu mẫu hợp lệ và dùng được qua API thật; db:check bắt được lỗi; sao lưu / khôi phục.
 */
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { backupDatabase, countCollections, restoreDatabase } from '../../database/scripts/lib/backup.js';
import { runChecks } from '../../database/scripts/lib/checks.js';
import { seedDemo } from '../../database/scripts/seeds/demo/index.js';
import { seedReference } from '../../database/scripts/seeds/reference.js';
import { syncSchema } from '../../database/scripts/seeds/schema.js';
import { seedUsers } from '../../database/scripts/seeds/users.js';
import { createApp } from '../src/app.js';
import { decryptField } from '../src/common/security/fieldEncryption.js';
import { HouseholdModel } from '../src/modules/households/household.model.js';
import { ReportModel } from '../src/modules/reports/report.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { startTestDb, stopTestDb } from './helpers/db.js';

const PASSWORDS = { SEED_TRUONG_KP_PASSWORD: 'TruongKP@2026', SEED_CONG_AN_KV_PASSWORD: 'CongAn@2026', SEED_CU_DAN_PASSWORD: 'CuDan@2026' };
/** Tài khoản chưa kích hoạt (đăng nhập lần đầu bằng mật khẩu tạm). */
const FIRST_LOGIN = '0911000001:truong_kp,0911000002:cu_dan:Cư Dân Thử';

beforeAll(async () => {
  Object.assign(process.env, PASSWORDS, { SEED_FIRST_LOGIN: FIRST_LOGIN });
  await startTestDb();
  await mongoose.connection.dropDatabase();
  const log = console.log;
  console.log = () => {};
  console.table = () => {};
  try {
    await syncSchema();
    await seedReference();
    await seedUsers();
    await seedDemo();
  } finally {
    console.log = log;
  }
}, 120_000);
afterAll(stopTestDb);

const login = async (phone: string, password: string) => {
  const res = await request(createApp()).post('/api/auth/login').send({ identifier: phone, password });
  return { Authorization: `Bearer ${res.body.accessToken}` };
};

describe('db:setup --demo', () => {
  it('tạo đủ collection của mọi model', async () => {
    const names = new Set((await mongoose.connection.listCollections()).map((c) => c.name));
    for (const model of Object.values(mongoose.models)) expect(names).toContain(model.collection.collectionName);
  });

  it('mã hoá dữ liệu cá nhân trong DB', async () => {
    const raw = await HouseholdModel.collection.findOne({ code: 'HK-1001' });
    const head = raw!.members[0];
    expect(head.fullName).toMatch(/^v1\./);
    expect(head.citizenId).toMatch(/^v1\./);
    expect(decryptField(head.fullName)).toBe('Nguyễn Văn An');
  });

  it('tài khoản cư dân tự liên kết hộ đầu tiên theo SĐT', async () => {
    const resident = await UserModel.findOne({ role: 'cu_dan' });
    const household = await HouseholdModel.findOne({ code: 'HK-1001' });
    expect(resident!.residentRef?.householdId.toString()).toBe(household!._id.toString());
  });

  it('mã phản ánh nối tiếp bộ đếm — phản ánh mới tạo qua API không trùng mã', async () => {
    const before = await ReportModel.countDocuments();
    const auth = await login('0900000004', PASSWORDS.SEED_CU_DAN_PASSWORD);
    const res = await request(createApp())
      .post('/api/reports')
      .set(auth)
      .send({ category: 'hu_hong_dan_sinh', title: 'Ổ gà trước nhà', description: 'Ổ gà sâu giữa hẻm, xe dễ té', address: 'Hẻm 120 Lê Lợi' });
    expect(res.status).toBe(201);
    expect(await ReportModel.countDocuments()).toBe(before + 1);
  });

  it('3 dashboard đọc được dữ liệu mẫu', async () => {
    const app = createApp();
    const leader = await request(app).get('/api/dashboard/officer').set(await login('0900000002', PASSWORDS.SEED_TRUONG_KP_PASSWORD));
    const police = await request(app).get('/api/dashboard/police').set(await login('0900000003', PASSWORDS.SEED_CONG_AN_KV_PASSWORD));
    const resident = await request(app).get('/api/dashboard/resident').set(await login('0900000004', PASSWORDS.SEED_CU_DAN_PASSWORD));

    expect([leader.status, police.status, resident.status]).toEqual([200, 200, 200]);
    expect(police.body.openSosCount).toBeGreaterThan(0);
    expect(resident.body.household.code).toBe('HK-1001');
    expect(resident.body.myReports.length).toBeGreaterThan(0);
    expect(resident.body.unpaidFunds.length).toBeGreaterThan(0);
    expect(resident.body.openSurveys.length).toBe(2);
  });

  it('tài khoản đăng nhập lần đầu: chưa có mật khẩu, cư dân liên kết hộ HK-1002', async () => {
    const users = await UserModel.find({ role: { $in: ['truong_kp', 'cu_dan'] } }).select('+passwordHash');
    const pending = users.filter((u) => !u.passwordHash);
    expect(pending).toHaveLength(2);
    const resident = pending.find((u) => u.role === 'cu_dan')!;
    const household = await HouseholdModel.findOne({ code: 'HK-1002' });
    expect(resident.residentRef?.householdId.toString()).toBe(household!._id.toString());
  });

  it('chạy lại an toàn: không nhân đôi dữ liệu', async () => {
    const count = async () => [await HouseholdModel.countDocuments(), await UserModel.countDocuments()];
    const before = await count();
    const log = console.log;
    console.log = () => {};
    await seedReference();
    await seedUsers();
    await seedDemo();
    console.log = log;
    expect(await count()).toEqual(before);
  });

  it('db:check — dữ liệu mẫu không có lỗi', async () => {
    const failed = (await runChecks()).filter((c) => c.level === 'error' && c.issues.length);
    expect(failed).toEqual([]);
  });

  it('db:check — phát hiện hộ có 2 chủ hộ và dữ liệu giải mã không được', async () => {
    const h = await HouseholdModel.collection.findOne({ code: 'HK-1003' });
    const original = h!.members;
    await HouseholdModel.collection.updateOne({ _id: h!._id }, { $set: { 'members.$[].relation': 'chu_ho' } });
    await HouseholdModel.collection.updateOne({ _id: h!._id }, { $set: { 'members.0.fullName': 'v1.aaa.bbb.ccc' } });
    try {
      const results = await runChecks();
      const issues = (title: string) => results.find((c) => c.title.startsWith(title))!.issues;
      expect(issues('Mỗi hộ có đúng một chủ hộ').some((i) => i.startsWith('HK-1003'))).toBe(true);
      expect(issues('Khoá mã hoá').some((i) => i.startsWith('HK-1003'))).toBe(true);
    } finally {
      await HouseholdModel.collection.updateOne({ _id: h!._id }, { $set: { members: original } });
    }
  });

  it('db:backup → xoá DB → db:restore khôi phục nguyên trạng', async () => {
    const before = await countCollections();
    const dir = await backupDatabase(await mkdtemp(join(tmpdir(), 'khupho-backup-')));
    await mongoose.connection.dropDatabase();
    expect(await HouseholdModel.countDocuments()).toBe(0);

    await restoreDatabase(dir);
    expect(await countCollections()).toEqual(before);
    // Dữ liệu mã hoá + hash mật khẩu còn dùng được sau khôi phục.
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ identifier: '0900000004', password: PASSWORDS.SEED_CU_DAN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe('Nguyễn Văn An');
  });
});
