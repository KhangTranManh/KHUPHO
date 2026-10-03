import type { Tone } from '@/types/common';
import { daysBetween } from '@/utils/date';
import type { TemporaryKind, TemporaryRecord, TemporaryStatus } from './types';

/** Còn ≤ số ngày này thì coi là sắp hết hạn. */
export const EXPIRING_THRESHOLD_DAYS = 30;

export const TEMPORARY_KIND_LABEL: Record<TemporaryKind, string> = {
  tam_tru: 'Tạm trú',
  tam_vang: 'Tạm vắng',
};

export const TEMPORARY_STATUS_LABEL: Record<TemporaryStatus, string> = {
  active: 'Còn hạn',
  expiring: 'Sắp hết hạn',
  expired: 'Hết hạn',
};

export const TEMPORARY_STATUS_TONE: Record<TemporaryStatus, Tone> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
};

export function temporaryStatus(record: TemporaryRecord, today = new Date()): TemporaryStatus {
  const left = daysBetween(today, new Date(record.toDate));
  if (left < 0) return 'expired';
  if (left <= EXPIRING_THRESHOLD_DAYS) return 'expiring';
  return 'active';
}
