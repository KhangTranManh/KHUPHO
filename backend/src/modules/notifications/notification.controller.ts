import type { Request, Response } from 'express';
import { requireAuth } from '../../common/middlewares/authenticate.js';
import { loadActor } from '../users/currentUser.js';
import * as notificationService from './notification.service.js';

/** GET /notifications → Notification[] của hộ người đang đăng nhập */
export async function mine(req: Request, res: Response) {
  res.json(await notificationService.listMyNotifications(await loadActor(requireAuth(req))));
}
