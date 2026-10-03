/** Nhân khẩu. Giữ đồng bộ với schema `nhan_khau` ở database/. */

export type Gender = 'nam' | 'nu';

export type ResidenceStatus = 'thuong_tru' | 'tam_tru' | 'tam_vang';

/** Quan hệ với chủ hộ. */
export type Relation = 'chu_ho' | 'vo_chong' | 'con' | 'cha_me' | 'khac';

export interface Resident {
  id: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string; // ISO yyyy-mm-dd
  citizenId: string; // số định danh cá nhân (CCCD)
  householdId: string;
  householdCode: string;
  relation: Relation;
  groupName: string; // tổ dân phố
  residenceStatus: ResidenceStatus;
  registeredAt: string; // ngày đăng ký cư trú
}
