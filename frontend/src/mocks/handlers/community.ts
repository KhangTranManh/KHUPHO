/** Khảo sát, lịch sinh hoạt, gia đình văn hoá và hộ chính sách (hai mục sau suy ra từ households). */
import type { CulturalFamilyQuery } from '@/features/community/communityService';
import type { CulturalFamily } from '@/features/community/types';
import type { WelfareHousehold } from '@/features/welfare/types';
import { ApiError } from '@/services/api';
import { activities, surveys } from '../communityDb';
import { db } from '../db';
import { isStaff, matches, mockCurrentUser, notFound, paginate, passFilter, respond } from '../helpers';

/** Số năm liên tiếp đạt tính đến `year`. */
function consecutiveYears(titles: { year: number; result: string }[], year: number) {
  const dat = new Set(titles.filter((t) => t.result === 'dat').map((t) => t.year));
  let n = 0;
  while (dat.has(year - n)) n++;
  return n;
}

/** Cư dân chỉ thấy khảo sát toàn khu phố hoặc khu vực của hộ mình. */
function surveyVisible(scope: { type: 'all' | 'area'; areaIds?: string[] }) {
  const me = mockCurrentUser();
  if (isStaff(me) || scope.type === 'all') return true;
  const areaId = db.households.find((h) => h.id === me.householdId)?.areaId;
  return !!areaId && !!scope.areaIds?.includes(areaId);
}

export const communityHandlers = {
  surveys: () => respond(surveys.filter((s) => surveyVisible(s.scope)).map((s) => ({ ...s }))),

  submitSurvey: (surveyId: string, answers: number[]) => {
    const survey = surveys.find((s) => s.id === surveyId);
    if (!survey) return Promise.reject(notFound('khảo sát'));
    if (survey.status !== 'dang_mo') return Promise.reject(new ApiError(400, 'BAD_REQUEST', 'Khảo sát đã đóng'));
    if (survey.hasResponded) return Promise.reject(new ApiError(409, 'CONFLICT', 'Bạn đã trả lời khảo sát này'));
    answers.forEach((option, i) => survey.results[i] && survey.results[i][option]++);
    survey.responseCount++;
    survey.hasResponded = true;
    return respond({ ...survey });
  },

  activities: () => respond([...activities].sort((a, b) => a.date.localeCompare(b.date))),

  culturalFamilies: (q: CulturalFamilyQuery) => {
    const year = q.year ?? db.today.getFullYear();
    const rows = db.households.flatMap((h): CulturalFamily[] => {
      const title = h.culturalTitles.find((t) => t.year === year);
      if (!title) return [];
      return [
        {
          id: `${h.id}-${year}`,
          householdId: h.id,
          householdCode: h.code,
          headName: h.headName,
          areaName: h.areaName,
          year,
          result: title.result,
          note: title.note,
          consecutiveYears: consecutiveYears(h.culturalTitles, year),
        },
      ];
    });
    return respond(
      paginate(
        rows.filter((c) => passFilter(q.filter, c.result) && matches(q.search, c.householdCode, c.headName, c.areaName)),
        q,
      ),
    );
  },

  welfareHouseholds: () =>
    respond(
      db.households
        .filter((h) => h.householdType !== 'thuong')
        .map((h): WelfareHousehold => {
          const members = db.residents.filter((p) => p.householdId === h.id);
          return {
            ...h,
            elderlyCount: members.filter((p) => p.categories.includes('nguoi_cao_tuoi')).length,
            disabledCount: members.filter((p) => p.categories.includes('nguoi_khuyet_tat')).length,
          };
        }),
    ),
};
