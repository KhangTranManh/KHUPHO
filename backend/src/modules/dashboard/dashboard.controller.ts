import type { Request, Response } from 'express';
import { requireAuth } from '../../common/middlewares/authenticate.js';
import { loadActor } from '../users/currentUser.js';
import * as dashboardService from './dashboard.service.js';
import { getPoliceDashboard } from './police.service.js';
import { getResidentDashboard } from './resident.service.js';

/** GET /dashboard/officer → OfficerDashboard (trưởng khu phố) */
export async function officer(_req: Request, res: Response) {
  res.json(await dashboardService.getOfficerDashboard());
}

/** GET /dashboard/police → PoliceDashboard (công an khu vực) */
export async function police(_req: Request, res: Response) {
  res.json(await getPoliceDashboard());
}

/** GET /dashboard/resident → ResidentDashboard (cư dân) */
export async function resident(req: Request, res: Response) {
  res.json(await getResidentDashboard(await loadActor(requireAuth(req))));
}
