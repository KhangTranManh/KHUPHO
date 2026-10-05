/** Dashboard công an khu vực và cư dân (dashboard trưởng KP ở population.ts). */
import type { PoliceDashboard, ResidentDashboard, TemporaryResidentItem } from '@/features/dashboard/types';
import type { HouseholdNotification } from '@/features/notifications/types';
import type { ReportStatus, ReportType } from '@/features/reports/types';
import { fundPayments, funds, reports } from '../communityDb';
import { db } from '../db';
import { mockCurrentUser, respond } from '../helpers';
import { communityHandlers } from './community';
import { informationHandlers } from './information';

const vnd = new Intl.NumberFormat('vi-VN');

function buildPoliceDashboard(): PoliceDashboard {
  const open = reports.filter((r) => r.status !== 'da_xong');
  const nonSos = reports.filter((r) => r.type !== 'sos');
  const countType = (t: ReportType) => open.filter((r) => r.type === t).length;
  const countStatus = (s: ReportStatus) => nonSos.filter((r) => r.status === s).length;
  const rank = (r: (typeof reports)[number]) => (r.assignedRole === 'cong_an_kv' ? 0 : 2) + (r.severity === 'khan' ? 0 : 1);
  const pending = open.filter((r) => r.type !== 'sos');

  const temporary = db.residents
    .filter((p) => p.residenceStatus !== 'thuong_tru')
    .map(
      (p): TemporaryResidentItem => ({
        residentId: p.id,
        fullName: p.fullName,
        householdId: p.householdId,
        householdCode: p.householdCode,
        areaName: p.areaName,
        residenceStatus: p.residenceStatus as TemporaryResidentItem['residenceStatus'],
        residenceFrom: p.residenceFrom,
        residenceTo: p.residenceTo,
        note: p.residenceHistory.at(-1)?.note,
      }),
    );
  const countIn = (areaName: string, status?: string) =>
    db.residents.filter((p) => p.areaName === areaName && (!status || p.residenceStatus === status)).length;

  return {
    openSosCount: countType('sos'),
    newReportCount: countStatus('moi'),
    temporaryResidents: temporary.filter((t) => t.residenceStatus === 'tam_tru').length,
    temporaryAbsent: temporary.filter((t) => t.residenceStatus === 'tam_vang').length,
    openByType: { an_ninh: countType('an_ninh'), mat_an_toan: countType('mat_an_toan'), hu_hong_dan_sinh: countType('hu_hong_dan_sinh'), sos: countType('sos') },
    byStatus: { moi: countStatus('moi'), dang_xu_ly: countStatus('dang_xu_ly'), da_xong: countStatus('da_xong') },
    openSos: open.filter((r) => r.type === 'sos').slice(0, 6),
    pendingReports: [...pending].sort((a, b) => rank(a) - rank(b)).slice(0, 6),
    pendingReportCount: pending.length,
    recentTemporary: temporary.sort((a, b) => (b.residenceFrom ?? '').localeCompare(a.residenceFrom ?? '')).slice(0, 8),
    areas: db.areas.map((a) => ({
      id: a.id,
      name: a.name,
      housingType: a.housingType,
      managerName: a.managerName,
      households: db.households.filter((h) => h.areaId === a.id).length,
      residents: countIn(a.name),
      temporaryResidents: countIn(a.name, 'tam_tru'),
      temporaryAbsent: countIn(a.name, 'tam_vang'),
    })),
  };
}

async function buildResidentDashboard(): Promise<ResidentDashboard> {
  const me = mockCurrentUser();
  const household = db.households.find((h) => h.id === me.householdId);
  const members = household ? db.residents.filter((p) => p.householdId === household.id) : [];
  const myReports = reports.filter((r) => r.reporter.name === me.fullName);
  const paid = household ? fundPayments.filter((p) => p.householdId === household.id && p.status === 'da_dong') : [];
  const paidIds = new Set(paid.map((p) => p.fundId));
  const posts = (await informationHandlers.posts({ page: 1, pageSize: 100 })).items;
  const surveys = await communityHandlers.surveys();

  // Thông báo đến hộ: xác nhận các khoản đã đóng (bản thật lấy từ collection notifications).
  const notifications: HouseholdNotification[] = paid
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
    .slice(0, 3)
    .map((p) => {
      const fund = funds.find((f) => f.id === p.fundId)!;
      return {
        id: `nt-${p.id}`,
        kind: 'quy_dan_sinh',
        title: `Xác nhận đóng quỹ ${fund.name}`,
        body: `Hộ ${p.householdCode} đã đóng ${vnd.format(p.amount)} đ. Cảm ơn gia đình!`,
        createdAt: p.paidAt ?? new Date().toISOString(),
      };
    });

  return {
    household: household ? { ...household, members } : null,
    myReports: myReports.slice(0, 5),
    openReportCount: myReports.filter((r) => r.status !== 'da_xong').length,
    unpaidFunds: household
      ? funds
          .filter((f) => f.status === 'mo' && !paidIds.has(f.id))
          .map((f) => ({
            fundId: f.id,
            name: f.name,
            code: f.code,
            amountDue: f.defaultAmount === null ? null : f.unit === 'nguoi' ? f.defaultAmount * members.length : f.defaultAmount,
            dueDate: f.dueDate,
          }))
      : [],
    latestPosts: posts.slice(0, 5),
    unreadPostCount: posts.filter((p) => !p.isRead).length,
    openSurveys: surveys.filter((s) => s.status === 'dang_mo' && !s.hasResponded).map((s) => ({ id: s.id, title: s.title, endDate: s.endDate })),
    notifications,
  };
}

export const dashboardHandlers = {
  policeDashboard: () => respond(buildPoliceDashboard()),
  residentDashboard: () => buildResidentDashboard().then(respond),
};
