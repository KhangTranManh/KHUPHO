/**
 * Tự xác nhận đóng quỹ qua chuyển khoản: webhook SePay → đọc "QKP <mã quỹ> <số hộ>" → ghi đã đóng.
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { BankTransactionModel } from '../src/modules/funds/bankTransaction.model.js';
import { FundModel } from '../src/modules/funds/fund.model.js';
import { FundPaymentModel } from '../src/modules/funds/fundPayment.model.js';
import { buildTransferContent, extractReference, householdCandidates } from '../src/modules/funds/transferContent.js';
import { NotificationModel } from '../src/modules/notifications/notification.model.js';
import type { Role } from '../src/modules/users/user.roles.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { CITIZEN_CCCD, seedHouseholds } from './helpers/fixtures.js';
import { createTestUser, loginBody } from './helpers/users.js';

const app = createApp();
const KEY = process.env.BANK_WEBHOOK_API_KEY!;
let fundId: string;
let auth: Record<'truong_kp' | 'cu_dan', { Authorization: string }>;
let txSeq = 0;

const webhook = (body: Record<string, unknown>, key = KEY) =>
  request(app)
    .post('/api/payments/sepay-webhook')
    .set('Authorization', `Apikey ${key}`)
    .send({
      id: ++txSeq,
      gateway: 'MBBank',
      transactionDate: '2026-10-05 14:02:37',
      accountNumber: '0123456789',
      transferType: 'in',
      referenceCode: `FT${txSeq}`,
      ...body,
    });

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  await seedHouseholds();
  const fund = await FundModel.create({
    code: 'VI-NGUOI-NGHEO',
    name: 'Vì người nghèo',
    defaultAmount: 45_000,
    unit: 'ho',
    period: { type: 'nam', year: 2026 },
  });
  fundId = fund.id;
  const entries = await Promise.all(
    (['truong_kp', 'cu_dan'] as Role[]).map(async (role) => {
      await createTestUser(role, role === 'cu_dan' ? { citizenId: CITIZEN_CCCD } : {});
      const res = await request(app).post('/api/auth/login').send(loginBody(role));
      return [role, { Authorization: `Bearer ${res.body.accessToken}` }] as const;
    }),
  );
  auth = Object.fromEntries(entries) as typeof auth;
});

describe('Nội dung chuyển khoản', () => {
  it('tạo dạng chữ in hoa không dấu, đọc lại được dù ngân hàng thêm bớt ký tự', () => {
    expect(buildTransferContent('VI-NGUOI-NGHEO', 'HK-1001')).toBe('QKP VINGUOINGHEO HK1001');
    for (const content of ['QKP VINGUOINGHEO HK1001', 'MBVCB.3312.QKP VINGUOINGHEO HK1001.CT tu 0123', 'qkpvinguoingheohk1001']) {
      expect(extractReference(content)?.startsWith('VINGUOINGHEOHK1001')).toBe(true);
    }
    expect(extractReference('chuyen tien quy')).toBeNull();
    // Ngân hàng nối số ngay sau số hộ → thử từ dài tới ngắn, có cả dạng có dấu "-".
    expect(householdCandidates('HK1001CTTU')).toEqual(['HK1001', 'HK-1001', 'HK100', 'HK-100', 'HK10', 'HK-10']);
    expect(householdCandidates('HK10010123')).toContain('HK-1001');
  });
});

describe('GET /funds/:id/my-payment', () => {
  it('cư dân nhận số tiền + nội dung chuyển khoản của hộ mình', async () => {
    const res = await request(app).get(`/api/funds/${fundId}/my-payment`).set(auth.cu_dan);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ householdCode: 'HK-1001', amountDue: 45_000, transferContent: 'QKP VINGUOINGHEO HK1001', autoConfirm: true });
    expect(res.body.payment).toBeUndefined();
  });

  it('tài khoản chưa liên kết hộ → 400', async () => {
    expect((await request(app).get(`/api/funds/${fundId}/my-payment`).set(auth.truong_kp)).status).toBe(400);
  });
});

describe('POST /payments/sepay-webhook', () => {
  it('sai API key → 401, không ghi gì', async () => {
    const res = await webhook({ transferAmount: 45_000, content: 'QKP VINGUOINGHEO HK1001' }, 'sai-khoa-'.padEnd(32, 'x'));
    expect(res.status).toBe(401);
    expect(await BankTransactionModel.countDocuments()).toBe(0);
  });

  it('chuyển đúng → tự ghi đã đóng, báo hộ; cư dân và trưởng KP thấy ngay', async () => {
    const res = await webhook({ transferAmount: 45_000, content: 'MBVCB.123.QKP VINGUOINGHEO HK1001.CT tu NGUYEN VAN AN' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'matched', householdCode: 'HK-1001' });

    const payment = await FundPaymentModel.findOne({ status: 'da_dong' });
    expect(payment?.toObject()).toMatchObject({ householdCode: 'HK-1001', amount: 45_000, method: 'qr', transactionCode: expect.stringMatching(/^FT\d+$/) });
    expect(await NotificationModel.countDocuments({ kind: 'quy_dan_sinh' })).toBe(1);

    const mine = await request(app).get(`/api/funds/${fundId}/my-payment`).set(auth.cu_dan);
    expect(mine.body.payment.status).toBe('da_dong');
    const list = await request(app).get(`/api/funds/${fundId}/households?filter=da_dong`).set(auth.truong_kp);
    expect(list.body.items.map((h: { householdCode: string }) => h.householdCode)).toEqual(['HK-1001']);
  });

  it('SePay gửi lại cùng giao dịch → không ghi lần hai', async () => {
    const body = { id: 999, transferAmount: 45_000, content: 'QKP VINGUOINGHEO HK1001' };
    await webhook(body);
    const again = await webhook(body);
    expect(again.body.status).toBe('duplicate');
    expect(await FundPaymentModel.countDocuments()).toBe(1);
    expect(await BankTransactionModel.countDocuments()).toBe(1);
  });

  it('chuyển thiếu / chuyển trùng / sai nội dung → lưu để đối soát, không ghi đã đóng sai', async () => {
    expect((await webhook({ transferAmount: 20_000, content: 'QKP VINGUOINGHEO HK1001' })).body.status).toBe('underpaid');
    expect(await FundPaymentModel.countDocuments({ status: 'da_dong' })).toBe(0);

    expect((await webhook({ transferAmount: 45_000, content: 'QKP VINGUOINGHEO HK1001' })).body.status).toBe('matched');
    expect((await webhook({ transferAmount: 45_000, content: 'QKP VINGUOINGHEO HK1001' })).body.status).toBe('already_paid');
    expect((await webhook({ transferAmount: 50_000, content: 'ung ho quy' })).body.status).toBe('unmatched');
    expect(await FundPaymentModel.countDocuments({ status: 'da_dong' })).toBe(1);

    // Nội dung (có thể chứa tên người chuyển) được mã hoá trong DB, trả bản rõ cho trưởng KP.
    const raw = await BankTransactionModel.collection.findOne({ status: 'unmatched' });
    expect(raw!.content).toMatch(/^v1./);

    const issues = await request(app).get('/api/funds/bank-transactions').set(auth.truong_kp);
    expect(issues.body.find((t: { status: string }) => t.status === 'unmatched').content).toBe('ung ho quy');
    expect(issues.body.map((t: { status: string }) => t.status).sort()).toEqual(['already_paid', 'underpaid', 'unmatched']);
    expect((await request(app).get('/api/funds/bank-transactions').set(auth.cu_dan)).status).toBe(403);
  });

  it('số hộ bị ngân hàng nối liền chữ số phía sau vẫn khớp', async () => {
    const res = await webhook({ transferAmount: 45_000, content: 'QKP VINGUOINGHEO HK1001 0123456' });
    expect(res.body).toMatchObject({ status: 'matched', householdCode: 'HK-1001' });
  });

  it('tiền ra (transferType = out) → bỏ qua', async () => {
    const res = await webhook({ transferType: 'out', transferAmount: 45_000, content: 'QKP VINGUOINGHEO HK1001' });
    expect(res.body.status).toBe('ignored');
    expect(await BankTransactionModel.countDocuments()).toBe(0);
  });
});
