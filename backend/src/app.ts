import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { isIP } from 'node:net';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFoundHandler } from './common/http/errorHandler.js';
import { logger } from './common/logger.js';
import { API_PREFIX, JSON_BODY_LIMIT } from './config/constants.js';
import { env } from './config/env.js';
import { apiRateLimiter, writeRateLimiter } from './common/middlewares/rateLimiters.js';
import { buildApiRouter } from './routes.js';

/**
 * Tạo Express app (không listen, không kết nối DB) → test dùng trực tiếp với supertest.
 * Thứ tự: bảo mật → parse → log → routes → 404 → xử lý lỗi.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Sau proxy: lấy IP người dùng từ X-Forwarded-For (TRUST_PROXY trong .env) — rate limit theo đúng người.
  app.set('trust proxy', env.TRUST_PROXY);
  // Cloudflare: IP thật nằm ở CF-Connecting-IP (CLIENT_IP_HEADER) → dùng cho rate limit, log, /health.
  if (env.CLIENT_IP_HEADER) {
    const header = env.CLIENT_IP_HEADER;
    app.use((req, _res, next) => {
      const ip = req.get(header)?.split(',')[0].trim();
      if (ip && isIP(ip)) Object.defineProperty(req, 'ip', { value: ip, configurable: true });
      next();
    });
  }
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === `${API_PREFIX}/health` } }));

  // Rate limit trước khi vào route — request bị chặn không chạm tới DB.
  app.use(API_PREFIX, apiRateLimiter, writeRateLimiter, buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
