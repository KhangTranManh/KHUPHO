import { listSurveys } from '../community/community.service.js';
import { FundModel } from '../funds/fund.model.js';
import { amountDue } from '../funds/fund.service.js';
import { FundPaymentModel } from '../funds/fundPayment.model.js';
import { toHouseholdDetail } from '../households/household.mapper.js';
import { listMyNotifications } from '../notifications/notification.service.js';
import { countUnread, listPosts } from '../posts/post.service.js';
import { ReportModel } from '../reports/report.model.js';
import { findHouseholdOf, type Actor } from '../users/currentUser.js';
import type { ResidentDashboard } from './dashboard.types.js';

const LIST_LIMIT = 5;

/**
 * Dashboard cư dân: thông tin hộ của mình, phản ánh / SOS đã gửi, quỹ chưa đóng,
 * thông báo mới, khảo sát đang chờ trả lời. Chỉ dữ liệu của chính cư dân / hộ của họ.
 */
export async function getResidentDashboard(actor: Actor): Promise<ResidentDashboard> {
  const household = await findHouseholdOf(actor);

  const [myReports, openReportCount, funds, paidFundIds, posts, unreadPostCount, surveys, notifications] = await Promise.all([
    ReportModel.find({ 'reporter.userId': actor.userId }).sort({ createdAt: -1 }).limit(LIST_LIMIT),
    ReportModel.countDocuments({ 'reporter.userId': actor.userId, status: { $ne: 'da_xong' } }),
    FundModel.find({ status: 'mo' }).sort({ createdAt: 1 }),
    household
      ? FundPaymentModel.find({ householdId: household._id, status: 'da_dong' }).distinct('fundId')
      : Promise.resolve([]),
    listPosts({ page: 1, pageSize: LIST_LIMIT, filter: 'all' }, actor),
    countUnread(actor),
    listSurveys(actor),
    listMyNotifications(actor),
  ]);

  const paid = new Set(paidFundIds.map(String));
  const memberCount = household?.members.length ?? 0;

  return {
    household: household ? toHouseholdDetail(household) : null,
    myReports,
    openReportCount,
    unpaidFunds: household
      ? funds
          .filter((f) => !paid.has(f.id))
          .map((f) => ({
            fundId: f.id,
            name: f.name,
            code: f.code,
            amountDue: amountDue(f, memberCount),
            dueDate: f.dueDate ?? undefined,
          }))
      : [],
    latestPosts: posts.items,
    unreadPostCount,
    openSurveys: surveys
      .filter((s) => s.status === 'dang_mo' && !s.hasResponded)
      .map((s) => {
        const json = s as unknown as { id: string; title: string; endDate: string };
        return { id: json.id, title: json.title, endDate: json.endDate };
      }),
    notifications: notifications.slice(0, LIST_LIMIT),
  };
}
