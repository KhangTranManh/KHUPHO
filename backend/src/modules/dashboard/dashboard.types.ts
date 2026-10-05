import type { HousingType } from '../households/household.constants.js';
import type { ResidenceStatus, ResidentCategory } from '../residents/resident.constants.js';

/** Khớp frontend/src/features/dashboard/types.ts (OfficerDashboard). */

export interface StatValue {
  value: number;
  /** % thay đổi so với 30 ngày trước. */
  delta: number;
}

export interface HousingTypeStat {
  households: number;
  residents: number;
  byStatus: Record<ResidenceStatus, number>;
}

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

export interface OfficerDashboard {
  households: StatValue;
  residents: StatValue;
  temporaryResidents: StatValue;
  temporaryAbsent: StatValue;
  byHousingType: Record<HousingType, HousingTypeStat>;
  byCategory: Record<ResidentCategory, number>;
  byAgeGender: AgeGenderBucket[];
  areas: AreaOverview[];
  /** Phản ánh mới / đang xử lý, mới nhất trước. */
  pendingReports: unknown[]; // Report documents
  pendingReportCount: number;
  /** SOS chưa xử lý xong. */
  openSos: unknown[]; // SosAlert documents
  openSosCount: number;
  recentChanges: unknown[]; // ResidentChange documents
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
  newReportCount: number; // phản ánh (không gồm SOS) trạng thái "mới"
  temporaryResidents: number;
  temporaryAbsent: number;
  /** Phản ánh chưa xong theo loại (gồm SOS). */
  openByType: Record<'an_ninh' | 'mat_an_toan' | 'hu_hong_dan_sinh' | 'sos', number>;
  /** Toàn bộ phản ánh (không gồm SOS) theo trạng thái. */
  byStatus: Record<'moi' | 'dang_xu_ly' | 'da_xong', number>;
  openSos: unknown[];
  /** Phản ánh chưa xong, ưu tiên giao cho công an khu vực, khẩn trước. */
  pendingReports: unknown[];
  pendingReportCount: number;
  /** Tạm trú / tạm vắng mới nhất. */
  recentTemporary: TemporaryResidentItem[];
  areas: AreaOverview[];
}

/** Dashboard cư dân — GET /dashboard/resident. */
export interface ResidentDashboard {
  household: unknown | null; // hộ của cư dân kèm nhân khẩu
  myReports: unknown[];
  openReportCount: number;
  unpaidFunds: { fundId: string; name: string; code: string; amountDue: number | null; dueDate?: string }[];
  latestPosts: unknown[];
  unreadPostCount: number;
  openSurveys: { id: string; title: string; endDate: string }[];
  notifications: unknown[];
}
