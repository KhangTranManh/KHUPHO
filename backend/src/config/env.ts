import { config as loadDotenv } from 'dotenv';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Đọc .env ở thư mục gốc dự án (file cấu hình chung). Nếu có backend/.env thì giá trị trong đó được ưu tiên.
// Biến môi trường thật (đặt trên server / CI) luôn được ưu tiên hơn cả hai file.
const backendDir = fileURLToPath(new URL('../..', import.meta.url));
loadDotenv({ path: [join(backendDir, '.env'), join(backendDir, '..', '.env')], quiet: true });

/**
 * Biến môi trường được kiểm tra một lần lúc khởi động.
 * Thiếu / sai → dừng ngay với thông báo rõ ràng, thay vì lỗi mơ hồ lúc chạy.
 * Code khác chỉ đọc cấu hình qua `env`, không đọc trực tiếp process.env.
 */
const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  MONGODB_URI: z.string().min(1),
  /** Tên database của hệ thống — luôn dùng tên này, kể cả khi chuỗi kết nối không ghi tên DB. */
  /** Thời gian chờ chọn server khi kết nối (ms). Atlas từ Việt Nam lần đầu có thể > 5 giây. */
  MONGODB_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  /** Số kết nối tối đa tới MongoDB (Atlas gói miễn phí giới hạn số kết nối) — request dư phải xếp hàng chờ. */
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(20),
  MONGODB_DB_NAME: z.string().regex(/^[A-Za-z0-9_-]{1,38}$/, "chỉ gồm chữ, số, _ và -").default("khupho"),

  JWT_ACCESS_SECRET: z.string().min(32, 'phải dài ít nhất 32 ký tự'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: booleanString.optional(),

  /** Khoá AES-256 mã hoá dữ liệu cá nhân: 32 byte, mã hoá base64. */
  DATA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'phải là 32 byte mã hoá base64'),
  /** Khoá HMAC cho blind index / token tìm kiếm — khác khoá mã hoá, ≥ 32 ký tự. */
  DATA_INDEX_KEY: z.string().min(32, 'phải dài ít nhất 32 ký tự'),

  /**
   * Backend đứng sau proxy (Cloudflare Tunnel, Vercel rewrite, Nginx…) → tin header X-Forwarded-For để lấy IP thật
   * (rate limit, log). Giá trị: số proxy phía trước (VD: 2), "true" (tin tất cả — chỉ khi backend KHÔNG lộ ra ngoài),
   * hoặc danh sách IP / dải mạng. Bỏ trống = không tin (chạy trực tiếp).
   */
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "false" ? false : v === "true" ? true : /^d+$/.test(v) ? Number(v) : v)),

  /**
   * Header chứa IP thật của người dùng do proxy phía trước đặt, nhiều header cách nhau dấu phẩy — lấy header ĐẦU TIÊN có giá trị.
   *   Cloudflare trực tiếp:       cf-connecting-ip   (Cloudflare Tunnel KHÔNG gửi X-Forwarded-For)
   *   Vercel rewrite → Cloudflare: x-vercel-forwarded-for,cf-connecting-ip   (cf-connecting-ip lúc này là IP của Vercel)
   * Header do proxy đặt nên chỉ tin được khi mọi request đều đi qua proxy đó.
   */
  CLIENT_IP_HEADER: z
    .string()
    .regex(/^[a-z0-9-]+(,[a-z0-9-]+)*$/i, "danh sách tên header không hợp lệ")
    .optional()
    .transform((v) => v?.split(",") ?? []),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  /** Số request tối đa mỗi IP trong 15 phút: đăng nhập / xin mật khẩu tạm (mỗi lần gửi SMS tốn tiền). */
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  /** Mọi API: số request tối đa mỗi IP mỗi phút. */
  API_RATE_LIMIT: z.coerce.number().int().positive().default(300),
  /** API ghi dữ liệu (POST/PUT/PATCH/DELETE): số request tối đa mỗi IP mỗi phút. */
  WRITE_RATE_LIMIT: z.coerce.number().int().positive().default(30),
  /** Bật / tắt toàn bộ rate limit (tắt khi chạy test). */
  RATE_LIMIT_ENABLED: booleanString.default(true),
  /** Số phiên đăng nhập tối đa mỗi tài khoản — đăng nhập thêm thì phiên cũ nhất bị thu hồi. */
  /** Chống quá tải HTTP: số kết nối đồng thời tối đa; request phải xong trong … ms (kết nối chậm / treo bị cắt). */
  HTTP_MAX_CONNECTIONS: z.coerce.number().int().positive().default(1000),
  HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MAX_SESSIONS_PER_USER: z.coerce.number().int().positive().default(10),
  TEMP_PASSWORD_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  /** Độ khó băm mật khẩu bcrypt (10–14; tăng 1 = chậm gấp đôi). */
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),

  /** Gửi SMS mật khẩu tạm. "mock" = không gửi thật, chỉ ghi log (và trả về cho client khi không phải production). */
  SMS_PROVIDER: z.enum(["mock"]).default("mock"),
  /** Mật khẩu tạm (đăng nhập lần đầu / quên mật khẩu) hết hạn sau … phút. */
  TEMP_PASSWORD_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  /** Khoảng cách tối thiểu giữa hai lần gửi mật khẩu tạm cho cùng một số. */
  TEMP_PASSWORD_RESEND_SECONDS: z.coerce.number().int().nonnegative().default(60),

  /** Mã project Firebase. Đặt → bật POST /auth/firebase-login (xác minh SĐT bằng OTP Firebase). */
  FIREBASE_PROJECT_ID: z.string().regex(/^[a-z0-9-]{4,40}$/, "mã project không hợp lệ").optional(),

  /**
   * Tài khoản nhận tiền quỹ mặc định (dùng tạo mã VietQR khi quỹ chưa có tài khoản riêng trong DB).
   * BIN = mã ngân hàng theo VietQR (VD: 970436 Vietcombank, 970422 MB, 970418 BIDV). Đặt đủ cả 3 hoặc bỏ trống cả 3.
   */
  PAYMENT_BANK_BIN: z.string().regex(/^\d{6}$/, 'BIN gồm 6 chữ số').optional(),
  PAYMENT_BANK_ACCOUNT_NO: z.string().regex(/^[0-9A-Za-z]{4,30}$/, 'số tài khoản không hợp lệ').optional(),
  PAYMENT_BANK_ACCOUNT_NAME: z.string().trim().min(2).max(120).optional(),

  /**
   * Tự xác nhận chuyển khoản: dịch vụ theo dõi tài khoản ngân hàng gọi webhook mỗi khi có tiền vào.
   * Hiện hỗ trợ "sepay" (POST /api/payments/sepay-webhook). Bỏ trống = tắt, trưởng KP xác nhận tay.
   */
  BANK_WEBHOOK_PROVIDER: z.enum(['sepay']).optional(),
  /** Khoá bí mật webhook — trùng với API Key khai báo trên SePay. ≥ 24 ký tự. */
  BANK_WEBHOOK_API_KEY: z.string().min(24, 'phải dài ít nhất 24 ký tự').optional(),
}).superRefine((e, ctx) => {
  const bank = [e.PAYMENT_BANK_BIN, e.PAYMENT_BANK_ACCOUNT_NO, e.PAYMENT_BANK_ACCOUNT_NAME].filter(Boolean).length;
  if (bank !== 0 && bank !== 3) {
    ctx.addIssue({ code: 'custom', path: ['PAYMENT_BANK_*'], message: 'cần đặt đủ BIN, số tài khoản và tên chủ tài khoản' });
  }
  if (e.BANK_WEBHOOK_PROVIDER && !e.BANK_WEBHOOK_API_KEY) {
    ctx.addIssue({ code: 'custom', path: ['BANK_WEBHOOK_API_KEY'], message: 'bắt buộc khi đặt BANK_WEBHOOK_PROVIDER' });
  }
});

function loadEnv() {
  // Biến khai báo nhưng để trống (VD: `JWT_ACCESS_SECRET=`) coi như chưa đặt.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Cấu hình môi trường không hợp lệ (xem .env.example ở thư mục gốc):\n${lines.join('\n')}`);
  }

  const data = parsed.data;
  return Object.freeze({
    ...data,
    isProduction: data.NODE_ENV === 'production',
    isTest: data.NODE_ENV === 'test',
    /** Mặc định bật cookie Secure ở production. */
    cookieSecure: data.COOKIE_SECURE ?? data.NODE_ENV === 'production',
  });
}

export const env = loadEnv();
export type Env = typeof env;
