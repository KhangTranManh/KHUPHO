import { Router } from 'express';
import { requireLogin, requireLeader } from '../../common/middlewares/guards.js';
import * as controller from './fund.controller.js';

/** Mount tại /api/funds — mọi tài khoản xem quỹ / QR; trưởng khu phố xem danh sách thu, xác nhận, nhắc. */
export const fundsRouter = Router();

fundsRouter.get('/', ...requireLogin, controller.list);
fundsRouter.get('/:id/households', ...requireLeader, controller.households);
fundsRouter.post('/:id/payments', ...requireLeader, controller.markPaid);
fundsRouter.post('/:id/reminders', ...requireLeader, controller.remind);
