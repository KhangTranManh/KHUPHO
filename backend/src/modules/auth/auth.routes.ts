import { Router } from 'express';
import { authenticate } from '../../common/middlewares/authenticate.js';
import { loginRateLimiter } from '../../common/middlewares/rateLimiters.js';
import * as controller from './auth.controller.js';

/** Mount tại /api/auth */
export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post('/logout-all', authenticate, controller.logoutAll);
authRouter.get('/me', authenticate, controller.me);
