import { appConfig } from '@/config/app';
import { apiGet, apiPatch, apiPost, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { CreateReportInput, CreateSosInput, Report, ReportStatus, UpdateReportInput } from './types';

/**
 * Phản ánh và SOS dùng chung collection `reports` ở backend.
 * `filter` = trạng thái; `kind` = phan_anh | sos (bỏ trống = cả hai).
 * Cư dân chỉ nhận về bản ghi của chính mình (backend tự lọc).
 */
export type ReportQuery = ListQuery<ReportStatus> & { kind?: 'phan_anh' | 'sos' };

const mock = () => import('@/mocks/mockApi').then((m) => m.mockApi);

export async function getReports(query: ReportQuery): Promise<Paged<Report>> {
  if (appConfig.useMock) return (await mock()).reports(query);
  return apiGet(`/reports${toQueryString(query)}`);
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  if (appConfig.useMock) return (await mock()).createReport(input);
  return apiPost('/reports', input);
}

/** Cán bộ cập nhật trạng thái / nơi xử lý / ghi chú — mỗi thao tác ghi vào lịch sử. */
export async function updateReport(id: string, input: UpdateReportInput): Promise<Report> {
  if (appConfig.useMock) return (await mock()).updateReport(id, input);
  return apiPatch(`/reports/${id}`, input);
}

/** Danh sách SOS (lối tắt của getReports với kind=sos). */
export async function getSosAlerts(query: ListQuery<ReportStatus>): Promise<Paged<Report>> {
  if (appConfig.useMock) return (await mock()).reports({ ...query, kind: 'sos' });
  return apiGet(`/sos${toQueryString(query)}`);
}

/** Gửi SOS — mọi vai trò. Họ tên, SĐT, hộ lấy từ tài khoản. */
export async function sendSos(input: CreateSosInput): Promise<Report> {
  if (appConfig.useMock) return (await mock()).sendSos(input);
  return apiPost('/sos', input);
}
