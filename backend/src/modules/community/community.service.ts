import { Types, isValidObjectId } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { toISODate } from '../../common/utils/date.js';
import { householdSearchCondition } from '../households/household.service.js';
import { toHouseholdView } from '../households/household.mapper.js';
import { HouseholdModel } from '../households/household.model.js';
import { residentContext, type Actor } from '../users/currentUser.js';
import { ActivityModel } from './activity.model.js';
import type {
  CreateActivityInput,
  CreateSurveyInput,
  CulturalFamilyQuery,
  UpsertCulturalFamilyInput,
} from './community.schemas.js';
import { SurveyModel } from './survey.model.js';
import { SurveyResponseModel } from './surveyResponse.model.js';

/* ---------- Khảo sát ---------- */

/** Các trường của document khảo sát mà toSurveyView cần. */
interface SurveyDoc {
  id: string;
  status: string;
  endDate: string;
  toJSON(): unknown;
}

/** Trả survey kèm `hasResponded`; tự coi là "đã đóng" khi quá thời hạn. */
function toSurveyView(survey: SurveyDoc, responded: Set<string>) {
  const expired = survey.endDate < toISODate(new Date());
  return {
    ...(survey.toJSON() as object),
    status: expired ? 'da_dong' : survey.status,
    hasResponded: responded.has(survey.id),
  };
}

/** Cư dân chỉ thấy khảo sát toàn khu phố hoặc của khu vực mình. */
async function scopeCondition(actor: Actor): Promise<Record<string, unknown>> {
  if (actor.isStaff) return {};
  const { areaId } = await residentContext(actor);
  return { $or: [{ 'scope.type': 'all' }, ...(areaId ? [{ 'scope.type': 'area', 'scope.areaIds': areaId }] : [])] };
}

export async function listSurveys(actor: Actor) {
  const [surveys, respondedIds] = await Promise.all([
    SurveyModel.find(await scopeCondition(actor)).sort({ status: 1, startDate: -1 }),
    SurveyResponseModel.find({ userId: actor.userId }).distinct('surveyId'),
  ]);
  const responded = new Set(respondedIds.map(String));
  return surveys.map((s) => toSurveyView(s, responded));
}

export function createSurvey(input: CreateSurveyInput, actor: Actor) {
  return SurveyModel.create({
    ...input,
    scope: {
      type: input.scope.type,
      areaIds: input.scope.type === 'area' ? input.scope.areaIds?.map((id) => new Types.ObjectId(id)) : undefined,
    },
    createdById: actor.userId,
  });
}

/** Ghi câu trả lời (mỗi tài khoản một lần) rồi cộng dồn kết quả bằng $inc. */
export async function respondSurvey(surveyId: string, answers: number[], actor: Actor) {
  const survey = isValidObjectId(surveyId) ? await SurveyModel.findOne({ _id: surveyId, ...(await scopeCondition(actor)) }) : null;
  if (!survey) throw Errors.notFound('Không tìm thấy khảo sát');
  if (survey.status !== 'dang_mo' || survey.endDate < toISODate(new Date())) {
    throw Errors.badRequest('Khảo sát đã đóng');
  }
  const valid =
    answers.length === survey.questions.length &&
    answers.every((a, i) => a < survey.questions[i].options.length);
  if (!valid) throw Errors.badRequest('Câu trả lời không khớp với câu hỏi');

  try {
    await SurveyResponseModel.create({ surveyId: survey._id, userId: actor.userId, answers });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw Errors.conflict('Bạn đã trả lời khảo sát này');
    throw err;
  }

  const inc = Object.fromEntries(answers.map((a, i) => [`results.${i}.${a}`, 1]));
  const updated = await SurveyModel.findByIdAndUpdate(
    survey._id,
    { $inc: { ...inc, responseCount: 1 } },
    { returnDocument: 'after' },
  );
  return toSurveyView(updated!, new Set([survey.id]));
}

/* ---------- Lịch sinh hoạt ---------- */

export const listActivities = () => ActivityModel.find().sort({ date: 1, startTime: 1 });

export const createActivity = (input: CreateActivityInput) => ActivityModel.create(input);

/* ---------- Gia đình văn hoá (nhúng trong households.culturalTitles) ---------- */

/** Số năm liên tiếp đạt tính đến `year` (đếm lùi từ năm đó). */
function consecutiveYears(titles: { year: number; result: string }[], year: number) {
  const dat = new Set(titles.filter((t) => t.result === 'dat').map((t) => t.year));
  let n = 0;
  while (dat.has(year - n)) n++;
  return n;
}

/** Danh sách bình xét một năm — một dòng mỗi hộ có danh hiệu năm đó. */
export async function listCulturalFamilies(q: CulturalFamilyQuery) {
  const year = q.year ?? new Date().getFullYear();
  const titleMatch: Record<string, unknown> = { year };
  if (q.filter !== 'all') titleMatch.result = q.filter;
  const filter = { ...householdSearchCondition(q.search), culturalTitles: { $elemMatch: titleMatch } };

  const [households, total] = await Promise.all([
    HouseholdModel.find(filter).sort({ areaName: 1, code: 1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(),
    HouseholdModel.countDocuments(filter),
  ]);
  return {
    items: households.map((h) => {
      const view = toHouseholdView(h);
      const title = h.culturalTitles.find((t) => t.year === year)!;
      return {
        id: `${view.id}-${year}`,
        householdId: view.id,
        householdCode: view.code,
        headName: view.headName,
        areaName: view.areaName,
        year,
        result: title.result,
        note: title.note,
        consecutiveYears: consecutiveYears(h.culturalTitles, year),
      };
    }),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

/** Ghi / cập nhật danh hiệu một năm cho một hộ. */
export async function upsertCulturalFamily(input: UpsertCulturalFamilyInput) {
  const household = await HouseholdModel.findById(input.householdId);
  if (!household) throw Errors.notFound('Không tìm thấy hộ gia đình');

  const existing = household.culturalTitles.find((t) => t.year === input.year);
  if (existing) existing.set({ result: input.result, note: input.note });
  else household.culturalTitles.push({ year: input.year, result: input.result, note: input.note });
  await household.save();

  const view = toHouseholdView(household);
  return {
    householdId: view.id,
    householdCode: view.code,
    headName: view.headName,
    areaName: view.areaName,
    year: input.year,
    result: input.result,
    note: input.note,
    consecutiveYears: consecutiveYears(household.culturalTitles, input.year),
  };
}
