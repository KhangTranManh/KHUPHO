import type { Types } from 'mongoose';
import { findHouseholdOf, type Actor } from '../users/currentUser.js';
import { NotificationModel, type NOTIFICATION_KINDS } from './notification.model.js';

const MY_LIMIT = 50;

/** Gửi thông báo đến một hộ. Các module khác gọi hàm này (VD: funds sau khi xác nhận đã đóng). */
export function notifyHousehold(
  householdId: Types.ObjectId,
  n: { kind: (typeof NOTIFICATION_KINDS)[number]; title: string; body: string; refId?: Types.ObjectId },
) {
  return NotificationModel.create({ householdId, ...n });
}

/** Thông báo của hộ mà người đang đăng nhập thuộc về (người dân). Không có hộ → rỗng. */
export async function listMyNotifications(actor: Actor) {
  const household = await findHouseholdOf(actor);
  if (!household) return [];
  return NotificationModel.find({ householdId: household._id }).sort({ createdAt: -1 }).limit(MY_LIMIT);
}
