import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { createDirectorySchema } from './directory.schemas.js';
import * as directoryService from './directory.service.js';

/** GET /directory → DirectoryEntry[] */
export async function list(_req: Request, res: Response) {
  res.json(await directoryService.listDirectory());
}

/** POST /directory → DirectoryEntry (201) */
export async function create(req: Request, res: Response) {
  res.status(201).json(await directoryService.createDirectoryEntry(parseInput(createDirectorySchema, req.body)));
}
