/**
 * Dữ liệu mẫu — hoạt động khu phố: phản ánh & SOS (kèm lịch sử xử lý), bài đăng + lượt đọc,
 * khoản đóng quỹ + thông báo đến hộ, khảo sát + câu trả lời, lịch sinh hoạt.
 */
import type { Types } from 'mongoose';
import { nextSequence } from '../../../../src/common/db/counter.model.js';
import { addDays, toISODate } from '../../../../src/common/utils/date.js';
import { ActivityModel } from '../../../../src/modules/community/activity.model.js';
import { SurveyModel } from '../../../../src/modules/community/survey.model.js';
import { SurveyResponseModel } from '../../../../src/modules/community/surveyResponse.model.js';
import { FundModel } from '../../../../src/modules/funds/fund.model.js';
import { FundPaymentModel } from '../../../../src/modules/funds/fundPayment.model.js';
import type { HouseholdDocument } from '../../../../src/modules/households/household.model.js';
import { NotificationModel } from '../../../../src/modules/notifications/notification.model.js';
import { PostModel } from '../../../../src/modules/posts/post.model.js';
import { PostReadModel } from '../../../../src/modules/posts/postRead.model.js';
import { ReportModel } from '../../../../src/modules/reports/report.model.js';
import type { Random } from '../../lib/random.js';
import { createEach } from '../../lib/run.js';
import { ACTIVITIES, POSTS, REPORTS, SOS_ALERTS, SURVEYS } from './data.js';

export interface Actor {
  _id: Types.ObjectId;
  name: string;
}

export interface CommunityContext {
  r: Random;
  today: Date;
  households: HouseholdDocument[];
  leader: Actor;
  police: Actor;
  /** Tài khoản cư dân mẫu (đã liên kết hộ đầu tiên) — có thể chưa có. */
  resident?: Actor;
}

const iso = toISODate;
const vnd = new Intl.NumberFormat('vi-VN');

