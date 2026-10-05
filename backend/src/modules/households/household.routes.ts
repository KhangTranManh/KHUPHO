import { Router } from 'express';
import { requireStaff } from '../../common/middlewares/guards.js';
import * as controller from './household.controller.js';

/** Mount tại /api/households — chỉ cán bộ / quản trị. */
export const householdsRouter = Router();

householdsRouter.use(...requireStaff);
householdsRouter.get('/', controller.list);
householdsRouter.get('/:id', controller.getById);
