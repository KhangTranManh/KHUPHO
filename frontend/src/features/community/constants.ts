import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/types/common';
import type { ActivityKind, CulturalResult, SurveyStatus } from './types';

export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  dang_mo: 'Đang mở',
  da_dong: 'Đã đóng',
};

export const SURVEY_STATUS_TONE: Record<SurveyStatus, Tone> = {
  dang_mo: 'success',
  da_dong: 'secondary',
};

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  hop_khu_pho: 'Họp khu phố',
  van_nghe: 'Văn nghệ',
  the_thao: 'Thể thao',
  tinh_nguyen: 'Tình nguyện',
  le_hoi: 'Lễ hội',
  tap_huan: 'Tập huấn',
};

export const ACTIVITY_KIND_ICON: Record<ActivityKind, IconName> = {
  hop_khu_pho: 'users',
  van_nghe: 'star',
  the_thao: 'award',
  tinh_nguyen: 'heart',
  le_hoi: 'smile',
  tap_huan: 'book',
};

export const ACTIVITY_KIND_TONE: Record<ActivityKind, Tone> = {
  hop_khu_pho: 'primary',
  van_nghe: 'flag',
  the_thao: 'success',
  tinh_nguyen: 'danger',
  le_hoi: 'warning',
  tap_huan: 'info',
};

export const CULTURAL_RESULT_LABEL: Record<CulturalResult, string> = {
  dat: 'Đạt',
  chua_dat: 'Chưa đạt',
  dang_binh_xet: 'Đang bình xét',
};

export const CULTURAL_RESULT_TONE: Record<CulturalResult, Tone> = {
  dat: 'success',
  chua_dat: 'secondary',
  dang_binh_xet: 'warning',
};
