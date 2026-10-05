import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { residentListQuerySchema } from './resident.schemas.js';
import * as residentService from './resident.service.js';

/** GET /residents → Paged<Resident> */
export async function list(req: Request, res: Response) {
  res.json(await residentService.listResidents(parseInput(residentListQuerySchema, req.query)));
}

/** GET /residents/:id → Resident */
export async function getById(req: Request<{ id: string }>, res: Response) {
  res.json(await residentService.getResident(req.params.id));
}
