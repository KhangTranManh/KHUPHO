import type { ResidentChange } from '@/features/changes/types';
import type { HouseholdDetail, HousingType } from '@/features/households/types';
import type { ResidenceStatus, ResidentCategory } from '@/features/residents/types';
import type { HouseholdNotification } from '@/features/notifications/types';
import type { Post } from '@/features/posts/types';
import type { Report, ReportStatus, ReportType } from '@/features/reports/types';

export interface StatValue {
  value: number;
  /** % thay đổi so với tháng trước. */
  delta: number;
}

export interface HousingTypeStat {
  households: number;
  residents: number;
  byStatus: Record<ResidenceStatus, number>;
}

/** Một nhóm tuổi, tách theo giới tính. */
export interface AgeGenderBucket {
  label: string;
  nam: number;
  nu: number;
}

export interface AreaOverview {
  id: string;
  name: string;
  housingType: HousingType;
  managerName: string;
  households: number;
  residents: number;
  temporaryResidents: number;
  temporaryAbsent: number;
}

/** Dashboard trưởng khu phố — GET /dashboard/officer. */
export interface OfficerDashboard {
  households: StatValue;
  residents: StatValue;
  temporaryResidents: StatValue;
  temporaryAbsent: StatValue;
  byHousingType: Record<HousingType, HousingTypeStat>;
  byCategory: Record<ResidentCategory, number>;
  byAgeGender: AgeGenderBucket[];
  areas: AreaOverview[];
  /** Phản ánh ANTT mới / đang xử lý, mới nhất trước (tối đa vài bản ghi). */
  pendingReports: Report[];
  pendingReportCount: number;
  /** Báo động SOS chưa xử lý xong (cùng kiểu Report, type = sos). */
  openSos: Report[];
  openSosCount: number;
  recentChanges: ResidentChange[];
}

/** Một nhân khẩu đang tạm trú / tạm vắng — danh sách theo dõi của công an. */
export interface TemporaryResidentItem {
  residentId: string;
  fullName: string;
  householdId: string;
  householdCode: string;
  areaName: string;
  residenceStatus: 'tam_tru' | 'tam_vang';
  residenceFrom?: string;
  residenceTo?: string;
  note?: string;
}

/** Dashboard công an khu vực — GET /dashboard/police. */
export interface PoliceDashboard {
  openSosCount: number;
  /** Phản ánh (không gồm SOS) trạng thái "mới". */
  newReportCount: number;
  temporaryResidents: number;
  temporaryAbsent: number;
  /** Phản ánh chưa xong theo loại (gồm SOS). */
  openByType: Record<ReportType, number>;
  /** Toàn bộ phản ánh (không gồm SOS) theo trạng thái. */
  byStatus: Record<ReportStatus, number>;
  openSos: Report[];
  /** Phản ánh chưa xong — giao công an trước, khẩn trước. */
  pendingReports: Report[];
  pendingReportCount: number;
  recentTemporary: TemporaryResidentItem[];
  areas: AreaOverview[];
}

/** Dashboard cư dân — GET /dashboard/resident. */
export interface ResidentDashboard {
  /** Hộ của cư dân kèm nhân khẩu; null nếu tài khoản chưa liên kết nhân khẩu. */
  household: HouseholdDetail | null;
  myReports: Report[];
  openReportCount: number;
  unpaidFunds: { fundId: string; name: string; code: string; amountDue: number | null; dueDate?: string }[];
  latestPosts: Post[];
  unreadPostCount: number;
  openSurveys: { id: string; title: string; endDate: string }[];
  notifications: HouseholdNotification[];
}
