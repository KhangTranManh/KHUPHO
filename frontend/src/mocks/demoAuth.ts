/**
 * Đăng nhập DEMO — chỉ dùng khi VITE_AUTH_MODE=demo (VD: bản xem thử trên Vercel chưa có backend).
 * Mật khẩu nằm trong code JavaScript nên ai cũng đọc được → TUYỆT ĐỐI không dùng với dữ liệu thật.
 * Phiên lưu ở sessionStorage: F5 vẫn còn, đóng tab là mất.
 */
import type { AuthUser } from '@/features/auth/types';
import { ApiError } from '@/services/api';

export const DEMO_ACCOUNTS: (AuthUser & { password: string })[] = [
  { id: 'demo-admin', username: 'admin', password: 'Admin@2026', role: 'admin', fullName: 'Quản trị hệ thống' },
  { id: 'demo-officer', username: 'canbo01', password: 'Canbo@2026', role: 'can_bo', fullName: 'Trần Quốc Huy' },
  {
    id: 'demo-citizen',
    username: '001099012345',
    password: 'Dan@2026',
    role: 'nguoi_dan',
    fullName: 'Nguyễn Văn An',
    citizenId: '001099012345',
  },
];

const STORAGE_KEY = 'wkp-demo-session';
const LATENCY_MS = 300;

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));

function toUser({ password: _password, ...user }: (typeof DEMO_ACCOUNTS)[number]): AuthUser {
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

export const demoAuth = {
  async login(username: string, password: string): Promise<AuthUser> {
    await wait();
    const account = DEMO_ACCOUNTS.find(
      (a) => a.username === username.trim().toLowerCase() && a.password === password,
    );
    if (!account) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng');
    }
    const user = toUser(account);
    save(user);
    return user;
  },

  async restoreSession(): Promise<AuthUser | null> {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  async logout() {
    save(null);
  },
};
