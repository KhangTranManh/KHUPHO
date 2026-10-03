import mongoose from 'mongoose';
import { logger } from '../common/logger.js';
import { env } from './env.js';

mongoose.set('strictQuery', true);

/**
 * Kết nối MongoDB. Ở production tắt autoIndex (tạo index khi khởi động có thể khoá collection lớn);
 * chạy `npm run db:sync-indexes` khi deploy thay vào đó.
 */
export async function connectDatabase(uri = env.MONGODB_URI) {
  await mongoose.connect(uri, {
    autoIndex: !env.isProduction,
    serverSelectionTimeoutMS: 5_000,
  });
  logger.info({ db: mongoose.connection.name }, 'Đã kết nối MongoDB');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export const isDatabaseConnected = () => mongoose.connection.readyState === mongoose.ConnectionStates.connected;
