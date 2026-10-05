import type { BankTxStatus, Fund, FundBankAccount, FundUnit, PaymentMethod } from './types';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  qr: 'Quét QR',
  tien_mat: 'Tiền mặt',
};

export const FUND_UNIT_LABEL: Record<FundUnit, string> = {
  ho: 'hộ',
  nguoi: 'người',
};

const currencyFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
export const formatCurrency = (n: number) => currencyFmt.format(n);

/** "45.000 ₫ / hộ", "15.000 ₫ / người" hoặc "Tự nguyện". */
export const fundAmountText = (fund: Pick<Fund, 'defaultAmount' | 'unit'>) =>
  fund.defaultAmount === null ? 'Tự nguyện' : `${formatCurrency(fund.defaultAmount)} / ${FUND_UNIT_LABEL[fund.unit]}`;

/** "Năm 2026" hoặc "Đợt 1/2026". */
export const fundPeriodText = (fund: Pick<Fund, 'period'>) =>
  fund.period.type === 'nam' ? `Năm ${fund.period.year}` : `${fund.period.label ?? 'Đợt'} · ${fund.period.year}`;

/**
 * Ảnh mã VietQR (img.vietqr.io) — quét bằng app ngân hàng là điền sẵn số tiền + nội dung.
 * Nội dung chuyển khoản do backend tạo ("QKP <MÃ QUỸ> <SỐ HỘ>") để tự đối soát — không tự ghép ở frontend.
 */
export function vietQrImageUrl(bank: FundBankAccount, content: string, amount?: number | null) {
  const qs = new URLSearchParams({ addInfo: content, accountName: bank.accountName });
  if (amount) qs.set('amount', String(amount));
  return `https://img.vietqr.io/image/${bank.bin}-${bank.accountNo}-compact2.png?${qs}`;
}

export const BANK_TX_STATUS_LABEL: Record<BankTxStatus, string> = {
  matched: 'Đã tự ghi nhận',
  unmatched: 'Sai nội dung',
  underpaid: 'Chuyển thiếu',
  already_paid: 'Chuyển trùng',
  fund_closed: 'Quỹ đã đóng',
};
