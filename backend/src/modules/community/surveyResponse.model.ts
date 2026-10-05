import { Schema, model } from 'mongoose';

/**
 * Collection `survey_responses` — câu trả lời của từng tài khoản.
 * Unique (surveyId, userId) → mỗi người trả lời một lần.
 */
const surveyResponseSchema = new Schema(
  {
    surveyId: { type: Schema.Types.ObjectId, ref: 'Survey', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** answers[i] = chỉ số phương án chọn ở câu i. */
    answers: { type: [Number], required: true },
  },
  { timestamps: true, collection: 'survey_responses' },
);

surveyResponseSchema.index({ surveyId: 1, userId: 1 }, { unique: true });
surveyResponseSchema.index({ userId: 1 });

export const SurveyResponseModel = model('SurveyResponse', surveyResponseSchema);
