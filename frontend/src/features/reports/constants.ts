import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/types/common';
import type {
  ReportCategory,
  ReportHandlerRole,
  ReportHistoryEntry,
  ReportSeverity,
  ReportStatus,
  ReportType,
} from './types';

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  an_ninh: 'An ninh trật tự',
  mat_an_toan: 'Mất an toàn',
  hu_hong_dan_sinh: 'Hư hỏng dân sinh',
  sos: 'SOS khẩn cấp',
};

export const REPORT_TYPE_ICON: Record<ReportType, IconName> = {
  an_ninh: 'shield',
  mat_an_toan: 'alertTriangle',
  hu_hong_dan_sinh: 'tool',
  sos: 'siren',
};

export const REPORT_TYPE_TONE: Record<ReportType, Tone> = {
  an_ninh: 'danger',
  mat_an_toan: 'warning',
  hu_hong_dan_sinh: 'info',
  sos: 'danger',
};

/** Loại phản ánh thường (không gồm SOS), theo thứ tự hiển thị trong form. */
export const REPORT_CATEGORIES: Exclude<ReportCategory, 'sos'>[] = [
  'trom_cap',
  'lua_dao',
  'doi_tuong_tinh_nghi',
  'ngap_nuoc',
  'lan_chiem',
  'mat_an_toan_khac',
  'hu_hong_dan_sinh',
];

export const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  trom_cap: 'Trộm cắp',
  lua_dao: 'Lừa đảo',
  doi_tuong_tinh_nghi: 'Đối tượng tình nghi',
  ngap_nuoc: 'Ngập nước',
  lan_chiem: 'Lấn chiếm lòng lề đường',
  mat_an_toan_khac: 'Mất an toàn khác',
  hu_hong_dan_sinh: 'Hư hỏng công trình dân sinh',
  sos: 'SOS',
};

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

export const REPORT_SEVERITY_LABEL: Record<ReportSeverity, string> = {
  thuong: 'Thường',
  khan: 'Khẩn',
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  moi: 'Mới',
  dang_xu_ly: 'Đang xử lý',
  da_xong: 'Đã xong',
};

export const REPORT_STATUS_TONE: Record<ReportStatus, Tone> = {
  moi: 'danger',
  dang_xu_ly: 'warning',
  da_xong: 'success',
};

export const REPORT_HANDLER_LABEL: Record<ReportHandlerRole, string> = {
  truong_kp: 'Trưởng khu phố',
  cong_an_kv: 'Công an khu vực',
};

export const REPORT_ACTION_LABEL: Record<ReportHistoryEntry['action'], string> = {
  tao: 'Gửi',
  giao_xu_ly: 'Giao xử lý',
  cap_nhat_trang_thai: 'Cập nhật',
  ghi_chu: 'Ghi chú',
};

/** Gợi ý nơi xử lý theo loại: an ninh → công an khu vực, còn lại → trưởng khu phố. */
export const defaultHandlerFor = (category: ReportCategory): ReportHandlerRole =>
  REPORT_CATEGORY_TYPE[category] === 'an_ninh' ? 'cong_an_kv' : 'truong_kp';