async function nextCode(prefix: 'PA' | 'SOS', year: number) {
  const seq = await nextSequence(`${prefix.toLowerCase()}-${year}`);
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

const headOf = (h: HouseholdDocument) => h.members.find((m) => m.relation === 'chu_ho')!;

/** Phản ánh + SOS. Hộ đầu tiên (cư dân mẫu) gửi 2 phản ánh; các hộ khác do trưởng KP ghi nhận hộ. */
export async function seedReports({ r, today, households, leader, police, resident }: CommunityContext) {
  const items = [
    ...REPORTS.map((t) => ({ ...t, sos: false })),
    ...SOS_ALERTS.map((t) => ({ ...t, category: 'sos' as const, sos: true })),
  ];

  let count = 0;
  for (const [i, item] of items.entries()) {
    const fromResident = resident && i < 2;
    const household = fromResident ? households[0] : r.pick(households);
    const head = headOf(household);
    const createdAt = addDays(today, -(item.sos ? r.int(0, 2) : r.int(0, 40)));
    createdAt.setHours(r.int(6, 22), r.int(0, 59));

    // Trạng thái: phản ánh cũ đã xong, mới thì còn mở; SOS gần đây chưa xử lý.
    const ageDays = (today.getTime() - createdAt.getTime()) / 86_400_000;
    const status = item.sos ? (i % 3 === 0 ? 'dang_xu_ly' : 'moi') : ageDays > 20 ? 'da_xong' : ageDays > 5 ? 'dang_xu_ly' : 'moi';
    const handler = item.sos || item.category === 'trom_cap' || item.category === 'lua_dao' || item.category === 'doi_tuong_tinh_nghi' ? police : leader;
    const assignedRole = handler === police ? 'cong_an_kv' : 'truong_kp';
    const reporterId = fromResident ? resident._id : leader._id;
    const reporterName = fromResident ? resident.name : (head.get('fullName') as string);

    const history: Record<string, unknown>[] = [
      { at: createdAt, byUserId: reporterId, byName: fromResident ? reporterName : leader.name, action: 'tao', toStatus: 'moi' },
    ];
    if (status !== 'moi') {
      const at = addDays(createdAt, 1);
      history.push({ at, byUserId: leader._id, byName: leader.name, action: 'giao_xu_ly', note: `Giao ${handler === police ? 'Công an khu vực' : 'Trưởng khu phố'} xử lý` });
      history.push({ at, byUserId: handler._id, byName: handler.name, action: 'cap_nhat_trang_thai', fromStatus: 'moi', toStatus: 'dang_xu_ly' });
    }
    const resolvedAt = status === 'da_xong' ? addDays(createdAt, r.int(2, 6)) : undefined;
    if (resolvedAt) {
      history.push({ at: resolvedAt, byUserId: handler._id, byName: handler.name, action: 'cap_nhat_trang_thai', fromStatus: 'dang_xu_ly', toStatus: 'da_xong', note: 'Đã kiểm tra và xử lý xong' });
    }

    const report = new ReportModel({
      code: await nextCode(item.sos ? 'SOS' : 'PA', createdAt.getFullYear()),
      category: item.category,
      severity: !item.sos && r.chance(0.2) ? 'khan' : 'thuong',
      title: item.title,
      description: item.description,
      location: { address: household.address, point: household.location ?? undefined },
      reporter: {
        userId: reporterId,
        householdId: household._id,
        householdCode: household.code,
        name: reporterName,
        phone: head.get('phone') as string | undefined,
      },
      status,
      assignedRole: status === 'moi' ? (item.sos ? 'cong_an_kv' : undefined) : assignedRole,
      assignee: status === 'moi' ? undefined : { userId: handler._id, name: handler.name },
      resolvedAt,
      history,
    });
    report.set('createdAt', createdAt);
    report.set('updatedAt', resolvedAt ?? history.at(-1)!.at);
    await report.save({ timestamps: false });
    count++;
  }
  return count;
}

/** Bài đăng; tài khoản cư dân mẫu đã đọc một nửa. */
export async function seedPosts({ today, leader, resident }: CommunityContext) {
  const posts = await createEach(
    PostModel,
    POSTS.map((p) => ({
      kind: p.kind,
      category: p.category,
      title: p.title,
      content: p.content,
      pinned: 'pinned' in p ? p.pinned : false,
      eventDate: 'eventIn' in p ? iso(addDays(today, p.eventIn)) : undefined,
      eventTime: 'eventTime' in p ? p.eventTime : undefined,
      location: 'location' in p ? p.location : undefined,
      audience: 'audienceGroup' in p ? { scope: 'group', categories: [p.audienceGroup] } : { scope: 'all' },
      publishedAt: addDays(today, p.days),
      author: { userId: leader._id, name: leader.name },
    })),
  );

  if (resident) {
    const read = posts.filter((_, i) => i % 2 === 1);
    await PostReadModel.insertMany(read.map((p) => ({ postId: p._id, userId: resident._id, readAt: addDays(p.publishedAt, 1) })));
    await PostModel.updateMany({ _id: { $in: read.map((p) => p._id) } }, { $inc: { readCount: 1 } });
  }
  return posts.length;
}

/**
 * Khoản đóng quỹ năm nay: khoảng 60% hộ đã đóng mỗi quỹ có mức thu.
 * Hộ của cư dân mẫu đóng 3 quỹ đầu (để dashboard cư dân có cả "đã đóng" lẫn "cần đóng").
 */
export async function seedFundPayments({ r, today, households, leader }: CommunityContext) {
  const funds = await FundModel.find({ 'period.year': today.getFullYear(), defaultAmount: { $ne: null } }).sort({ createdAt: 1 });
  const payments: Record<string, unknown>[] = [];
  const notifications: Record<string, unknown>[] = [];

  for (const [fi, fund] of funds.entries()) {
    for (const [hi, h] of households.entries()) {
      const paid = hi === 0 ? fi < 3 : r.chance(0.6);
      if (!paid) continue;
      const amount = fund.unit === 'nguoi' ? fund.defaultAmount! * h.members.length : fund.defaultAmount!;
      const paidAt = addDays(today, -r.int(1, 120));
      const method = r.chance(0.55) ? 'qr' : 'tien_mat';
      payments.push({
        fundId: fund._id,
        householdId: h._id,
        householdCode: h.code,
        amount,
        status: 'da_dong',
        method,
        transactionCode: method === 'qr' ? `FT${paidAt.getFullYear()}${String(r.int(0, 99_999_999)).padStart(8, '0')}` : undefined,
        paidAt,
        confirmedBy: { userId: leader._id, name: leader.name },
      });
      notifications.push({
        householdId: h._id,
        kind: 'quy_dan_sinh',
        title: `Xác nhận đóng quỹ ${fund.name}`,
        body: `Hộ ${h.code} đã đóng ${vnd.format(amount)} đ. Cảm ơn gia đình!`,
        createdAt: paidAt,
        updatedAt: paidAt,
      });
    }
  }
  const saved = await FundPaymentModel.insertMany(payments);
  saved.forEach((p, i) => (notifications[i].refId = p._id));
  await NotificationModel.insertMany(notifications, { lean: true });
  return { payments: saved.length, funds: funds.length };
}

/**
 * Khảo sát: 2 đang mở (cư dân mẫu chưa trả lời → hiện trên dashboard), 1 đã đóng (cư dân mẫu đã trả lời).
 * Chỉ tạo câu trả lời của tài khoản có thật để `results` khớp với `survey_responses`.
 */
export async function seedSurveys({ r, today, leader, resident }: CommunityContext) {
  let responses = 0;
  for (const s of SURVEYS) {
    const endDate = iso(addDays(today, s.endIn));
    const survey = await SurveyModel.create({
      title: s.title,
      description: s.description,
      startDate: iso(addDays(today, s.startIn)),
      endDate,
      status: s.endIn < 0 ? 'da_dong' : 'dang_mo',
      questions: s.questions,
      createdById: leader._id,
    });

    const respondents = s.endIn < 0 && resident ? [resident._id] : [];
    const results = survey.questions.map((q) => q.options.map(() => 0));
    const docs = respondents.map((userId) => {
      const answers = survey.questions.map((q, qi) => {
        const pick = r.int(0, q.options.length - 1);
        results[qi][pick]++;
        return pick;
      });
      return { surveyId: survey._id, userId, answers };
    });
    await SurveyResponseModel.insertMany(docs);
    survey.set('results', results);
    survey.responseCount = docs.length;
    await survey.save();
    responses += docs.length;
  }
  return { surveys: SURVEYS.length, responses };
}

export async function seedActivities({ today }: CommunityContext) {
  await createEach(
    ActivityModel,
    ACTIVITIES.map(({ in: offset, ...a }) => ({ ...a, date: iso(addDays(today, offset)) })),
  );
  return ACTIVITIES.length;
}
