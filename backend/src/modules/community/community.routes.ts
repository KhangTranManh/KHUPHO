import { Router } from 'express';
import { requireLogin, requireLeader } from '../../common/middlewares/guards.js';
import * as controller from './community.controller.js';

/** Mount tại /api/surveys — mọi tài khoản xem / trả lời; trưởng khu phố tạo. */
export const surveysRouter = Router();
surveysRouter.get('/', ...requireLogin, controller.listSurveys);
surveysRouter.post('/', ...requireLeader, controller.createSurvey);
surveysRouter.post('/:id/responses', ...requireLogin, controller.respondSurvey);

/** Mount tại /api/activities — mọi tài khoản xem; trưởng khu phố thêm lịch. */
export const activitiesRouter = Router();
activitiesRouter.get('/', ...requireLogin, controller.listActivities);
activitiesRouter.post('/', ...requireLeader, controller.createActivity);

/** Mount tại /api/cultural-families — mọi tài khoản xem; trưởng khu phố ghi kết quả bình xét. */
export const culturalFamiliesRouter = Router();
culturalFamiliesRouter.get('/', ...requireLogin, controller.listCulturalFamilies);
culturalFamiliesRouter.put('/', ...requireLeader, controller.upsertCulturalFamily);
