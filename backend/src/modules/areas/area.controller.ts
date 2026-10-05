import type { Request, Response } from 'express';
import * as areaService from './area.service.js';

/** GET /areas → Area[] */
export async function list(_req: Request, res: Response) {
  res.json(await areaService.listAreas());
}
