import { Schema, model, type InferSchemaType } from 'mongoose';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';

export const NOTIFICATION_KINDS = ['quy_dan_sinh', 'nhac_dong_quy', 'phan_anh', 'thong_bao'] as const;

/**
 * Collection `notifications` — thông báo gửi đến một hộ gia đình (VD: xác nhận đã đóng quỹ).
 * Cư dân xem qua GET /api/notifications (hộ lấy từ liên kết nhân khẩu của tài khoản).
 */
const notificationSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    /** Bản ghi liên quan (khoản thu, phản ánh…). */
    refId: { type: Schema.Types.ObjectId },
    readAt: { type: Date },
  },
  { timestamps: true, collection: 'notifications' },
);

notificationSchema.index({ householdId: 1, createdAt: -1 });

applyJsonTransform(notificationSchema);

export type Notification = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model('Notification', notificationSchema);
