import { Router } from 'express';
import { requireStaff } from '../../common/middlewares/guards.js';
import * as controller from './resident.controller.js';

/** Mount tại /api/residents — chỉ cán bộ / quản trị. */
export const residentsRouter = Router();

residentsRouter.use(...requireStaff);
residentsRouter.get('/', controller.list);
residentsRouter.get('/:id', controller.getById);
