import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/types/common';
import type { Gender, HouseholdRole, Relation, ResidenceStatus, ResidentCategory } from './types';

export const GENDER_LABEL: Record<Gender, string> = {
  nam: 'Nam',
  nu: 'Nữ',
};

export const HOUSEHOLD_ROLE_LABEL: Record<HouseholdRole, string> = {
  chu_ho: 'Chủ hộ',
  thanh_vien: 'Thành viên',
};

export const RELATION_LABEL: Record<Relation, string> = {
  vo_chong: 'Vợ / chồng',
  con: 'Con',
  cha_me: 'Cha / mẹ',
  ong_ba: 'Ông / bà',
  anh_chi_em: 'Anh / chị / em',
  chau: 'Cháu',
  nguoi_thue: 'Người thuê nhà',
  khac: 'Khác',
};

export const RESIDENCE_STATUS_LABEL: Record<ResidenceStatus, string> = {
  thuong_tru: 'Thường trú',
  tam_tru: 'Tạm trú',
  tam_vang: 'Tạm vắng',
};

export const RESIDENCE_STATUS_TONE: Record<ResidenceStatus, Tone> = {
  thuong_tru: 'success',
  tam_tru: 'info',
  tam_vang: 'warning',
};

/** Thứ tự hiển thị các nhóm đối tượng. */
export const RESIDENT_CATEGORIES: ResidentCategory[] = [
  'nguoi_cao_tuoi',
  'tre_em',
  'hoc_sinh_sinh_vien',
  'nguoi_di_lam',
  'that_nghiep',
  'nguoi_khuyet_tat',
  'cuu_chien_binh',
];

export const RESIDENT_CATEGORY_LABEL: Record<ResidentCategory, string> = {
  nguoi_cao_tuoi: 'Người cao tuổi',
  tre_em: 'Trẻ em',
  hoc_sinh_sinh_vien: 'Học sinh, sinh viên',
  nguoi_di_lam: 'Người đi làm',
  that_nghiep: 'Chưa có việc làm',
  nguoi_khuyet_tat: 'Người khuyết tật',
  cuu_chien_binh: 'Cựu chiến binh',
};

export const RESIDENT_CATEGORY_HINT: Record<ResidentCategory, string> = {
  nguoi_cao_tuoi: 'Từ 60 tuổi',
  tre_em: 'Dưới 16 tuổi',
  hoc_sinh_sinh_vien: 'Đang đi học',
  nguoi_di_lam: 'Có việc làm',
  that_nghiep: 'Trong độ tuổi lao động',
  nguoi_khuyet_tat: 'Cần hỗ trợ',
  cuu_chien_binh: 'Hội CCB',
};

export const RESIDENT_CATEGORY_TONE: Record<ResidentCategory, Tone> = {
  nguoi_cao_tuoi: 'warning',
  tre_em: 'success',
  hoc_sinh_sinh_vien: 'info',
  nguoi_di_lam: 'primary',
  that_nghiep: 'secondary',
  nguoi_khuyet_tat: 'danger',
  cuu_chien_binh: 'dark',
};

export const RESIDENT_CATEGORY_ICON: Record<ResidentCategory, IconName> = {
  nguoi_cao_tuoi: 'heart',
  tre_em: 'smile',
  hoc_sinh_sinh_vien: 'book',
  nguoi_di_lam: 'briefcase',
  that_nghiep: 'user',
  nguoi_khuyet_tat: 'shield',
  cuu_chien_binh: 'award',
};

/** Ngưỡng tuổi dùng khi phân loại tự động. */
export const ELDERLY_AGE = 60;
export const CHILD_AGE = 16;

export const isResidentCategory = (v: string | null): v is ResidentCategory =>
  RESIDENT_CATEGORIES.includes(v as ResidentCategory);

/** "Chủ hộ" hoặc "Thành viên · Con". */
export function householdRoleText(role: HouseholdRole, relation?: Relation) {
  return role === 'chu_ho' || !relation
    ? HOUSEHOLD_ROLE_LABEL[role]
    : `${HOUSEHOLD_ROLE_LABEL[role]} · ${RELATION_LABEL[relation]}`;
}
