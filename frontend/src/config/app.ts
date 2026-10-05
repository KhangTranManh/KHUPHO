/** Cấu hình chung đọc từ biến môi trường (xem .env.example ở thư mục gốc). */
export const appConfig = {
  name: import.meta.env.VITE_APP_NAME ?? 'Quản lý dân cư',
  shortName: 'Khu phố số',
  subtitle: 'Hệ thống quản lý nhân khẩu – hộ khẩu',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  /** Dùng dữ liệu mẫu trong src/mocks thay cho API. Tắt bằng VITE_USE_MOCK=false. */
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  /** VITE_AUTH_MODE=demo: đăng nhập bằng tài khoản mẫu ngay trên trình duyệt, không cần backend. Chỉ để xem thử. */
  demoAuth: import.meta.env.VITE_AUTH_MODE === 'demo',
  /**
   * Đăng nhập lần đầu / quên mật khẩu:
   *   firebase = OTP SMS qua Firebase (cần VITE_FIREBASE_* và backend có FIREBASE_PROJECT_ID);
   *   khác     = mật khẩu tạm do backend gửi (SMS mock).
   * Chế độ demo luôn dùng mật khẩu tạm.
   */
  phoneAuth:
    import.meta.env.VITE_PHONE_AUTH === 'firebase' && import.meta.env.VITE_AUTH_MODE !== 'demo' ? 'firebase' : 'temp_password',
} as const;

/** Cấu hình Firebase — chỉ đọc từ .env (VITE_FIREBASE_*), không ghi cứng trong code. */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
