/** Thu quỹ: danh sách thu theo hộ, xác nhận đã đóng, nhắc hộ chưa đóng. */
import type { FundHouseholdQuery } from '@/features/funds/fundService';
import type {
  BankTransaction,
  Fund,
  FundHouseholdStatus,
  FundPayment,
  FundSummary,
  MarkPaidInput,
  MarkPaidResult,
  MyFundPayment,
} from '@/features/funds/types';
import { ApiError } from '@/services/api';
import { fundPayments, funds } from '../communityDb';
import { db } from '../db';
import { matches, mockCurrentUser, nextId, notFound, paginate, respond } from '../helpers';

const paidOf = (fundId: string) => fundPayments.filter((p) => p.fundId === fundId && p.status === 'da_dong');

/** Theo hộ = mức mặc định; theo người = mức × số nhân khẩu; null = tự nguyện. */
const amountDue = (fund: Fund, memberCount: number) =>
  fund.defaultAmount === null ? null : fund.unit === 'nguoi' ? fund.defaultAmount * memberCount : fund.defaultAmount;

/** Giống backend transferContent.ts: "QKP <MÃ QUỸ> <SỐ HỘ>" chữ in hoa, bỏ ký tự đặc biệt. */
const compact = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Vài giao dịch mẫu cần đối soát (bản thật: collection bank_transactions do webhook ghi). */
const bankIssues: BankTransaction[] = [
  { id: 'bt1', amount: 50_000, content: 'MBVCB.8812.ung ho quy khu pho', transactionAt: new Date(Date.now() - 3_600_000).toISOString(), status: 'unmatched', note: 'Nội dung không có "QKP <mã quỹ> <số hộ>"' },
  { id: 'bt2', amount: 20_000, content: 'QKP VINGUOINGHEO HK1007', transactionAt: new Date(Date.now() - 86_400_000).toISOString(), status: 'underpaid', householdCode: 'HK-1007', note: 'Chuyển 20000 đ, phải đóng 45000 đ' },
];

export const fundHandlers = {
  funds: () =>
    respond(
      funds
        .filter((f) => f.status === 'mo')
        .map((f): FundSummary => {
          const paid = paidOf(f.id);
          return {
            ...f,
            totalHouseholds: db.households.length,
            paidHouseholds: paid.length,
            collectedAmount: paid.reduce((sum, p) => sum + p.amount, 0),
          };
        }),
    ),

  fundHouseholds: (fundId: string, q: FundHouseholdQuery) => {
    const fund = funds.find((f) => f.id === fundId);
    if (!fund) return Promise.reject(notFound('quỹ'));
    const byHousehold = new Map(paidOf(fundId).map((p) => [p.householdId, p]));
    const rows: FundHouseholdStatus[] = db.households
      .map((h) => ({
        householdId: h.id,
        householdCode: h.code,
        headName: h.headName,
        address: h.address,
        areaName: h.areaName,
        amountDue: amountDue(fund, h.memberCount),
        payment: byHousehold.get(h.id),
      }))
      .filter(
        (row) =>
          (!q.filter || q.filter === 'all' || (q.filter === 'da_dong') === Boolean(row.payment)) &&
          matches(q.search, row.householdCode, row.headName, row.address),
      );
    return respond(paginate(rows, q));
  },

  markFundPaid: (fundId: string, input: MarkPaidInput) => {
    const fund = funds.find((f) => f.id === fundId);
    const household = db.households.find((h) => h.id === input.householdId);
    if (!fund || !household) return Promise.reject(notFound('quỹ hoặc hộ gia đình'));
    if (paidOf(fundId).some((p) => p.householdId === input.householdId)) {
      return Promise.reject(new ApiError(409, 'CONFLICT', 'Hộ này đã đóng quỹ'));
    }
    const amount = input.amount ?? amountDue(fund, household.memberCount);
    if (!amount) return Promise.reject(new ApiError(400, 'BAD_REQUEST', 'Quỹ tự nguyện — vui lòng nhập số tiền'));
    const payment: FundPayment = {
      id: nextId('fp'),
      fundId,
      householdId: household.id,
      householdCode: household.code,
      amount,
      status: 'da_dong',
      method: input.method,
      transactionCode: input.transactionCode,
      paidAt: new Date().toISOString(),
      confirmedBy: { name: mockCurrentUser().fullName },
    };
    fundPayments.push(payment);
    // Bản thật: backend tạo bản ghi notifications cho hộ.
    return respond<MarkPaidResult>({ payment, notified: true });
  },

  myFundPayment: (fundId: string) => {
    const fund = funds.find((f) => f.id === fundId);
    const household = db.households.find((h) => h.id === mockCurrentUser().householdId);
    if (!fund) return Promise.reject(notFound('quỹ'));
    if (!household) return Promise.reject(new ApiError(400, 'BAD_REQUEST', 'Tài khoản chưa liên kết hộ gia đình — liên hệ trưởng khu phố'));
    return respond<MyFundPayment>({
      fundId,
      householdCode: household.code,
      amountDue: amountDue(fund, household.memberCount),
      transferContent: `QKP ${compact(fund.code)} ${compact(household.code)}`,
      bank: fund.bank,
      autoConfirm: true,
      payment: paidOf(fundId).find((p) => p.householdId === household.id),
    });
  },

  /** Chỉ có ở bản demo: mô phỏng ngân hàng báo tiền về (bản thật do webhook SePay gọi backend). */
  simulateTransfer: (fundId: string) => {
    const fund = funds.find((f) => f.id === fundId);
    const household = db.households.find((h) => h.id === mockCurrentUser().householdId);
    if (!fund || !household) return Promise.reject(notFound('quỹ hoặc hộ gia đình'));
    if (!paidOf(fundId).some((p) => p.householdId === household.id)) {
      fundPayments.push({
        id: nextId('fp'),
        fundId,
        householdId: household.id,
        householdCode: household.code,
        amount: amountDue(fund, household.memberCount) ?? 50_000,
        status: 'da_dong',
        method: 'qr',
        transactionCode: `FT${Date.now()}`,
        paidAt: new Date().toISOString(),
        confirmedBy: { name: 'Tự động (mô phỏng)' },
      });
    }
    return respond({ success: true });
  },

  bankTransactionIssues: () => respond(bankIssues),

  remindUnpaid: (fundId: string) => {
    if (!funds.some((f) => f.id === fundId)) return Promise.reject(notFound('quỹ'));
    const paid = new Set(paidOf(fundId).map((p) => p.householdId));
    return respond({ notified: db.households.filter((h) => !paid.has(h.id)).length });
  },
};
