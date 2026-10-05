import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { householdListQuerySchema } from './household.schemas.js';
import * as householdService from './household.service.js';

/** GET /households → Paged<Household> */
export async function list(req: Request, res: Response) {
  res.json(await householdService.listHouseholds(parseInput(householdListQuerySchema, req.query)));
}

/** GET /households/:id → Household */
export async function getById(req: Request<{ id: string }>, res: Response) {
  res.json(await householdService.getHousehold(req.params.id));
}
