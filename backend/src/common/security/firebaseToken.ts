import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { Errors } from '../errors/AppError.js';

/**
 * Kiểm tra ID token do Firebase Authentication cấp (sau khi người dùng nhập đúng OTP SMS),
 * theo hướng dẫn "Verify ID tokens using a third-party JWT library" của Firebase:
 *  - ký RS256 bằng một trong các khoá công khai của Google (chọn theo `kid`);
 *  - aud = FIREBASE_PROJECT_ID, iss = https://securetoken.google.com/<project>, sub khác rỗng, chưa hết hạn.
 * Không cần firebase-admin hay file khoá bí mật — chỉ cần mã project.
 */
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cache: { certs: Record<string, string>; expiresAt: number } | undefined;

/** Lấy khoá công khai của Google, cache theo Cache-Control max-age (thường vài giờ). */
async function getCerts(): Promise<Record<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Không tải được khoá công khai Firebase (${res.status})`);
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600);
  cache = { certs: (await res.json()) as Record<string, string>, expiresAt: Date.now() + maxAge * 1000 };
  return cache.certs;
}

/** Test: dùng khoá tự tạo thay cho khoá của Google. */
export function setFirebaseCertsForTesting(certs: Record<string, string>) {
  cache = { certs, expiresAt: Number.MAX_SAFE_INTEGER };
}

export const isFirebaseEnabled = () => !!env.FIREBASE_PROJECT_ID;

/** Trả về SĐT đã được Firebase xác minh, dạng E.164 (VD: +84912345678). Token sai → 401. */
export async function verifyFirebasePhoneToken(idToken: string): Promise<string> {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) throw Errors.badRequest('Chưa cấu hình đăng nhập bằng Firebase (FIREBASE_PROJECT_ID)');

  const kid = jwt.decode(idToken, { complete: true })?.header.kid;
  const key = kid ? (await getCerts())[kid] : undefined;
  if (!key) throw Errors.unauthorized('Mã xác minh không hợp lệ, vui lòng thử lại');

  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(idToken, key, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    }) as jwt.JwtPayload;
  } catch {
    throw Errors.unauthorized('Mã xác minh không hợp lệ hoặc đã hết hạn, vui lòng thử lại');
  }

  const phone = claims.phone_number as string | undefined;
  if (!claims.sub || !phone) throw Errors.unauthorized('Mã xác minh không chứa số điện thoại');
  return phone;
}
