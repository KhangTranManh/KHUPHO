import { Router } from 'express';
import { requireLeader, requireResident, requireStaff } from '../../common/middlewares/guards.js';
import * as controller from './dashboard.controller.js';

/** Mount tại /api/dashboard — mỗi vai trò một dashboard. */
export const dashboardRouter = Router();

dashboardRouter.get('/officer', ...requireLeader, controller.officer); // trưởng khu phố
dashboardRouter.get('/police', ...requireStaff, controller.police); // công an khu vực (trưởng KP cũng xem được)
dashboardRouter.get('/resident', ...requireResident, controller.resident); // cư dân
