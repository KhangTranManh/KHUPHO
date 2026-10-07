/**
 * Đăng nhập bằng OTP Firebase: backend kiểm tra ID token (chữ ký RS256, aud, iss, hạn) rồi cấp phiên,
 * bắt buộc đặt mật khẩu mới. Dùng cặp khoá tự tạo thay cho khoá công khai của Google.
 */
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { setFirebaseCertsForTesting } from '../src/common/security/firebaseToken.js';
import { env } from '../src/config/env.js';
import { createUser } from '../src/modules/users/user.service.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';

const app = createApp();
const PROJECT = env.FIREBASE_PROJECT_ID!;
const KID = 'test-key';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });

/** Token giống Firebase cấp sau khi nhập đúng OTP. */
function firebaseToken(phone: string, opts: { key?: typeof privateKey; aud?: string; expiresIn?: number } = {}) {
  return jwt.sign({ phone_number: phone }, opts.key ?? privateKey, {
    algorithm: 'RS256',
    keyid: KID,
    audience: opts.aud ?? PROJECT,
    issuer: `https://securetoken.google.com/${opts.aud ?? PROJECT}`,
    subject: 'firebase-uid-1',
    expiresIn: opts.expiresIn ?? 3600,
  });
}
const firebaseLogin = (idToken: string) => request(app).post('/api/auth/firebase-login').send({ idToken });

beforeAll(async () => {
  setFirebaseCertsForTesting({ [KID]: publicKey.export({ type: 'spki', format: 'pem' }).toString() });
  await startTestDb();
});
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  await createUser({ role: 'cu_dan', fullName: 'Người Thử Nghiệm', phone: '0911222333' }); // chưa có mật khẩu
});

describe('POST /auth/firebase-login', () => {
  it('SĐT đã xác minh (+84…) → đăng nhập, bắt buộc đặt mật khẩu mới', async () => {
    const res = await firebaseLogin(firebaseToken('+84911222333'));
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(true);

    const auth = { Authorization: `Bearer ${res.body.accessToken}` };
    const changed = await request(app).post('/api/auth/change-password').set(auth).send({ newPassword: 'MatKhauMoi2026' });
    expect(changed.status).toBe(200);
    const again = await request(app).post('/api/auth/login').send({ identifier: '0911222333', password: 'MatKhauMoi2026' });
    expect(again.status).toBe(200);
  });

  it('SĐT chưa có tài khoản → 404 kèm hướng dẫn', async () => {
    const res = await firebaseLogin(firebaseToken('+84987654321'));
    expect(res.status).toBe(404);
  });

  it('từ chối token giả / sai project / hết hạn', async () => {
    expect((await firebaseLogin(firebaseToken('+84911222333', { key: other.privateKey }))).status).toBe(401);
    expect((await firebaseLogin(firebaseToken('+84911222333', { aud: 'project-khac' }))).status).toBe(401);
    expect((await firebaseLogin(firebaseToken('+84911222333', { expiresIn: -10 }))).status).toBe(401);
    expect((await firebaseLogin('khong-phai-jwt-hop-le-123')).status).toBe(401);
  });
});
