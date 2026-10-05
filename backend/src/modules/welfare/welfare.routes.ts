import { Router } from 'express';
import { requireLeader } from '../../common/middlewares/guards.js';
import * as controller from './welfare.controller.js';

/** Mount tại /api/welfare-households — chỉ trưởng khu phố (dữ liệu nhạy cảm). */
export const welfareRouter = Router();

welfareRouter.use(...requireLeader);
welfareRouter.get('/', controller.list);
welfareRouter.put('/', controller.update);
