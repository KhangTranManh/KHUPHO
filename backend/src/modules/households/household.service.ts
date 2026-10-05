import { isValidObjectId } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { searchCondition } from '../../common/http/listQuery.js';
import { tokenSearchCondition } from '../../common/security/fieldEncryption.js';
import { toHouseholdDetail, toHouseholdView } from './household.mapper.js';
import { HouseholdModel } from './household.model.js';
import type { HouseholdListQuery } from './household.schemas.js';

/** Ô tìm kiếm hộ: mã hộ / địa chỉ (bản rõ) HOẶC tên / SĐT thành viên (token đã mã hoá). */
export function householdSearchCondition(search?: string): Record<string, unknown> {
  const text = searchCondition(search);
  const tokens = tokenSearchCondition('searchTokens', search);
  if (!search?.trim()) return {};
  return { $or: [text, ...(Object.keys(tokens).length ? [tokens] : [])] };
}

export async function listHouseholds(q: HouseholdListQuery) {
  const filter: Record<string, unknown> = householdSearchCondition(q.search);
  if (q.filter !== 'all') filter.housingType = q.filter;
  const [docs, total] = await Promise.all([
    HouseholdModel.find(filter)
      .sort({ areaName: 1, code: 1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    HouseholdModel.countDocuments(filter),
  ]);
  return { items: docs.map(toHouseholdView), total, page: q.page, pageSize: q.pageSize };
}

export async function findHouseholdOrThrow(id: string) {
  const household = isValidObjectId(id) ? await HouseholdModel.findById(id) : null;
  if (!household) throw Errors.notFound('Không tìm thấy hộ gia đình');
  return household;
}

/** Hộ kèm toàn bộ nhân khẩu (đã giải mã). */
export async function getHousehold(id: string) {
  return toHouseholdDetail(await findHouseholdOrThrow(id));
}
