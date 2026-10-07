import { Router } from 'express';
import { authenticateAllowPasswordChange } from '../../common/middlewares/authenticate.js';
import { loginRateLimiter, tempPasswordRateLimiter } from '../../common/middlewares/rateLimiters.js';
import * as controller from './auth.controller.js';

/** Mount tại /api/auth */
export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, controller.login);
authRouter.post('/temp-password', tempPasswordRateLimiter, controller.requestTempPassword);
authRouter.post('/firebase-login', loginRateLimiter, controller.firebaseLogin);
authRouter.post('/refresh', controller.refresh); // đã nằm trong giới hạn chung của mọi API
authRouter.post('/logout', controller.logout);
// Ba route dưới vẫn dùng được khi vừa đăng nhập bằng mật khẩu tạm (chưa đổi mật khẩu).
authRouter.post('/change-password', loginRateLimiter, authenticateAllowPasswordChange, controller.changePassword);
authRouter.post('/logout-all', authenticateAllowPasswordChange, controller.logoutAll);
authRouter.get('/me', authenticateAllowPasswordChange, controller.me);
