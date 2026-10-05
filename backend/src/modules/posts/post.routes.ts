import { Router } from 'express';
import { requireLogin, requireLeader } from '../../common/middlewares/guards.js';
import * as controller from './post.controller.js';

/** Mount tại /api/posts — mọi tài khoản xem (lọc theo đối tượng nhận) và đánh dấu đã đọc; trưởng khu phố đăng. */
export const postsRouter = Router();

postsRouter.get('/', ...requireLogin, controller.list);
postsRouter.post('/', ...requireLeader, controller.create);
postsRouter.post('/:id/read', ...requireLogin, controller.markRead);
