import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFoundHandler } from './common/http/errorHandler.js';
import { logger } from './common/logger.js';
import { API_PREFIX, JSON_BODY_LIMIT } from './config/constants.js';
import { env } from './config/env.js';
import { buildApiRouter } from './routes.js';

/**
 * Tạo Express app (không listen, không kết nối DB) → test dùng trực tiếp với supertest.
 * Thứ tự: bảo mật → parse → log → routes → 404 → xử lý lỗi.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === `${API_PREFIX}/health` } }));

  app.use(API_PREFIX, buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
