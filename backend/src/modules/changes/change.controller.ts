import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { changeListQuerySchema } from './change.schemas.js';
import * as changeService from './change.service.js';

/** GET /changes → Paged<ResidentChange> */
export async function list(req: Request, res: Response) {
  res.json(await changeService.listChanges(parseInput(changeListQuerySchema, req.query)));
}
