import { z } from 'zod';
import { listQueryWithFilter } from '../../common/http/listQuery.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { RESIDENT_CATEGORIES } from '../residents/resident.constants.js';
import { AUDIENCE_SCOPES, POST_CATEGORIES, POST_KINDS } from './post.constants.js';

/** GET /posts?search=&filter=<loại>|all&page=&pageSize= */
export const postListQuerySchema = listQueryWithFilter(POST_KINDS);
export type PostListQuery = z.output<typeof postListQuerySchema>;

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Mã không hợp lệ');

/** POST /posts — chỉ cán bộ. */
export const createPostSchema = z
  .object({
    kind: z.enum(POST_KINDS),
    category: z.enum(POST_CATEGORIES),
    title: z.string({ error: 'Vui lòng nhập tiêu đề' }).trim().min(5, 'Tiêu đề quá ngắn').max(200),
    content: z.string({ error: 'Vui lòng nhập nội dung' }).trim().min(10, 'Nội dung quá ngắn').max(10_000),
    attachments: z
      .array(z.object({ url: z.url().max(500), name: z.string().trim().min(1).max(200), mimeType: optionalText(100) }))
      .max(10)
      .default([]),
    eventDate: z.string().regex(ISO_DATE_REGEX, 'Ngày không hợp lệ').optional(),
    eventTime: optionalText(50),
    location: optionalText(255),
    audience: z
      .object({
        scope: z.enum(AUDIENCE_SCOPES),
        areaIds: z.array(objectId).optional(),
        categories: z.array(z.enum(RESIDENT_CATEGORIES)).optional(),
      })
      .default({ scope: 'all' }),
    pinned: z.boolean().optional(),
  })
  .refine((p) => p.audience.scope !== 'area' || p.audience.areaIds?.length, {
    path: ['audience', 'areaIds'],
    message: 'Chọn ít nhất một khu vực',
  })
  .refine((p) => p.audience.scope !== 'group' || p.audience.categories?.length, {
    path: ['audience', 'categories'],
    message: 'Chọn ít nhất một nhóm đối tượng',
  });
export type CreatePostInput = z.output<typeof createPostSchema>;
