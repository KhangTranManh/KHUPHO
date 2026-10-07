import mongoose from 'mongoose';
import { logger } from '../common/logger.js';
import { env } from './env.js';

mongoose.set('strictQuery', true);

/**
 * Kết nối MongoDB. Ở production tắt autoIndex (tạo index khi khởi động có thể khoá collection lớn);
 * chạy `npm run db:setup` (hoặc `db:sync-indexes`) khi deploy thay vào đó.
 * Database luôn là `MONGODB_DB_NAME` (mặc định "khupho"), không phụ thuộc phần tên DB trong URI.
 */
export async function connectDatabase(uri = env.MONGODB_URI) {
  await mongoose.connect(uri, {
    dbName: env.MONGODB_DB_NAME,
    autoIndex: !env.isProduction,
    // Atlas: lần đầu phải tra DNS SRV + bắt tay TLS với cả cụm → 5 giây đôi khi không đủ.
    serverSelectionTimeoutMS: env.MONGODB_TIMEOUT_MS,
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    // Truy vấn không được chiếm kết nối quá lâu khi DB bị dồn tải.
    socketTimeoutMS: 45_000,
  });
  logger.info({ db: mongoose.connection.name }, 'Đã kết nối MongoDB');
}

/**
 * Lỗi "Could not connect to any servers… IP isn't whitelisted" của Mongoose là thông báo chung cho MỌI
 * trường hợp không chọn được server (hết giờ chờ, DNS, TLS, sai mật khẩu…). Hàm này lấy lỗi thật của từng node.
 */
export function describeConnectionError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const servers = (err as { reason?: { servers?: Map<string, { error?: { message?: string } | null }> } }).reason?.servers;
  if (!servers?.size) return err.message;

  const details = [...servers].map(([host, s]) => `  - ${host}: ${s.error?.message ?? 'không phản hồi trong thời gian chờ'}`);
  return [
    `Không kết nối được MongoDB sau ${env.MONGODB_TIMEOUT_MS / 1000} giây. Lỗi từng server:`,
    ...details,
    'Gợi ý: mạng chậm → tăng MONGODB_TIMEOUT_MS trong .env; "Authentication failed" → sai user/mật khẩu trong MONGODB_URI;',
    'mạng công ty / trường chặn cổng 27017 → thử mạng khác (4G); IP chưa được cho phép → Atlas › Network Access.',
  ].join('\n');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export const isDatabaseConnected = () => mongoose.connection.readyState === mongoose.ConnectionStates.connected;

/**
 * Công cụ trong database/scripts không có node_modules riêng → dùng mongoose qua đây
 * (cùng một instance với các model của backend).
 */
export { mongoose };
export type { HydratedDocument, Model, Types } from 'mongoose';
