/**
 * Thu quỹ. Luồng: Mở QR → Đánh dấu đã đóng → Liên kết danh sách hộ → Gửi thông báo đến hộ.
 * Từ Quỹ + Khoản đóng suy ra hộ chưa đóng và đối tượng cần nhắc.
 * Giữ đồng bộ với backend/src/modules/funds.
 */

export interface FundBankAccount {
  bin: string; // mã BIN ngân hàng (VietQR)
  accountNo: string;
  accountName: string;
}

/** Đơn vị tính: theo hộ hay theo người. */
export type FundUnit = 'ho' | 'nguoi';

export interface Fund {
  id: string;
  code: string; // nội dung chuyển khoản
  name: string;
  /** Mức đóng mặc định (đồng) theo đơn vị tính. null = tự nguyện. */
  defaultAmount: number | null;
  unit: FundUnit;
  /** Kỳ thu: theo năm hoặc theo đợt. */
  period: { type: 'nam' | 'dot'; year: number; label?: string };
  dueDate?: string; // hạn đóng yyyy-mm-dd
  status: 'mo' | 'dong';
  description?: string;
  bank?: FundBankAccount;
}

export interface FundSummary extends Fund {
  totalHouseholds: number;
  paidHouseholds: number;
  collectedAmount: number;
}

export type PaymentMethod = 'qr' | 'tien_mat';

export interface FundPayment {
  id: string;
  fundId: string;
  householdId: string;
  householdCode: string;
  amount: number;
  status: 'chua_dong' | 'da_dong';
  method?: PaymentMethod;
  transactionCode?: string;
  paidAt?: string;
  confirmedBy?: { name: string };
}

/** Một hộ trong danh sách thu của một quỹ. */
export interface FundHouseholdStatus {
  householdId: string;
  householdCode: string;
  headName: string;
  address: string;
  areaName: string;
  /** Số tiền phải đóng (theo người = mức × số nhân khẩu); null = tự nguyện. */
  amountDue: number | null;
  payment?: FundPayment;
}

export type FundHouseholdFilter = 'da_dong' | 'chua_dong';

export interface MarkPaidInput {
  householdId: string;
  /** Bỏ trống = số tiền phải đóng mặc định. */
  amount?: number;
  method: PaymentMethod;
  transactionCode?: string;
}

export interface MarkPaidResult {
  payment: FundPayment;
  notified: boolean;
}

/** GET /funds/:id/my-payment — khoản phải đóng của hộ người đang đăng nhập + thông tin chuyển khoản. */
export interface MyFundPayment {
  fundId: string;
  householdCode: string;
  amountDue: number | null;
  /** Nội dung chuyển khoản chuẩn để tự đối soát, VD "QKP VINGUOINGHEO HK1001". */
  transferContent: string;
  bank?: FundBankAccount;
  /** true = có webhook ngân hàng → tiền về là tự ghi nhận, không cần chờ trưởng KP. */
  autoConfirm: boolean;
  payment?: FundPayment;
}

/** Kết quả đối soát một giao dịch ngân hàng (xem backend bankTransaction.model.ts). */
export type BankTxStatus = 'matched' | 'unmatched' | 'underpaid' | 'already_paid' | 'fund_closed';

export interface BankTransaction {
  id: string;
  amount: number;
  content: string;
  referenceCode?: string;
  transactionAt: string;
  status: BankTxStatus;
  householdCode?: string;
  note?: string;
}
