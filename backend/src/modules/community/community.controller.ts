import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { requireAuth } from '../../common/middlewares/authenticate.js';
import { loadActor } from '../users/currentUser.js';
import {
  createActivitySchema,
  createSurveySchema,
  culturalFamilyQuerySchema,
  surveyResponseSchema,
  upsertCulturalFamilySchema,
} from './community.schemas.js';
import * as communityService from './community.service.js';

/** GET /surveys → Survey[] (kèm hasResponded của người gọi) */
export async function listSurveys(req: Request, res: Response) {
  res.json(await communityService.listSurveys(await loadActor(requireAuth(req))));
}

/** POST /surveys → Survey (201) */
export async function createSurvey(req: Request, res: Response) {
  const actor = await loadActor(requireAuth(req));
  res.status(201).json(await communityService.createSurvey(parseInput(createSurveySchema, req.body), actor));
}

/** POST /surveys/:id/responses → Survey (kết quả mới) */
export async function respondSurvey(req: Request<{ id: string }>, res: Response) {
  const actor = await loadActor(requireAuth(req));
  const { answers } = parseInput(surveyResponseSchema, req.body);
  res.status(201).json(await communityService.respondSurvey(req.params.id, answers, actor));
}

/** GET /activities → Activity[] */
export async function listActivities(_req: Request, res: Response) {
  res.json(await communityService.listActivities());
}

/** POST /activities → Activity (201) */
export async function createActivity(req: Request, res: Response) {
  res.status(201).json(await communityService.createActivity(parseInput(createActivitySchema, req.body)));
}

/** GET /cultural-families → Paged<CulturalFamily> */
export async function listCulturalFamilies(req: Request, res: Response) {
  res.json(await communityService.listCulturalFamilies(parseInput(culturalFamilyQuerySchema, req.query)));
}

/** PUT /cultural-families → CulturalFamily */
export async function upsertCulturalFamily(req: Request, res: Response) {
  res.json(await communityService.upsertCulturalFamily(parseInput(upsertCulturalFamilySchema, req.body)));
}
