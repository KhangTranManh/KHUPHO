/**
 * Phản ánh — gộp chung SOS. Luồng: Nút báo / SOS → Trưởng khu phố / Công an khu vực xử lý.
 * Giữ đồng bộ với backend/src/modules/reports.
 */

/** Loại: an ninh, mất an toàn, hư hỏng dân sinh, hoặc SOS. */
export type ReportType = 'an_ninh' | 'mat_an_toan' | 'hu_hong_dan_sinh' | 'sos';

export type ReportCategory =
  | 'trom_cap'
  | 'lua_dao'
  | 'doi_tuong_tinh_nghi'
  | 'ngap_nuoc'
  | 'lan_chiem'
  | 'mat_an_toan_khac'
  | 'hu_hong_dan_sinh'
  | 'sos';

export type ReportSeverity = 'thuong' | 'khan';

/** mới → đang xử lý → đã xong */
export type ReportStatus = 'moi' | 'dang_xu_ly' | 'da_xong';

/** Vai trò được giao xử lý. */
export type ReportHandlerRole = 'truong_kp' | 'cong_an_kv';

export interface ReportHistoryEntry {
  at: string; // ISO datetime
  byName: string;
  action: 'tao' | 'giao_xu_ly' | 'cap_nhat_trang_thai' | 'ghi_chu';
  fromStatus?: ReportStatus;
  toStatus?: ReportStatus;
  note?: string;
}

export interface Report {
  id: string;
  code: string; // "PA-2026-0012" / "SOS-2026-0003"
  type: ReportType;
  category: ReportCategory;
  severity: ReportSeverity;
  title: string;
  description?: string;
  images: string[];
  location?: { address?: string; point?: { type: 'Point'; coordinates: [number, number] } };
  reporter: { name: string; phone?: string; householdCode?: string };
  status: ReportStatus;
  assignedRole?: ReportHandlerRole;
  assignee?: { name?: string };
  resolvedAt?: string;
  /** Lịch sử xử lý: ai làm gì, lúc nào. */
  history: ReportHistoryEntry[];
  createdAt: string; // thời gian gửi
  updatedAt: string;
}

export interface CreateReportInput {
  category: Exclude<ReportCategory, 'sos'>;
  severity: ReportSeverity;
  title: string;
  description: string;
  address: string;
  images?: string[];
  assignedRole?: ReportHandlerRole;
  reporterPhone?: string;
}

export interface CreateSosInput {
  message?: string;
  address?: string;
  point?: { lat: number; lng: number };
  phone?: string;
}

export interface UpdateReportInput {
  status?: ReportStatus;
  assignedRole?: ReportHandlerRole;
  /** Ghi chú kèm thao tác — lưu vào lịch sử, người gửi thấy được. */
  note?: string;
}
