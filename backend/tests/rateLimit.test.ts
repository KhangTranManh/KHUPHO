/**
 * Rate limit + giới hạn phiên: bật thật (các file test khác tắt) với ngưỡng nhỏ để kiểm tra nhanh.
 * Mỗi test giả lập một IP riêng qua X-Forwarded-For (TRUST_PROXY=true) để bộ đếm không lẫn nhau.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  Object.assign(process.env, {
    RATE_LIMIT_ENABLED: 'true',
    TRUST_PROXY: 'true',
    API_RATE_LIMIT: '40',
    WRITE_RATE_LIMIT: '5',
    LOGIN_RATE_LIMIT: '3',
    MAX_SESSIONS_PER_USER: '2',
    CLIENT_IP_HEADER: 'x-vercel-forwarded-for,cf-connecting-ip',
  });
});

const { createApp } = await import('../src/app.js');
const { SessionModel } = await import('../src/modules/auth/session.model.js');
const { startTestDb, stopTestDb } = await import('./helpers/db.js');
const { createTestUser, loginBody } = await import('./helpers/users.js');

const app = createApp();
let ipSeq = 0;
const newIp = () => `203.0.113.${++ipSeq}`;

beforeAll(startTestDb);
afterAll(stopTestDb);

describe('Rate limit', () => {
  it('đăng nhập: quá LOGIN_RATE_LIMIT lần / 15 phút / IP → 429', async () => {
    const ip = newIp();
    const tryLogin = (i: number) =>
      request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({ identifier: `09000099${i}0`, password: 'Sai12345' });
    for (let i = 0; i < 3; i++) expect((await tryLogin(i)).status).toBe(401);
    const blocked = await tryLogin(9);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    // IP khác không bị ảnh hưởng.
    expect((await request(app).post('/api/auth/login').set('X-Forwarded-For', newIp()).send(loginBody('cu_dan'))).status).toBe(401);
  });

  it('API ghi dữ liệu: quá WRITE_RATE_LIMIT lần / phút / IP → 429', async () => {
    const ip = newIp();
    const post = () => request(app).post('/api/auth/logout').set('X-Forwarded-For', ip);
    for (let i = 0; i < 5; i++) expect((await post()).status).toBe(204);
    expect((await post()).status).toBe(429);
    // Đọc (GET) vẫn được — giới hạn ghi tách riêng.
    expect((await request(app).get('/api/auth/me').set('X-Forwarded-For', ip)).status).toBe(401);
  });

  it('mọi API: quá API_RATE_LIMIT lần / phút / IP → 429; /health không bị giới hạn', async () => {
    const ip = newIp();
    const statuses = [];
    for (let i = 0; i < 41; i++) statuses.push((await request(app).get('/api/auth/me').set('X-Forwarded-For', ip)).status);
    expect(statuses.slice(0, 40).every((s) => s === 401)).toBe(true);
    expect(statuses[40]).toBe(429);

    for (let i = 0; i < 45; i++) expect((await request(app).get('/api/health').set('X-Forwarded-For', ip)).status).toBe(200);
  });
});

describe('IP thật sau Cloudflare (CLIENT_IP_HEADER)', () => {
  it('lấy IP từ CF-Connecting-IP, bỏ qua giá trị không phải IP', async () => {
    const ok = await request(app).get('/api/health').set('CF-Connecting-IP', '198.51.100.7');
    expect(ok.body.clientIp).toBe('198.51.100.7');
    // Đi qua Vercel: x-vercel-forwarded-for (IP người dùng) được ưu tiên hơn cf-connecting-ip (IP của Vercel).
    const viaVercel = await request(app).get('/api/health').set('x-vercel-forwarded-for', '198.51.100.9').set('CF-Connecting-IP', '76.76.21.21');
    expect(viaVercel.body.clientIp).toBe('198.51.100.9');
    const bad = await request(app).get('/api/health').set('CF-Connecting-IP', 'khong-phai-ip');
    expect(bad.body.clientIp).not.toBe('khong-phai-ip');
  });

  it('rate limit tính theo IP thật: người này bị chặn không ảnh hưởng người khác', async () => {
    const tryLogin = (ip: string) =>
      request(app).post('/api/auth/login').set('CF-Connecting-IP', ip).send({ identifier: '0900009999', password: 'Sai12345' });
    for (let i = 0; i < 3; i++) await tryLogin('198.51.100.20');
    expect((await tryLogin('198.51.100.20')).status).toBe(429);
    expect((await tryLogin('198.51.100.21')).status).toBe(401);
  });
});

describe('Giới hạn phiên', () => {
  it('đăng nhập nhiều lần → chỉ giữ MAX_SESSIONS_PER_USER phiên mới nhất', async () => {
    const user = await createTestUser('truong_kp');
    const tokens: string[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/auth/login').set('X-Forwarded-For', newIp()).send(loginBody('truong_kp'));
      expect(res.status).toBe(200);
      tokens.push(res.body.accessToken);
    }
    expect(await SessionModel.countDocuments({ userId: user.id, revokedAt: null })).toBe(2);
    expect(await SessionModel.countDocuments({ userId: user.id, revokedReason: 'session_limit' })).toBe(2);

    // Phiên cũ nhất đã bị thu hồi, phiên mới nhất vẫn dùng được.
    const me = (t: string) => request(app).get('/api/auth/me').set('X-Forwarded-For', newIp()).set('Authorization', `Bearer ${t}`);
    expect((await me(tokens[0])).status).toBe(401);
    expect((await me(tokens[3])).status).toBe(200);
  });
});
