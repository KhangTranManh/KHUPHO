import type { Request, Response } from 'express';
import { parseInput } from '../../common/http/validation.js';
import { requireAuth } from '../../common/middlewares/authenticate.js';
import { loadActor } from '../users/currentUser.js';
import { createPostSchema, postListQuerySchema } from './post.schemas.js';
import * as postService from './post.service.js';

const actorOf = (req: Request) => loadActor(requireAuth(req));

/** GET /posts → Paged<Post & { isRead }> */
export async function list(req: Request, res: Response) {
  res.json(await postService.listPosts(parseInput(postListQuerySchema, req.query), await actorOf(req)));
}

/** POST /posts → Post (201) */
export async function create(req: Request, res: Response) {
  res.status(201).json(await postService.createPost(parseInput(createPostSchema, req.body), await actorOf(req)));
}

/** POST /posts/:id/read → 204 */
export async function markRead(req: Request<{ id: string }>, res: Response) {
  await postService.markRead(req.params.id, await actorOf(req));
  res.status(204).end();
}
