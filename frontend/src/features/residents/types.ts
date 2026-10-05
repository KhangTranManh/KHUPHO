import type { HousingType } from '@/features/households/types';

/** Nhân khẩu — nhúng trong hộ (households.members). Giữ đồng bộ với backend/src/modules/households/member.schema.ts. */

export type Gender = 'nam' | 'nu';

/** Tình trạng cư trú hiện tại (một giá trị) — thường trú là mặc định. */
export type ResidenceStatus = 'thuong_tru' | 'tam_tru' | 'tam_vang';

/** Một giai đoạn trong lịch sử cư trú. */
export interface ResidencePeriod {
  status: ResidenceStatus;
  from: string; // yyyy-mm-dd
  to?: string;
  note?: string; // lý do, nơi đến…
  recordedAt?: string;
  recordedBy?: string;
}

/** Vai trò trong hộ. */
export type HouseholdRole = 'chu_ho' | 'thanh_vien';

/** Quan hệ với chủ hộ — chỉ áp dụng cho thành viên. */
export type Relation = 'vo_chong' | 'con' | 'cha_me' | 'ong_ba' | 'anh_chi_em' | 'chau' | 'nguoi_thue' | 'khac';

/**
 * Phân loại đối tượng — một người có thể thuộc nhiều nhóm (VD: người cao tuổi + khuyết tật).
 * Thêm nhóm mới: thêm vào đây + RESIDENT_CATEGORY_* trong constants.ts.
 */
export type ResidentCategory =
  | 'nguoi_cao_tuoi'
  | 'tre_em'
  | 'hoc_sinh_sinh_vien'
  | 'nguoi_di_lam'
  | 'that_nghiep'
  | 'nguoi_khuyet_tat'
  | 'cuu_chien_binh';

export interface Resident {
  id: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string; // ISO yyyy-mm-dd — tuổi tính từ đây, không lưu riêng
  citizenId?: string; // CCCD — trẻ em có thể chưa có
  phone?: string;

  householdId: string;
  householdCode: string;
  housingType: HousingType;
  areaName: string;
  householdRole: HouseholdRole;
  relationToHead?: Relation;
  /** Thông tin liên hệ khác: người thân, Zalo, nơi làm việc… */
  otherContact?: string;

  residenceStatus: ResidenceStatus;
  /** Thời hạn của tình trạng hiện tại (tạm trú / tạm vắng). */
  residenceFrom?: string;
  residenceTo?: string;
  residenceHistory: ResidencePeriod[];
  categories: ResidentCategory[];
  registeredAt: string; // ngày đăng ký cư trú
}
