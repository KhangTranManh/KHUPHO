import { z } from 'zod';
import { listQueryWithFilter } from '../../common/http/listQuery.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { ACTIVITY_KINDS, CULTURAL_RESULTS, SURVEY_SCOPES } from './community.constants.js';

const isoDate = z.string().regex(ISO_DATE_REGEX, 'Ngày không hợp lệ (yyyy-mm-dd)');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ (HH:mm)');
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

/** POST /surveys — cán bộ tạo khảo sát. */
export const createSurveySchema = z
  .object({
    title: z.string().trim().min(5).max(200),
    description: optionalText(1000),
    startDate: isoDate,
    endDate: isoDate,
    scope: z
      .object({
        type: z.enum(SURVEY_SCOPES),
        areaIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Mã khu vực không hợp lệ')).optional(),
      })
      .default({ type: 'all' }),
    questions: z
      .array(
        z.object({
          text: z.string().trim().min(3).max(300),
          options: z.array(z.string().trim().min(1).max(150)).min(2, 'Mỗi câu cần ít nhất 2 phương án').max(10),
        }),
      )
      .min(1, 'Cần ít nhất 1 câu hỏi')
      .max(20),
  })
  .refine((s) => s.endDate >= s.startDate, { path: ['endDate'], message: 'Ngày kết thúc phải sau ngày bắt đầu' });
export type CreateSurveyInput = z.output<typeof createSurveySchema>;

/** POST /surveys/:id/responses */
export const surveyResponseSchema = z.object({
  answers: z.array(z.number().int().min(0)).min(1),
});

/** POST /activities — cán bộ thêm lịch sinh hoạt. */
export const createActivitySchema = z.object({
  title: z.string().trim().min(5).max(200),
  kind: z.enum(ACTIVITY_KINDS),
  date: isoDate,
  startTime: time,
  endTime: time.optional(),
  location: z.string().trim().min(3).max(255),
  content: optionalText(2000),
  organizer: optionalText(150),
  minutes: optionalText(10_000),
});
export type CreateActivityInput = z.output<typeof createActivitySchema>;

/** GET /cultural-families?year=&filter=<kết quả>|all&search=&page=&pageSize= */
export const culturalFamilyQuerySchema = listQueryWithFilter(CULTURAL_RESULTS).extend({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
export type CulturalFamilyQuery = z.output<typeof culturalFamilyQuerySchema>;

/** PUT /cultural-families — cán bộ ghi kết quả bình xét cho một hộ trong một năm. */
export const upsertCulturalFamilySchema = z.object({
  householdId: z.string().regex(/^[a-f\d]{24}$/i, 'Mã hộ không hợp lệ'),
  year: z.number().int().min(2000).max(2100),
  result: z.enum(CULTURAL_RESULTS),
  note: optionalText(500),
});
export type UpsertCulturalFamilyInput = z.output<typeof upsertCulturalFamilySchema>;
