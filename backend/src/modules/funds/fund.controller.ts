import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { requireAuth } from '../../common/middlewares/authenticate.js';
import { loadActor } from '../users/currentUser.js';
import { fundHouseholdQuerySchema, markPaidSchema } from './fund.schemas.js';
import * as fundService from './fund.service.js';

/** GET /funds → FundSummary[] */
export async function list(_req: Request, res: Response) {
  res.json(await fundService.listFunds());
}

/** GET /funds/:id/households → Paged<FundHouseholdStatus> */
export async function households(req: Request<{ id: string }>, res: Response) {
  res.json(await fundService.listFundHouseholds(req.params.id, parseInput(fundHouseholdQuerySchema, req.query)));
}

/** POST /funds/:id/payments → { payment, notified } (201) */
export async function markPaid(req: Request<{ id: string }>, res: Response) {
  const actor = await loadActor(requireAuth(req));
  res.status(201).json(await fundService.markPaid(req.params.id, parseInput(markPaidSchema, req.body), actor));
}

/** POST /funds/:id/reminders → { notified } — nhắc mọi hộ chưa đóng */
export async function remind(req: Request<{ id: string }>, res: Response) {
  res.json(await fundService.remindUnpaid(req.params.id));
}
