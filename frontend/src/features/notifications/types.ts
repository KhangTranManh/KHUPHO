/** Thông báo gửi đến hộ (xác nhận đóng quỹ, nhắc đóng quỹ…). Giữ đồng bộ với backend/src/modules/notifications. */
export interface HouseholdNotification {
  id: string;
  kind: 'quy_dan_sinh' | 'nhac_dong_quy' | 'phan_anh' | 'thong_bao';
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
}
