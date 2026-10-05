/** Bài đăng (lọc theo đối tượng nhận) + sổ tay phường. */
import type { CreatePostInput, Post } from '@/features/posts/types';
import type { PostQuery } from '@/features/posts/postService';
import { directory, posts } from '../communityDb';
import { db } from '../db';
import { isStaff, matches, mockCurrentUser, nextId, notFound, paginate, passFilter, respond } from '../helpers';

/** Tin ghim trước, sau đó mới nhất trước. */
const byPinnedThenNewest = (a: Post, b: Post) =>
  Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt);

/** Cư dân chỉ thấy bài cho tất cả / khu vực của hộ mình / nhóm của mình (chủ hộ trong dữ liệu mẫu). */
function visibleTo(post: Post) {
  const me = mockCurrentUser();
  if (isStaff(me) || post.audience.scope === 'all') return true;
  const household = db.households.find((h) => h.id === me.householdId);
  if (!household) return false;
  if (post.audience.scope === 'area') return post.audience.areaIds?.includes(household.areaId) ?? false;
  const head = db.residents.find((p) => p.householdId === household.id && p.householdRole === 'chu_ho');
  return post.audience.categories?.some((c) => head?.categories.includes(c)) ?? false;
}

export const informationHandlers = {
  posts: (q: PostQuery) =>
    respond(
      paginate(
        posts
          .filter((p) => visibleTo(p) && passFilter(q.filter, p.kind) && matches(q.search, p.title, p.content))
          .sort(byPinnedThenNewest),
        q,
      ),
    ),

  createPost: (input: CreatePostInput) => {
    const item: Post = {
      attachments: [],
      audience: { scope: 'all' },
      ...input,
      id: nextId('po'),
      pinned: input.pinned ?? false,
      publishedAt: new Date().toISOString(),
      author: { name: mockCurrentUser().fullName },
      readCount: 0,
      isRead: false,
    };
    posts.unshift(item);
    return respond(item);
  },

  markPostRead: (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return Promise.reject(notFound('bài đăng'));
    if (!post.isRead) {
      post.isRead = true;
      post.readCount++;
    }
    return respond(undefined);
  },

  directory: () => respond([...directory].sort((a, b) => a.order - b.order)),
};
