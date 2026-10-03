/** Đăng ký tạm trú / khai báo tạm vắng. Giữ đồng bộ với schema `tam_tru`, `tam_vang`. */

export type TemporaryKind = 'tam_tru' | 'tam_vang';

/** Tính từ `toDate` so với hôm nay, không lưu trong DB. */
export type TemporaryStatus = 'active' | 'expiring' | 'expired';

export interface TemporaryRecord {
  id: string;
  kind: TemporaryKind;
  fullName: string;
  citizenId: string;
  /** Tạm trú: địa chỉ tạm trú tại khu phố. Tạm vắng: nơi đến. */
  place: string;
  fromDate: string;
  toDate: string;
  reason: string;
}
