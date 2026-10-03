import { Router } from 'express';
import { isDatabaseConnected } from '../../config/database.js';

/** Mount tại /api/health — dùng cho kiểm tra sống / giám sát. */
export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const database = isDatabaseConnected() ? 'up' : 'down';
  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    uptime: Math.round(process.uptime()),
  });
});
