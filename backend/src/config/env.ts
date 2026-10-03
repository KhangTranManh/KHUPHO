import 'dotenv/config';
import { z } from 'zod';

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

  JWT_ACCESS_SECRET: z.string().min(32, 'phải dài ít nhất 32 ký tự'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: booleanString.optional(),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
});

function loadEnv() {
  // Biến khai báo nhưng để trống (VD: `JWT_ACCESS_SECRET=`) coi như chưa đặt.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Cấu hình môi trường không hợp lệ (xem backend/.env.example):\n${lines.join('\n')}`);
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
