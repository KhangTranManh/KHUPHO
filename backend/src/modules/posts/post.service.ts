import { Types, isValidObjectId } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { searchCondition } from '../../common/http/listQuery.js';
import { residentContext, type Actor } from '../users/currentUser.js';
import { PostModel } from './post.model.js';
import type { CreatePostInput, PostListQuery } from './post.schemas.js';
import { PostReadModel } from './postRead.model.js';

/**
 * Điều kiện đối tượng nhận cho cư dân: bài cho tất cả, cho khu vực của hộ mình,
 * hoặc cho nhóm đối tượng mà mình thuộc về. Cán bộ thấy mọi bài.
 */
async function audienceCondition(actor: Actor): Promise<Record<string, unknown>> {
  if (actor.isStaff) return {};
  const { areaId, categories } = await residentContext(actor);
  const or: Record<string, unknown>[] = [{ 'audience.scope': 'all' }];
  if (areaId) or.push({ 'audience.scope': 'area', 'audience.areaIds': areaId });
  if (categories.length) or.push({ 'audience.scope': 'group', 'audience.categories': { $in: categories } });
  return { $or: or };
}

/** Tin ghim trước, sau đó mới nhất trước. Mỗi bài kèm `isRead` của người gọi. */
export async function listPosts(q: PostListQuery, actor: Actor) {
  const filter: Record<string, unknown> = { ...searchCondition(q.search), ...(await audienceCondition(actor)) };
  if (q.filter !== 'all') filter.kind = q.filter;

  const [posts, total] = await Promise.all([
    PostModel.find(filter)
      .sort({ pinned: -1, publishedAt: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize),
    PostModel.countDocuments(filter),
  ]);
  const readIds = new Set(
    (await PostReadModel.find({ userId: actor.userId, postId: { $in: posts.map((p) => p._id) } }).distinct('postId')).map(String),
  );
  return {
    items: posts.map((p) => ({ ...(p.toJSON() as object), isRead: readIds.has(p.id) })),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export function createPost(input: CreatePostInput, actor: Actor) {
  return PostModel.create({
    ...input,
    audience: {
      scope: input.audience.scope,
      areaIds: input.audience.scope === 'area' ? input.audience.areaIds?.map((id) => new Types.ObjectId(id)) : undefined,
      categories: input.audience.scope === 'group' ? input.audience.categories : undefined,
    },
    author: { userId: actor.userId, name: actor.fullName },
  });
}

/** Đánh dấu đã đọc (gọi nhiều lần không sao); lần đầu thì tăng readCount. */
export async function markRead(postId: string, actor: Actor) {
  if (!isValidObjectId(postId) || !(await PostModel.exists({ _id: postId }))) {
    throw Errors.notFound('Không tìm thấy bài đăng');
  }
  const res = await PostReadModel.updateOne(
    { postId, userId: actor.userId },
    { $setOnInsert: { readAt: new Date() } },
    { upsert: true },
  );
  if (res.upsertedCount) await PostModel.updateOne({ _id: postId }, { $inc: { readCount: 1 } });
}

/** Số bài dành cho người gọi mà họ chưa đọc. */
export async function countUnread(actor: Actor) {
  const visibleIds = await PostModel.find(await audienceCondition(actor)).distinct('_id');
  const read = await PostReadModel.countDocuments({ userId: actor.userId, postId: { $in: visibleIds } });
  return visibleIds.length - read;
}
