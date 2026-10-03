import { createApp } from './app.js';
import { logger } from './common/logger.js';
import { API_PREFIX } from './config/constants.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

/** Điểm khởi động: kết nối DB → mở cổng HTTP → tắt êm khi nhận tín hiệu dừng. */
async function main() {
  await connectDatabase();

  const server = createApp().listen(env.PORT, () => {
    logger.info(`API đang chạy tại http://localhost:${env.PORT}${API_PREFIX}`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Đang tắt server…');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Không đóng được sau 10s thì buộc thoát.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Không khởi động được server');
  process.exit(1);
});
