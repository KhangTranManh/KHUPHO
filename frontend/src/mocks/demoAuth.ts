/**
 * Đăng nhập DEMO — chỉ dùng khi VITE_AUTH_MODE=demo (VD: bản xem thử trên Vercel chưa có backend).
 * Mật khẩu nằm trong code JavaScript nên ai cũng đọc được → TUYỆT ĐỐI không dùng với dữ liệu thật.
 * Phiên lưu ở sessionStorage: F5 vẫn còn, đóng tab là mất.
 */
import type { AuthUser, TempPasswordResult } from '@/features/auth/types';
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

/** Mật khẩu tạm đang chờ dùng (theo SĐT) — chỉ sống trong tab hiện tại. */
const tempPasswords = new Map<string, string>();

export const demoAuth = {
  async login(identifier: string, password: string): Promise<AuthUser> {
    await wait();
    const login = normalizeLogin(identifier);
    const account = DEMO_ACCOUNTS.find((a) => a.login === login);
    const viaTemp = !!account && tempPasswords.get(login) === password.trim().toUpperCase();
    if (!account || (account.password !== password && !viaTemp)) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng');
    }
    tempPasswords.delete(login);
    const user = { ...toUser(account), mustChangePassword: viaTemp };
    save(user);
    return user;
  },

  /** Như backend với SMS mock: không gửi thật, trả mật khẩu tạm để hiện trên màn hình. */
  async requestTempPassword(phone: string): Promise<TempPasswordResult> {
    await wait();
    const login = normalizeLogin(phone);
    const message = 'Nếu số điện thoại đã đăng ký với khu phố, mật khẩu tạm sẽ được gửi qua SMS trong giây lát.';
    if (!DEMO_ACCOUNTS.some((a) => a.login === login)) return { message };
    const temp = Array.from({ length: 8 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
    tempPasswords.set(login, temp);
    return { message, devTempPassword: temp };
  },

  /** Demo không lưu mật khẩu mới (tải lại trang vẫn dùng mật khẩu mẫu) — chỉ bỏ cờ bắt buộc đổi. */
  async changePassword(newPassword: string, currentPassword?: string): Promise<AuthUser> {
    await wait();
    const user = currentDemoUser();
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn');
    const account = DEMO_ACCOUNTS.find((a) => a.id === user.id);
    if (!user.mustChangePassword && currentPassword !== account?.password) {
      throw new ApiError(400, 'BAD_REQUEST', 'Mật khẩu hiện tại không đúng');
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Mật khẩu ít nhất 8 ký tự, có cả chữ và số');
    }
    const updated = { ...user, mustChangePassword: false };
    save(updated);
    return updated;
  },

  async restoreSession(): Promise<AuthUser | null> {
    return currentDemoUser();
  },

  async logout() {
    save(null);
  },
};
