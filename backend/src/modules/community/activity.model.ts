import { Schema, model, type InferSchemaType } from 'mongoose';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { ACTIVITY_KINDS } from './community.constants.js';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Collection `activities` — lịch sinh hoạt khu phố: nội dung, thời gian, địa điểm,
 * biên bản / ghi chú sau buổi sinh hoạt.
 */
const activitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    kind: { type: String, enum: ACTIVITY_KINDS, required: true },
    content: { type: String, trim: true, maxlength: 2000 }, // nội dung
    date: { type: String, required: true, match: ISO_DATE_REGEX },
    startTime: { type: String, required: true, match: TIME_REGEX },
    endTime: { type: String, match: TIME_REGEX },
    location: { type: String, required: true, trim: true, maxlength: 255 },
    organizer: { type: String, trim: true, maxlength: 150 },
    /** Biên bản / ghi chú sau buổi sinh hoạt. */
    minutes: { type: String, trim: true, maxlength: 10_000 },
  },
  { timestamps: true, collection: 'activities' },
);

activitySchema.index({ date: 1 });

applyJsonTransform(activitySchema);

export type Activity = InferSchemaType<typeof activitySchema>;
export const ActivityModel = model('Activity', activitySchema);
