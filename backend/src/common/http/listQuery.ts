import type { Model, QueryFilter, SortOrder } from 'mongoose';
import { z } from 'zod';
import { escapeRegex, normalizeText } from '../utils/text.js';

/**
 * Query chung của mọi API danh sách — khớp `ListQuery` ở frontend (src/types/common.ts):
 *   GET /residents?search=an&filter=tam_tru&page=2&pageSize=10
 * Trả về `Paged<T>`: { items, total, page, pageSize }.
 */
export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

/** Thêm tham số `filter` nhận một trong các giá trị cho trước hoặc "all". */
export const listQueryWithFilter = <const T extends readonly [string, ...string[]]>(values: T) =>
  listQuerySchema.extend({ filter: z.enum([...values, 'all']).default('all') });

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Điều kiện tìm kiếm không dấu trên trường `searchText` (đã chuẩn hoá khi lưu).
 * "nguyen van" khớp "Nguyễn Văn An".
 */
export function searchCondition(search?: string): Record<string, unknown> {
  const q = search ? normalizeText(search) : '';
  return q ? { searchText: { $regex: escapeRegex(q) } } : {};
}

/** Chạy truy vấn có phân trang. Trả document (không lean) để `res.json` áp dụng toJSON. */
export async function paginate<T>(
  model: Model<T>,
  filter: Record<string, unknown>,
  query: { page: number; pageSize: number },
  sort: Record<string, SortOrder>,
) {
  const [items, total] = await Promise.all([
    model
      .find(filter as QueryFilter<T>)
      .sort(sort)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
    model.countDocuments(filter as QueryFilter<T>),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}
