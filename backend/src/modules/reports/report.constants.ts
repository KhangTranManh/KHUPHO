/** Phản ánh (gộp chung SOS). Giữ đồng bộ với frontend/src/features/reports. */

/** Loại phản ánh. "sos" = báo động khẩn cấp từ nút SOS. */
export const REPORT_TYPES = ['an_ninh', 'mat_an_toan', 'hu_hong_dan_sinh', 'sos'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** Chi tiết theo loại. */
export const REPORT_CATEGORIES = [
  'trom_cap',
  'lua_dao',
  'doi_tuong_tinh_nghi',
  'ngap_nuoc',
  'lan_chiem',
  'mat_an_toan_khac',
  'hu_hong_dan_sinh',
  'sos',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/** Loại suy ra từ chi tiết — client không tự đặt. */
export const REPORT_CATEGORY_TYPE: Record<ReportCategory, ReportType> = {
  trom_cap: 'an_ninh',
  lua_dao: 'an_ninh',
  doi_tuong_tinh_nghi: 'an_ninh',
  ngap_nuoc: 'mat_an_toan',
  lan_chiem: 'mat_an_toan',
  mat_an_toan_khac: 'mat_an_toan',
  hu_hong_dan_sinh: 'hu_hong_dan_sinh',
  sos: 'sos',
};

export const REPORT_SEVERITIES = ['thuong', 'khan'] as const;

/** Trạng thái: mới → đang xử lý → đã xong. */
export const REPORT_STATUSES = ['moi', 'dang_xu_ly', 'da_xong'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Vai trò được giao xử lý: Trưởng khu phố / Công an khu vực. */
export const REPORT_HANDLER_ROLES = ['truong_kp', 'cong_an_kv'] as const;

/** Hành động ghi vào lịch sử xử lý. */
export const REPORT_ACTIONS = ['tao', 'giao_xu_ly', 'cap_nhat_trang_thai', 'ghi_chu'] as const;
