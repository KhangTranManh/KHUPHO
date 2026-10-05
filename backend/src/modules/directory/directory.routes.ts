import { Router } from 'express';
import { requireLogin, requireLeader } from '../../common/middlewares/guards.js';
import * as controller from './directory.controller.js';

/** Mount tại /api/directory — Sổ tay phường: mọi tài khoản xem; trưởng khu phố thêm số. */
export const directoryRouter = Router();

directoryRouter.get('/', ...requireLogin, controller.list);
directoryRouter.post('/', ...requireLeader, controller.create);
