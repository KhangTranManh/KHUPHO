/** Biến động dân cư. Giữ đồng bộ với schema `bien_dong`. */

export type ChangeType = 'nhap_khau' | 'chuyen_di' | 'sinh' | 'tu_vong' | 'tam_tru' | 'tam_vang';

export interface ResidentChange {
  id: string;
  type: ChangeType;
  residentName: string;
  householdCode: string;
  date: string; // ISO
  officer: string; // cán bộ ghi nhận
  note?: string;
}
