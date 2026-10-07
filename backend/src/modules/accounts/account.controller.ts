import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { requireAuth } from '../../common/middlewares/authenticate.js';
import { loadActor } from '../users/currentUser.js';
import { createAccountSchema, lookupQuerySchema, updateAccountSchema, updateMemberSchema } from './account.schemas.js';
import * as accountService from './account.service.js';

/** GET /accounts/lookup?phone= → { phone, account, members[] } */
export async function lookup(req: Request, res: Response) {
  const { phone } = parseInput(lookupQuerySchema, req.query);
  res.json(await accountService.lookupByPhone(phone));
}

/** POST /accounts → kết quả tra cứu SĐT sau khi tạo (201) */
export async function create(req: Request, res: Response) {
  const actor = await loadActor(requireAuth(req));
  res.status(201).json(await accountService.createAccount(parseInput(createAccountSchema, req.body), actor));
}

/** PATCH /accounts/:id → kết quả tra cứu SĐT (mới) của tài khoản */
export async function update(req: Request<{ id: string }>, res: Response) {
  const actor = await loadActor(requireAuth(req));
  res.json(await accountService.updateAccount(req.params.id, parseInput(updateAccountSchema, req.body), actor));
}

/** PATCH /accounts/members/:householdId/:memberId → { household, member } */
export async function updateMember(req: Request<{ householdId: string; memberId: string }>, res: Response) {
  const actor = await loadActor(requireAuth(req));
  const input = parseInput(updateMemberSchema, req.body);
  res.json(await accountService.updateMember(req.params.householdId, req.params.memberId, input, actor));
}
