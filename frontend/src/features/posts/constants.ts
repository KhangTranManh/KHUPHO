import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/types/common';
import type { PostAudience, PostCategory, PostKind } from './types';

export const POST_KINDS: PostKind[] = ['thong_bao_nhanh', 'tuyen_truyen', 'su_kien'];

export const POST_KIND_LABEL: Record<PostKind, string> = {
  thong_bao_nhanh: 'Thông báo nhanh',
  tuyen_truyen: 'Tuyên truyền',
  su_kien: 'Sự kiện',
};

export const POST_CATEGORIES: PostCategory[] = [
  'rac',
  'cup_dien',
  'pccc',
  'tiem_chung',
  'kham_suc_khoe',
  'chinh_sach',
  'phong_dich',
  'van_dong_quy',
  'le_hoi',
  'khac',
];

export const POST_CATEGORY_LABEL: Record<PostCategory, string> = {
  rac: 'Thu gom rác',
  cup_dien: 'Cúp điện / nước',
  pccc: 'Phòng cháy chữa cháy',
  tiem_chung: 'Tiêm chủng',
  kham_suc_khoe: 'Khám sức khoẻ',
  chinh_sach: 'Chính sách, pháp luật',
  phong_dich: 'Phòng chống dịch',
  van_dong_quy: 'Vận động đóng góp',
  le_hoi: 'Lễ hội, sinh hoạt',
  khac: 'Khác',
};

export const POST_CATEGORY_ICON: Record<PostCategory, IconName> = {
  rac: 'trash',
  cup_dien: 'zap',
  pccc: 'flame',
  tiem_chung: 'syringe',
  kham_suc_khoe: 'heart',
  chinh_sach: 'book',
  phong_dich: 'shield',
  van_dong_quy: 'wallet',
  le_hoi: 'star',
  khac: 'megaphone',
};

export const POST_CATEGORY_TONE: Record<PostCategory, Tone> = {
  rac: 'success',
  cup_dien: 'warning',
  pccc: 'danger',
  tiem_chung: 'info',
  kham_suc_khoe: 'primary',
  chinh_sach: 'dark',
  phong_dich: 'info',
  van_dong_quy: 'warning',
  le_hoi: 'flag',
  khac: 'secondary',
};

export const AUDIENCE_SCOPE_LABEL: Record<PostAudience['scope'], string> = {
  all: 'Toàn khu phố',
  area: 'Một số khu vực',
  group: 'Một số nhóm đối tượng',
};
