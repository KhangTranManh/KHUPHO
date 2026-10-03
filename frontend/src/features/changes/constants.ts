import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/types/common';
import type { ChangeType } from './types';

export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  nhap_khau: 'Nhập khẩu',
  chuyen_di: 'Chuyển đi',
  sinh: 'Khai sinh',
  tu_vong: 'Khai tử',
  tam_tru: 'Đăng ký tạm trú',
  tam_vang: 'Khai báo tạm vắng',
};

export const CHANGE_TYPE_TONE: Record<ChangeType, Tone> = {
  nhap_khau: 'primary',
  chuyen_di: 'danger',
  sinh: 'success',
  tu_vong: 'dark',
  tam_tru: 'info',
  tam_vang: 'warning',
};

export const CHANGE_TYPE_ICON: Record<ChangeType, IconName> = {
  nhap_khau: 'logIn',
  chuyen_di: 'logOut',
  sinh: 'heart',
  tu_vong: 'minusCircle',
  tam_tru: 'mapPin',
  tam_vang: 'send',
};
