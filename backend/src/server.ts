import { createApp } from './app.js';
import { logger } from './common/logger.js';
import { API_PREFIX } from './config/constants.js';
import { connectDatabase, describeConnectionError, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

/** Điểm khởi động: kết nối DB → mở cổng HTTP → tắt êm khi nhận tín hiệu dừng. */
async function main() {
  await connectDatabase();

  const server = createApp().listen(env.PORT, () => {
    logger.info(`API đang chạy tại http://localhost:${env.PORT}${API_PREFIX}`);
  });
  // Chống quá tải: giới hạn kết nối đồng thời, cắt request / header gửi quá chậm (slowloris).
  server.maxConnections = env.HTTP_MAX_CONNECTIONS;
  server.requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;

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
  logger.fatal({ err }, `Không khởi động được server
${describeConnectionError(err)}`);
  process.exit(1);
});
