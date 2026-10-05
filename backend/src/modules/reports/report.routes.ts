import { Router } from 'express';
import { requireLogin, requireStaff } from '../../common/middlewares/guards.js';
import * as controller from './report.controller.js';

/** Mount tại /api/reports — mọi tài khoản gửi / xem phản ánh của mình; cán bộ xử lý. */
export const reportsRouter = Router();
reportsRouter.get('/', ...requireLogin, controller.list);
reportsRouter.post('/', ...requireLogin, controller.create);
reportsRouter.patch('/:id', ...requireStaff, controller.update);

/** Mount tại /api/sos — lối tắt cho phản ánh loại SOS (cùng collection `reports`). */
export const sosRouter = Router();
sosRouter.get('/', ...requireLogin, controller.listSos);
sosRouter.post('/', ...requireLogin, controller.createSos);
sosRouter.patch('/:id', ...requireStaff, controller.update);
