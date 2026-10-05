import { appConfig } from '@/config/app';
import { apiGet, apiPost, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type {
  BankTransaction,
  FundHouseholdFilter,
  FundHouseholdStatus,
  FundSummary,
  MarkPaidInput,
  MarkPaidResult,
  MyFundPayment,
} from './types';

/** `filter` = đã đóng / chưa đóng. */
export type FundHouseholdQuery = ListQuery<FundHouseholdFilter>;

const mock = () => import('@/mocks/mockApi').then((m) => m.mockApi);

/** Các quỹ đang thu kèm số liệu. */
export async function getFunds(): Promise<FundSummary[]> {
  if (appConfig.useMock) return (await mock()).funds();
  return apiGet('/funds');
}

/** Danh sách hộ + trạng thái đóng của một quỹ (chỉ cán bộ). */
export async function getFundHouseholds(fundId: string, query: FundHouseholdQuery): Promise<Paged<FundHouseholdStatus>> {
  if (appConfig.useMock) return (await mock()).fundHouseholds(fundId, query);
  return apiGet(`/funds/${fundId}/households${toQueryString(query)}`);
}

/** Đánh dấu hộ đã đóng → backend lưu khoản thu và gửi thông báo xác nhận đến hộ. */
export async function markFundPaid(fundId: string, input: MarkPaidInput): Promise<MarkPaidResult> {
  if (appConfig.useMock) return (await mock()).markFundPaid(fundId, input);
  return apiPost(`/funds/${fundId}/payments`, input);
}

/** Khoản phải đóng + mã QR riêng của hộ tôi (cư dân). Gọi lại định kỳ để biết tiền đã về chưa. */
export async function getMyFundPayment(fundId: string): Promise<MyFundPayment> {
  if (appConfig.useMock) return (await mock()).myFundPayment(fundId);
  return apiGet(`/funds/${fundId}/my-payment`);
}

/** Giao dịch ngân hàng chưa tự ghi nhận được (sai nội dung, thiếu tiền, chuyển trùng) — trưởng KP đối soát. */
export async function getBankTransactionIssues(): Promise<BankTransaction[]> {
  if (appConfig.useMock) return (await mock()).bankTransactionIssues();
  return apiGet('/funds/bank-transactions');
}

/** Chỉ bản demo (dữ liệu mẫu): mô phỏng ngân hàng báo tiền về để thấy màn hình tự cập nhật. */
export async function simulateTransferDemo(fundId: string): Promise<void> {
  if (!appConfig.useMock) throw new Error('Chỉ dùng được ở chế độ dữ liệu mẫu');
  await (await mock()).simulateTransfer(fundId);
}

/** Gửi thông báo nhắc tới mọi hộ chưa đóng quỹ. */
export async function remindUnpaid(fundId: string): Promise<{ notified: number }> {
  if (appConfig.useMock) return (await mock()).remindUnpaid(fundId);
  return apiPost(`/funds/${fundId}/reminders`);
}
