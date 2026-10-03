import type { Tone } from '@/types/common';
import type { Gender, Relation, ResidenceStatus } from './types';

export const GENDER_LABEL: Record<Gender, string> = {
  nam: 'Nam',
  nu: 'Nữ',
};

export const RELATION_LABEL: Record<Relation, string> = {
  chu_ho: 'Chủ hộ',
  vo_chong: 'Vợ / chồng',
  con: 'Con',
  cha_me: 'Cha / mẹ',
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
  tam_vang: 'secondary',
};
