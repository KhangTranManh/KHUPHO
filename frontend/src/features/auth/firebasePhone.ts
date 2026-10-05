/**
 * Xác minh SĐT bằng OTP SMS của Firebase Authentication.
 * Firebase chỉ dùng để chứng minh người dùng sở hữu SĐT; tài khoản, quyền, phiên đăng nhập vẫn ở backend:
 *   sendOtp(phone) → Firebase gửi SMS → confirmOtp(code) → ID token → backend POST /auth/firebase-login.
 * SDK Firebase chỉ được tải khi dùng tới (không làm nặng bundle chính).
 * Cấu hình đọc từ VITE_FIREBASE_* (config/app.ts).
 */
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { firebaseConfig } from '@/config/app';

let pending: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

async function loadAuth() {
  const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Thiếu cấu hình Firebase trong .env: ${missing.join(', ')}`);

  const [{ initializeApp, getApps }, authSdk] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  auth.languageCode = 'vi';
  return { auth, authSdk };
}

/** "0912 345 678" / "+84912345678" → "+84912345678" (định dạng E.164 Firebase yêu cầu). */
export function toE164(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  return `+84${digits.replace(/^0/, '')}`;
}

/** Gỡ reCAPTCHA đang gắn (gọi khi rời form / gửi lại mã). */
export function resetOtp() {
  verifier?.clear();
  verifier = null;
  pending = null;
}

/**
 * Gửi OTP. reCAPTCHA ẩn (chống bot gửi SMS) gắn vào phần tử `containerId`.
 * Phần tử này phải LUÔN nằm trên trang tới khi xác minh xong — nếu bị gỡ (VD: gắn vào nút rồi nút biến mất
 * khi chuyển bước), reCAPTCHA hết giờ chờ và bật hộp thoại "Không thể kết nối với reCAPTCHA".
 */
export async function sendOtp(phone: string, containerId: string) {
  const { auth, authSdk } = await loadAuth();
  resetOtp();
  verifier = new authSdk.RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  try {
    pending = await authSdk.signInWithPhoneNumber(auth, toE164(phone), verifier);
  } catch (err) {
    resetOtp();
    throw new Error(firebaseMessage(err));
  }
}

/** Kiểm tra OTP; đúng → trả ID token để gửi backend. Không giữ phiên Firebase (đăng xuất ngay). */
export async function confirmOtp(code: string): Promise<string> {
  if (!pending) throw new Error('Vui lòng gửi lại mã xác minh');
  try {
    const credential = await pending.confirm(code.trim());
    const idToken = await credential.user.getIdToken();
    const { auth, authSdk } = await loadAuth();
    await authSdk.signOut(auth);
    resetOtp();
    return idToken;
  } catch (err) {
    throw new Error(firebaseMessage(err));
  }
}

/** Mã lỗi Firebase → thông báo tiếng Việt. */
function firebaseMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  const messages: Record<string, string> = {
    'auth/invalid-phone-number': 'Số điện thoại không hợp lệ',
    'auth/too-many-requests': 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau',
    'auth/invalid-verification-code': 'Mã xác minh không đúng',
    'auth/code-expired': 'Mã xác minh đã hết hạn, vui lòng gửi lại',
    'auth/quota-exceeded': 'Hệ thống tạm hết lượt gửi SMS, vui lòng thử lại sau',
    'auth/captcha-check-failed': 'Xác minh chống bot thất bại, vui lòng tải lại trang',
    'auth/unauthorized-domain': 'Tên miền này chưa được phép trong Firebase (Authorized domains)',
    // Firebase trả cùng mã này khi chưa bật Phone HOẶC khi vùng (Việt Nam) bị chặn trong SMS region policy.
    'auth/operation-not-allowed':
      'Firebase từ chối gửi SMS: kiểm tra Sign-in method › Phone đã bật và Settings › SMS region policy cho phép Việt Nam',
    'auth/billing-not-enabled': 'Gửi SMS thật cần gói Blaze — hãy dùng số điện thoại test trong Firebase',
  };
  const message = messages[code] ?? (err instanceof Error ? err.message : 'Không xác minh được số điện thoại');
  // Kèm mã gốc để tra cứu khi cần (VD: "… [auth/operation-not-allowed]").
  return code && !message.includes(code) ? `${message} [${code}]` : message;
}
