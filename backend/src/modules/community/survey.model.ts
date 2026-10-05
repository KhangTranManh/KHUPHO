import { Schema, model, type InferSchemaType } from 'mongoose';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { SURVEY_SCOPES, SURVEY_STATUSES } from './community.constants.js';

/** Câu hỏi chọn một phương án. */
const questionSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 300 },
  options: { type: [{ type: String, trim: true, maxlength: 150 }], required: true },
});
applyJsonTransform(questionSchema);

/** Phạm vi: toàn khu phố hoặc một số khu vực. */
const scopeSchema = new Schema(
  {
    type: { type: String, enum: SURVEY_SCOPES, required: true, default: 'all' },
    areaIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Area' }], default: undefined },
  },
  { _id: false },
);

/**
 * Collection `surveys` — khảo sát cư dân (tiêu đề, câu hỏi, thời hạn, phạm vi).
 * Quan hệ: Khảo sát 1─n Câu trả lời n─1 Người (`survey_responses`).
 * `results[i][j]` = số lượt chọn phương án j của câu i (cộng dồn bằng $inc).
 */
const surveySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: SURVEY_STATUSES, required: true, default: 'dang_mo' },
    startDate: { type: String, required: true, match: ISO_DATE_REGEX },
    endDate: { type: String, required: true, match: ISO_DATE_REGEX }, // thời hạn
    scope: { type: scopeSchema, required: true, default: () => ({ type: 'all' }) },
    questions: { type: [questionSchema], required: true },
    results: { type: [[Number]], default: [] },
    responseCount: { type: Number, default: 0 },
    createdById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'surveys' },
);

surveySchema.index({ status: 1, startDate: -1 });
surveySchema.index({ 'scope.type': 1, 'scope.areaIds': 1 });

/** Khởi tạo ma trận kết quả toàn 0 theo số câu / phương án. */
surveySchema.pre('validate', function () {
  if (this.isNew && this.results.length === 0) {
    this.set('results', this.questions.map((q) => q.options.map(() => 0)));
  }
});

applyJsonTransform(surveySchema, ['createdById']);

export type Survey = InferSchemaType<typeof surveySchema>;
export const SurveyModel = model('Survey', surveySchema);
