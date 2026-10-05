import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/types/common';
import type { HouseholdType, HousingType } from './types';

/** Thứ tự hiển thị. */
export const HOUSING_TYPES: HousingType[] = ['thap_tang', 'cao_tang'];

export const HOUSING_TYPE_LABEL: Record<HousingType, string> = {
  thap_tang: 'Thấp tầng',
  cao_tang: 'Cao tầng',
};

export const HOUSING_TYPE_DESCRIPTION: Record<HousingType, string> = {
  thap_tang: 'Nhà phố, nhà trong hẻm',
  cao_tang: 'Căn hộ chung cư',
};

export const HOUSING_TYPE_ICON: Record<HousingType, IconName> = {
  thap_tang: 'home',
  cao_tang: 'building',
};

export const HOUSING_TYPE_TONE: Record<HousingType, Tone> = {
  thap_tang: 'primary',
  cao_tang: 'dark',
};

/** Người phụ trách địa bàn. */
export const AREA_MANAGER_LABEL: Record<HousingType, string> = {
  thap_tang: 'Tổ trưởng',
  cao_tang: 'Trưởng ban quản trị',
};

export const isHousingType = (v: string | null): v is HousingType => v === 'thap_tang' || v === 'cao_tang';

export const HOUSEHOLD_TYPE_LABEL: Record<HouseholdType, string> = {
  thuong: 'Hộ thường',
  ngheo: 'Hộ nghèo',
  can_ngheo: 'Hộ cận nghèo',
  chinh_sach: 'Hộ chính sách',
  kho_khan: 'Hộ khó khăn',
};

export const HOUSEHOLD_TYPE_TONE: Record<HouseholdType, Tone> = {
  thuong: 'secondary',
  ngheo: 'danger',
  can_ngheo: 'warning',
  chinh_sach: 'flag',
  kho_khan: 'info',
};

/** Các loại hộ cần quan tâm (hiện trên sơ đồ an sinh). */
export const WELFARE_HOUSEHOLD_TYPES: HouseholdType[] = ['ngheo', 'can_ngheo', 'chinh_sach', 'kho_khan'];
