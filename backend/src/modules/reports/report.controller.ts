import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { requireAuth } from '../../common/middlewares/authenticate.js';
import { loadActor } from '../users/currentUser.js';
import { createReportSchema, createSosSchema, reportListQuerySchema, updateReportSchema } from './report.schemas.js';
import * as reportService from './report.service.js';

const actorOf = (req: Request) => loadActor(requireAuth(req));

/** GET /reports → Paged<Report> */
export async function list(req: Request, res: Response) {
  res.json(await reportService.listReports(parseInput(reportListQuerySchema, req.query), await actorOf(req)));
}

/** GET /sos → Paged<Report> chỉ loại SOS */
export async function listSos(req: Request, res: Response) {
  const q = parseInput(reportListQuerySchema, req.query);
  res.json(await reportService.listReports({ ...q, kind: 'sos' }, await actorOf(req)));
}

/** POST /reports → Report (201) */
export async function create(req: Request, res: Response) {
  res.status(201).json(await reportService.createReport(parseInput(createReportSchema, req.body), await actorOf(req)));
}

/** POST /sos → Report loại SOS (201) */
export async function createSos(req: Request, res: Response) {
  res.status(201).json(await reportService.createSos(parseInput(createSosSchema, req.body), await actorOf(req)));
}

/** PATCH /reports/:id, /sos/:id → Report */
export async function update(req: Request<{ id: string }>, res: Response) {
  res.json(await reportService.updateReport(req.params.id, parseInput(updateReportSchema, req.body), await actorOf(req)));
}
