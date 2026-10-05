import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/types/common';
import type { DirectoryGroup } from './types';

export const DIRECTORY_GROUPS: DirectoryGroup[] = ['khan_cap', 'chinh_quyen', 'khu_pho', 'doan_the'];

export const DIRECTORY_GROUP_LABEL: Record<DirectoryGroup, string> = {
  khan_cap: 'Khẩn cấp',
  chinh_quyen: 'Chính quyền, công an phường',
  khu_pho: 'Khu phố',
  doan_the: 'Đoàn thể, hội',
};

export const DIRECTORY_GROUP_ICON: Record<DirectoryGroup, IconName> = {
  khan_cap: 'siren',
  chinh_quyen: 'building',
  khu_pho: 'home',
  doan_the: 'users',
};

export const DIRECTORY_GROUP_TONE: Record<DirectoryGroup, Tone> = {
  khan_cap: 'danger',
  chinh_quyen: 'dark',
  khu_pho: 'primary',
  doan_the: 'success',
};
