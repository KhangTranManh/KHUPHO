import { isValidObjectId } from 'mongoose';
import { nextSequence } from '../../common/db/counter.model.js';
import { Errors } from '../../common/errors/AppError.js';
import { logger } from '../../common/logger.js';
import { paginate, searchCondition } from '../../common/http/listQuery.js';
import { decryptMaybe, tokenSearchCondition } from '../../common/security/fieldEncryption.js';
import { findHouseholdOf, type Actor } from '../users/currentUser.js';
import { REPORT_CATEGORY_TYPE, type ReportCategory } from './report.constants.js';
import { ReportModel } from './report.model.js';
import type { CreateReportInput, CreateSosInput, ReportListQuery, UpdateReportInput } from './report.schemas.js';

const toPoint = (p?: { lat: number; lng: number }) => (p ? { type: 'Point' as const, coordinates: [p.lng, p.lat] } : undefined);

async function nextCode(prefix: 'PA' | 'SOS') {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`${prefix.toLowerCase()}-${year}`);
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/** Người gửi + hộ của người gửi (cư dân có liên kết nhân khẩu). */
async function reporterOf(actor: Actor, phone?: string) {
  const household = await findHouseholdOf(actor);
  return {
    reporter: {
      userId: actor.userId,
      householdId: household?._id,
      householdCode: household?.code,
      name: actor.fullName,
      phone: phone ?? actor.phone ?? decryptMaybe(household?.get('contactPhone', null, { getters: false })),
    },
    household,
  };
}

/** Cán bộ thấy tất cả; cư dân chỉ thấy của mình. `kind` lọc phản ánh thường / SOS. Mới nhất trước. */
export async function listReports(q: ReportListQuery, actor: Actor) {
  const search = q.search?.trim();
  const filter: Record<string, unknown> = search
    ? { $or: [searchCondition(search), tokenSearchCondition('searchTokens', search)].filter((c) => Object.keys(c).length) }
    : {};
  if (q.filter !== 'all') filter.status = q.filter;
  if (q.kind === 'sos') filter.type = 'sos';
  if (q.kind === 'phan_anh') filter.type = { $ne: 'sos' };
  if (!actor.isStaff) filter['reporter.userId'] = actor.userId;
  return paginate(ReportModel, filter, q, { createdAt: -1 });
}

export async function createReport(input: CreateReportInput, actor: Actor) {
  const { reporter } = await reporterOf(actor, input.reporterPhone);
  const category = input.category as ReportCategory;
  return ReportModel.create({
    code: await nextCode('PA'),
    category,
    severity: input.severity,
    title: input.title,
    description: input.description,
    images: input.images,
    location: { address: input.address, point: toPoint(input.point) },
    // Mặc định: an ninh → công an khu vực, còn lại → trưởng khu phố.
    assignedRole: input.assignedRole ?? (REPORT_CATEGORY_TYPE[category] === 'an_ninh' ? 'cong_an_kv' : 'truong_kp'),
    reporter,
    history: [{ byUserId: actor.userId, byName: actor.fullName, action: 'tao', toStatus: 'moi' }],
  });
}

/** SOS: không cần nhập gì — SĐT, hộ, địa chỉ lấy từ tài khoản. Luôn mức khẩn, giao công an khu vực. */
export async function createSos(input: CreateSosInput, actor: Actor) {
  const { reporter, household } = await reporterOf(actor, input.phone);
  const point = toPoint(input.point) ?? household?.location ?? undefined;
  const sos = await ReportModel.create({
    code: await nextCode('SOS'),
    category: 'sos',
    title: 'SOS khẩn cấp',
    description: input.message,
    location: { address: input.address ?? household?.address, point },
    assignedRole: 'cong_an_kv',
    reporter,
    history: [{ byUserId: actor.userId, byName: actor.fullName, action: 'tao', toStatus: 'moi' }],
  });
  // TODO: đẩy thông báo tức thời (SMS / push) tới cán bộ trực khi có kênh gửi.
  logger.warn({ reportId: sos.id, code: sos.code }, 'Có báo động SOS mới');
  return sos;
}

/** Cán bộ cập nhật; mỗi thay đổi ghi một dòng vào lịch sử xử lý. */
export async function updateReport(id: string, input: UpdateReportInput, actor: Actor) {
  const report = isValidObjectId(id) ? await ReportModel.findById(id) : null;
  if (!report) throw Errors.notFound('Không tìm thấy phản ánh');
  const by = { byUserId: actor.userId, byName: actor.fullName };

  if (input.assignedRole && input.assignedRole !== report.assignedRole) {
    report.assignedRole = input.assignedRole;
    report.history.push({ ...by, action: 'giao_xu_ly', note: input.note });
  }
  if (input.status && input.status !== report.status) {
    report.history.push({ ...by, action: 'cap_nhat_trang_thai', fromStatus: report.status, toStatus: input.status, note: input.note });
    report.status = input.status;
    report.resolvedAt = input.status === 'da_xong' ? new Date() : undefined;
    if (input.status === 'dang_xu_ly' && !report.assignee?.userId) {
      report.assignee = { userId: actor.userId as never, name: actor.fullName };
    }
  } else if (input.note && !input.assignedRole) {
    report.history.push({ ...by, action: 'ghi_chu', note: input.note });
  }
  return report.save();
}
