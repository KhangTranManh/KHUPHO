import { Types, isValidObjectId } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { searchCondition } from '../../common/http/listQuery.js';
import { tokenSearchCondition } from '../../common/security/fieldEncryption.js';
import { toResidentView } from '../households/household.mapper.js';
import { HouseholdModel } from '../households/household.model.js';
import type { ResidentListQuery } from './resident.schemas.js';

/**
 * Nhân khẩu nằm trong households.members → danh sách dùng aggregation $unwind.
 * Tìm kiếm: theo token (tên / CCCD / SĐT — đã mã hoá) hoặc mã hộ (bản rõ).
 * Sắp xếp theo hộ, chủ hộ đứng đầu.
 */
export async function listResidents(q: ResidentListQuery) {
  const memberMatch: Record<string, unknown> = {};
  if (q.filter !== 'all') memberMatch['members.residenceStatus'] = q.filter;
  if (q.category) memberMatch['members.categories'] = q.category;

  const search = q.search?.trim();
  const searchMatch = search
    ? { $or: [tokenSearchCondition('members.searchTokens', search), searchCondition(search)].filter((c) => Object.keys(c).length) }
    : {};

  const [result] = await HouseholdModel.aggregate<{ items: Record<string, unknown>[]; total: { n: number }[] }>([
    { $unwind: '$members' },
    { $match: { ...memberMatch, ...searchMatch } },
    { $addFields: { _isHead: { $cond: [{ $eq: ['$members.relation', 'chu_ho'] }, 0, 1] } } },
    { $sort: { code: 1, _isHead: 1, 'members.dateOfBirth': 1 } },
    {
      $facet: {
        items: [{ $skip: (q.page - 1) * q.pageSize }, { $limit: q.pageSize }],
        total: [{ $count: 'n' }],
      },
    },
  ]);

  return {
    items: result.items.map((h) => toResidentView(h, h.members as Record<string, unknown>)),
    total: result.total[0]?.n ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function getResident(memberId: string) {
  if (!isValidObjectId(memberId)) throw Errors.notFound('Không tìm thấy nhân khẩu');
  const household = await HouseholdModel.findOne({ 'members._id': new Types.ObjectId(memberId) });
  const member = household?.members.id(memberId);
  if (!household || !member) throw Errors.notFound('Không tìm thấy nhân khẩu');
  return toResidentView(household, member);
}
