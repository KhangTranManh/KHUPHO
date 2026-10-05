/**
 * Đăng nhập DEMO — chỉ dùng khi VITE_AUTH_MODE=demo (VD: bản xem thử trên Vercel chưa có backend).
 * Mật khẩu nằm trong code JavaScript nên ai cũng đọc được → TUYỆT ĐỐI không dùng với dữ liệu thật.
 * Phiên lưu ở sessionStorage: F5 vẫn còn, đóng tab là mất.
 */
import type { AuthUser } from '@/features/auth/types';
import { ApiError } from '@/services/api';

/** `login` = SĐT hoặc email dùng để đăng nhập. Cư dân liên kết hộ HK-1001 trong dữ liệu mẫu. */
export const DEMO_ACCOUNTS: (AuthUser & { login: string; password: string })[] = [
  { id: 'demo-truongkp', login: '0900000002', password: 'TruongKP@2026', role: 'truong_kp', fullName: 'Lê Văn Tổ', phone: '0900000002' },
  { id: 'demo-congan', login: '0900000003', password: 'CongAn@2026', role: 'cong_an_kv', fullName: 'Trần Quốc Huy', phone: '0900000003' },
  { id: 'demo-cudan', login: '0900000004', password: 'CuDan@2026', role: 'cu_dan', fullName: 'Nguyễn Văn An', phone: '0900000004', householdId: 'h1' },
];

const STORAGE_KEY = 'wkp-demo-session';
const LATENCY_MS = 300;

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));

/** Chuẩn hoá giống backend: SĐT bỏ khoảng trắng, +84 → 0; email chữ thường. */
const normalizeLogin = (v: string) =>
  v.includes('@') ? v.trim().toLowerCase() : v.replace(/[\s.()-]/g, '').replace(/^\+84/, '0');

function toUser({ password: _password, login: _login, ...user }: (typeof DEMO_ACCOUNTS)[number]): AuthUser {
  return { ...user, lastLoginAt: new Date().toISOString() };
}

function save(user: AuthUser | null) {
  try {
    if (user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Trình duyệt chặn storage (chế độ riêng tư…) → phiên chỉ sống tới khi tải lại trang.
  }
}

/** Người đang đăng nhập ở chế độ demo (đọc đồng bộ), null nếu chưa. */
export function currentDemoUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export const demoAuth = {
  async login(identifier: string, password: string): Promise<AuthUser> {
    await wait();
    const account = DEMO_ACCOUNTS.find((a) => a.login === normalizeLogin(identifier) && a.password === password);
    if (!account) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng');
    }
    const user = toUser(account);
    save(user);
    return user;
  },

  async restoreSession(): Promise<AuthUser | null> {
    return currentDemoUser();
  },

  async logout() {
    save(null);
  },
};
