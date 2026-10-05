import { appConfig } from '@/config/app';
import { apiGet, apiPost, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { CreatePostInput, Post, PostKind } from './types';

/** `filter` = loại bài. Cư dân chỉ nhận bài dành cho mình (backend lọc theo đối tượng nhận). */
export type PostQuery = ListQuery<PostKind>;

const mock = () => import('@/mocks/mockApi').then((m) => m.mockApi);

export async function getPosts(query: PostQuery): Promise<Paged<Post>> {
  if (appConfig.useMock) return (await mock()).posts(query);
  return apiGet(`/posts${toQueryString(query)}`);
}

/** Chỉ cán bộ. */
export async function createPost(input: CreatePostInput): Promise<Post> {
  if (appConfig.useMock) return (await mock()).createPost(input);
  return apiPost('/posts', input);
}

/** Đánh dấu đã đọc (gọi nhiều lần không sao). */
export async function markPostRead(id: string): Promise<void> {
  if (appConfig.useMock) return (await mock()).markPostRead(id);
  return apiPost(`/posts/${id}/read`);
}
