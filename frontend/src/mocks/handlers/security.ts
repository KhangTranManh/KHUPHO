/** Phản ánh + SOS (cùng một danh sách, như collection `reports` ở backend). */
import { REPORT_CATEGORY_TYPE, defaultHandlerFor } from '@/features/reports/constants';
import type { ReportQuery } from '@/features/reports/reportService';
import type { CreateReportInput, CreateSosInput, Report, UpdateReportInput } from '@/features/reports/types';
import { reports } from '../communityDb';
import { db } from '../db';
import { isStaff, matches, mockCurrentUser, nextId, notFound, paginate, passFilter, respond } from '../helpers';

const year = db.today.getFullYear();
const nextCode = (prefix: 'PA' | 'SOS') =>
  `${prefix}-${year}-${String(reports.filter((r) => r.code.startsWith(prefix)).length + 1).padStart(4, '0')}`;

/** Người gửi + hộ (tài khoản cư dân demo liên kết hộ qua householdId). */
function reporterNow(phone?: string) {
  const me = mockCurrentUser();
  const household = db.households.find((h) => h.id === me.householdId);
  return { me, household, reporter: { name: me.fullName, phone: phone ?? me.phone, householdCode: household?.code } };
}

export const securityHandlers = {
  reports: (q: ReportQuery) => {
    const me = mockCurrentUser();
    const items = reports.filter(
      (rp) =>
        (isStaff(me) || rp.reporter.name === me.fullName) &&
        (!q.kind || (q.kind === 'sos') === (rp.type === 'sos')) &&
        passFilter(q.filter, rp.status) &&
        matches(q.search, rp.code, rp.title, rp.location?.address, rp.reporter.name),
    );
    return respond(paginate(items, q));
  },

  createReport: (input: CreateReportInput) => {
    const { me, reporter } = reporterNow(input.reporterPhone);
    const now = new Date().toISOString();
    const report: Report = {
      id: nextId('rp'),
      code: nextCode('PA'),
      type: REPORT_CATEGORY_TYPE[input.category],
      category: input.category,
      severity: input.severity,
      title: input.title,
      description: input.description,
      images: input.images ?? [],
      location: { address: input.address },
      reporter,
      status: 'moi',
      assignedRole: input.assignedRole ?? defaultHandlerFor(input.category),
      history: [{ at: now, byName: me.fullName, action: 'tao', toStatus: 'moi' }],
      createdAt: now,
      updatedAt: now,
    };
    reports.unshift(report);
    return respond(report);
  },

  sendSos: (input: CreateSosInput) => {
    const { me, household, reporter } = reporterNow(input.phone);
    const now = new Date().toISOString();
    const sos: Report = {
      id: nextId('rp'),
      code: nextCode('SOS'),
      type: 'sos',
      category: 'sos',
      severity: 'khan',
      title: 'SOS khẩn cấp',
      description: input.message,
      images: [],
      location: { address: input.address ?? household?.address },
      reporter,
      status: 'moi',
      assignedRole: 'cong_an_kv',
      history: [{ at: now, byName: me.fullName, action: 'tao', toStatus: 'moi' }],
      createdAt: now,
      updatedAt: now,
    };
    reports.unshift(sos);
    return respond(sos);
  },

  /** Mỗi thay đổi ghi một dòng lịch sử, giống backend. */
  updateReport: (id: string, input: UpdateReportInput) => {
    const report = reports.find((rp) => rp.id === id);
    if (!report) return Promise.reject(notFound('phản ánh'));
    const me = mockCurrentUser();
    const at = new Date().toISOString();
    if (input.assignedRole && input.assignedRole !== report.assignedRole) {
      report.assignedRole = input.assignedRole;
      report.history.push({ at, byName: me.fullName, action: 'giao_xu_ly', note: input.note });
    }
    if (input.status && input.status !== report.status) {
      report.history.push({ at, byName: me.fullName, action: 'cap_nhat_trang_thai', fromStatus: report.status, toStatus: input.status, note: input.note });
      report.status = input.status;
      report.resolvedAt = input.status === 'da_xong' ? at : undefined;
      if (input.status === 'dang_xu_ly' && !report.assignee) report.assignee = { name: me.fullName };
    } else if (input.note && !input.assignedRole) {
      report.history.push({ at, byName: me.fullName, action: 'ghi_chu', note: input.note });
    }
    report.updatedAt = at;
    return respond(structuredClone(report));
  },
};
