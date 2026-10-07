import type { Types } from 'mongoose';
import { logger } from '../../common/logger.js';
import { HouseholdModel } from '../households/household.model.js';
import { BankTransactionModel, type BankTxStatus } from './bankTransaction.model.js';
import { FundModel } from './fund.model.js';
import { amountDue, recordPayment } from './fund.service.js';
import { FundPaymentModel } from './fundPayment.model.js';
import { compactCode, extractReference, householdCandidates } from './transferContent.js';

/** Giao dịch tiền vào đã chuẩn hoá — độc lập với nhà cung cấp webhook (SePay, Casso…). */
export interface IncomingTransfer {
  provider: string;
  providerId: string;
  amount: number;
  content: string;
  accountNumber?: string;
  referenceCode?: string;
  transactionAt: Date;
}

export interface TransferResult {
  status: BankTxStatus | 'duplicate';
  householdCode?: string;
}

/**
 * Xử lý một giao dịch tiền vào: đọc "QKP <MÃ QUỸ> <SỐ HỘ>" trong nội dung → kiểm tra số tiền →
 * ghi khoản "đã đóng" + thông báo đến hộ. Mọi giao dịch đều được lưu vào bank_transactions để đối soát.
 * Gọi lại với cùng providerId (webhook gửi lại) → không xử lý lần hai.
 */
export async function handleIncomingTransfer(tx: IncomingTransfer): Promise<TransferResult> {
  if (await BankTransactionModel.exists({ provider: tx.provider, providerId: tx.providerId })) {
    return { status: 'duplicate' };
  }

  const outcome = await matchAndRecord(tx);
  try {
    await BankTransactionModel.create({ ...tx, ...outcome });
  } catch (err) {
    // Hai lần gửi webhook đồng thời: lần sau vấp unique index — khoản đóng đã được ghi ở lần trước.
    if ((err as { code?: number }).code === 11000) return { status: 'duplicate' };
    throw err;
  }
  logger.info({ providerId: tx.providerId, status: outcome.status, householdCode: outcome.householdCode }, 'Giao dịch chuyển khoản');
  return { status: outcome.status, householdCode: outcome.householdCode };
}

/** Kết quả đối soát, lưu kèm giao dịch. */
interface MatchOutcome {
  status: BankTxStatus;
  note?: string;
  fundId?: Types.ObjectId;
  householdId?: Types.ObjectId;
  householdCode?: string;
  paymentId?: Types.ObjectId;
}

async function matchAndRecord(tx: IncomingTransfer): Promise<MatchOutcome> {
  const reference = extractReference(tx.content);
  if (!reference) return { status: 'unmatched', note: 'Nội dung không có "QKP <mã quỹ> <số hộ>"' };

  // Mã quỹ: mã (đã thu gọn) dài nhất khớp phần đầu; cùng mã nhiều kỳ → kỳ mới nhất.
  const funds = await FundModel.find().sort({ 'period.year': -1, createdAt: -1 });
  const fund = funds
    .filter((f) => reference.startsWith(compactCode(f.code)))
    .sort((a, b) => compactCode(b.code).length - compactCode(a.code).length)[0];
  if (!fund) return { status: 'unmatched', note: `Không nhận ra mã quỹ trong "${reference.slice(0, 30)}"` };

  // Số hộ ngay sau mã quỹ; thử từ dài tới ngắn, lấy số hộ có thật.
  const candidates = householdCandidates(reference.slice(compactCode(fund.code).length));
  const found = await HouseholdModel.find({ code: { $in: candidates } });
  const household = candidates.map((c) => found.find((h) => h.code === c)).find(Boolean);
  if (!household) return { status: 'unmatched', fundId: fund._id, note: 'Không nhận ra số hộ trong nội dung' };

  const base = { fundId: fund._id, householdId: household._id, householdCode: household.code };
  if (fund.status !== 'mo') return { ...base, status: 'fund_closed' as const, note: 'Quỹ đã ngừng thu' };
  if (await FundPaymentModel.exists({ fundId: fund._id, householdId: household._id, status: 'da_dong' })) {
    return { ...base, status: 'already_paid' as const, note: 'Hộ đã đóng quỹ này trước đó — cần hoàn tiền' };
  }
  const due = amountDue(fund, household.members.length);
  if (due !== null && tx.amount < due) {
    return { ...base, status: 'underpaid' as const, note: `Chuyển ${tx.amount} đ, phải đóng ${due} đ` };
  }

  const payment = await recordPayment(fund, household, {
    amount: tx.amount,
    method: 'qr',
    transactionCode: tx.referenceCode ?? tx.providerId,
    confirmedBy: { name: `Tự động (${tx.provider})` },
  });
  return { ...base, status: 'matched' as const, paymentId: payment._id };
}

/** Giao dịch gần đây cho trưởng KP đối soát (mặc định: những giao dịch chưa tự ghi nhận được). */
export async function listBankTransactions(onlyIssues: boolean) {
  return BankTransactionModel.find(onlyIssues ? { status: { $ne: 'matched' } } : {})
    .sort({ transactionAt: -1 })
    .limit(50);
}
