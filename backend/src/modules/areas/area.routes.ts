import { Router } from 'express';
import { requireStaff } from '../../common/middlewares/guards.js';
import * as controller from './area.controller.js';

/** Mount tại /api/areas — chỉ cán bộ / quản trị. */
export const areasRouter = Router();

areasRouter.use(...requireStaff);
areasRouter.get('/', controller.list);
