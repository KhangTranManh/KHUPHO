import type { ChangeType, ResidentChange } from '@/features/changes/types';

export interface StatValue {
  value: number;
  /** % thay đổi so với tháng trước. */
  delta: number;
}

export interface GroupOverview {
  id: string;
  name: string;
  leaderName: string;
  officers: string[]; // cán bộ phụ trách
  households: number;
  residents: number;
  /** % hộ đã rà soát thông tin trong đợt hiện tại. */
  reviewProgress: number;
}

export interface DashboardSummary {
  residents: StatValue;
  households: StatValue;
  temporaryResidents: StatValue;
  temporaryAbsent: StatValue;
  /** Tổng số biến động theo tháng, 12 tháng gần nhất. */
  monthlyChanges: { label: string; value: number }[];
  /** Tổng theo loại trong 12 tháng. */
  changesByType: Record<Extract<ChangeType, 'nhap_khau' | 'chuyen_di' | 'sinh' | 'tu_vong'>, number>;
  populationTrend: { labels: string[]; permanent: number[]; temporary: number[] };
  groups: GroupOverview[];
  recentChanges: ResidentChange[];
}
