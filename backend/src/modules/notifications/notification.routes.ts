import { Router } from 'express';
import { requireLogin } from '../../common/middlewares/guards.js';
import * as controller from './notification.controller.js';

/** Mount tại /api/notifications. */
export const notificationsRouter = Router();

notificationsRouter.get('/', ...requireLogin, controller.mine);
