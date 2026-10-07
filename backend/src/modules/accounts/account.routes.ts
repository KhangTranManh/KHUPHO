import { Router } from 'express';
import { requireLeader } from '../../common/middlewares/guards.js';
import * as controller from './account.controller.js';

/** Mount tại /api/accounts — chỉ Trưởng khu phố: tra cứu theo SĐT, tạo / sửa tài khoản, sửa nhân khẩu. */
export const accountsRouter = Router();

accountsRouter.use(...requireLeader);
accountsRouter.get('/lookup', controller.lookup);
accountsRouter.post('/', controller.create);
accountsRouter.patch('/members/:householdId/:memberId', controller.updateMember);
accountsRouter.patch('/:id', controller.update);
