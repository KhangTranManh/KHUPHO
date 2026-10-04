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
} as const;
