import { Router } from 'express';
import { requireLeader, requireLogin } from '../../common/middlewares/guards.js';
import * as controller from './fund.controller.js';
import { sepayWebhook } from './sepayWebhook.js';

/**
 * Mount tại /api/funds — mọi tài khoản xem quỹ; cư dân xem khoản phải đóng + QR riêng của hộ;
 * trưởng khu phố xem danh sách thu, xác nhận tay, nhắc, đối soát giao dịch ngân hàng.
 */
export const fundsRouter = Router();

fundsRouter.get('/', ...requireLogin, controller.list);
fundsRouter.get('/bank-transactions', ...requireLeader, controller.bankTransactions);
fundsRouter.get('/:id/my-payment', ...requireLogin, controller.myPayment);
fundsRouter.get('/:id/households', ...requireLeader, controller.households);
fundsRouter.post('/:id/payments', ...requireLeader, controller.markPaid);
fundsRouter.post('/:id/reminders', ...requireLeader, controller.remind);

/**
 * Mount tại /api/payments — webhook ngân hàng gọi vào, KHÔNG dùng đăng nhập
 * (xác thực bằng BANK_WEBHOOK_API_KEY trong header).
 */
export const paymentsRouter = Router();

paymentsRouter.post('/sepay-webhook', sepayWebhook);
