/** Giá trị cố định của nhân khẩu. Giữ đồng bộ với frontend/src/features/residents/types.ts. */

export const GENDERS = ['nam', 'nu'] as const;

/** Tình trạng cư trú hiện tại (một giá trị); thay đổi được lưu vào residenceHistory. */
export const RESIDENCE_STATUSES = ['thuong_tru', 'tam_tru', 'tam_vang'] as const;
export type ResidenceStatus = (typeof RESIDENCE_STATUSES)[number];

/** Quan hệ với chủ hộ — "chu_ho" là chính chủ hộ (mỗi hộ đúng một người). */
export const RELATIONS = ['chu_ho', 'vo_chong', 'con', 'cha_me', 'ong_ba', 'anh_chi_em', 'chau', 'nguoi_thue', 'khac'] as const;
export type Relation = (typeof RELATIONS)[number];

/** Nhóm đối tượng — một người có thể thuộc nhiều nhóm. */
export const RESIDENT_CATEGORIES = [
  'nguoi_cao_tuoi',
  'tre_em',
  'hoc_sinh_sinh_vien',
  'nguoi_di_lam',
  'that_nghiep',
  'nguoi_khuyet_tat',
  'cuu_chien_binh',
] as const;
export type ResidentCategory = (typeof RESIDENT_CATEGORIES)[number];
