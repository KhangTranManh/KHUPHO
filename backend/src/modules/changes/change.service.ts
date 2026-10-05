import { paginate, searchCondition } from '../../common/http/listQuery.js';
import { tokenSearchCondition } from '../../common/security/fieldEncryption.js';
import type { ChangeListQuery } from './change.schemas.js';
import { ResidentChangeModel } from './residentChange.model.js';

/** Mới nhất trước. Tìm theo mã hộ / cán bộ (bản rõ) hoặc tên nhân khẩu (token). */
export async function listChanges(q: ChangeListQuery) {
  const search = q.search?.trim();
  const filter: Record<string, unknown> = search
    ? { $or: [searchCondition(search), tokenSearchCondition('searchTokens', search)].filter((c) => Object.keys(c).length) }
    : {};
  if (q.filter !== 'all') filter.type = q.filter;
  return paginate(ResidentChangeModel, filter, q, { date: -1, _id: -1 });
}
