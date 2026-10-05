import type { Fund, FundUnit, PaymentMethod } from './types';

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

/** Nội dung chuyển khoản chuẩn để đối soát: "<mã quỹ> <số hộ>". */
export const transferContent = (fund: Pick<Fund, 'code'>, householdCode?: string) =>
  householdCode ? `${fund.code} ${householdCode}` : fund.code;

/** Ảnh mã VietQR (img.vietqr.io) cho quỹ có tài khoản nhận; undefined nếu chưa cấu hình. */
export function vietQrImageUrl(fund: Fund, householdCode?: string) {
  if (!fund.bank) return undefined;
  const qs = new URLSearchParams({
    addInfo: transferContent(fund, householdCode),
    accountName: fund.bank.accountName,
  });
  if (fund.defaultAmount && fund.unit === 'ho') qs.set('amount', String(fund.defaultAmount));
  return `https://img.vietqr.io/image/${fund.bank.bin}-${fund.bank.accountNo}-compact2.png?${qs}`;
}
