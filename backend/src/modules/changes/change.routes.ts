import { Router } from 'express';
import { requireStaff } from '../../common/middlewares/guards.js';
import * as controller from './change.controller.js';

/** Mount tại /api/changes — chỉ cán bộ / quản trị. */
export const changesRouter = Router();

changesRouter.use(...requireStaff);
changesRouter.get('/', controller.list);
