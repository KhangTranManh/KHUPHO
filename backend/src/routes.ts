import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';

/**
 * Bảng định tuyến gốc dưới /api. Thêm module mới: tạo modules/<tên>/<tên>.routes.ts rồi mount ở đây.
 */
export function buildApiRouter() {
  const api = Router();
  api.use('/health', healthRouter);
  api.use('/auth', authRouter);
  return api;
}
