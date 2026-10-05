import type { Household } from '@/features/households/types';

/**
 * An sinh — hộ chính sách / khó khăn = các hộ có householdType khác "thuong".
 * Giữ đồng bộ với backend/src/modules/welfare.
 */
export interface WelfareHousehold extends Household {
  /** Số thành viên là người cao tuổi / người khuyết tật — cần quan tâm khi thăm hỏi. */
  elderlyCount: number;
  disabledCount: number;
}
