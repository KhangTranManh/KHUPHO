import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { updateWelfareSchema } from './welfare.schemas.js';
import * as welfareService from './welfare.service.js';

/** GET /welfare-households → WelfareHousehold[] */
export async function list(_req: Request, res: Response) {
  res.json(await welfareService.listWelfareHouseholds());
}

/** PUT /welfare-households → WelfareHousehold */
export async function update(req: Request, res: Response) {
  res.json(await welfareService.updateWelfareHousehold(parseInput(updateWelfareSchema, req.body)));
}
