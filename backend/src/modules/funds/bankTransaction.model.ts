import { Schema, model, type InferSchemaType } from 'mongoose';
import { encryptedString } from '../../common/db/encrypted.js';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';

/**
 * Kết quả xử lý một giao dịch tiền vào:
 *   matched      — khớp quỹ + hộ, đã ghi "đã đóng" tự động
 *   unmatched    — không đọc được mã quỹ / số hộ trong nội dung (trưởng KP đối soát tay)
 *   underpaid    — đúng quỹ + hộ nhưng chuyển thiếu tiền (chưa ghi "đã đóng")
 *   already_paid — hộ đã đóng quỹ này trước đó (chuyển trùng — cần hoàn tiền)
 *   fund_closed  — quỹ đã ngừng thu
 */
export const BANK_TX_STATUSES = ['matched', 'unmatched', 'underpaid', 'already_paid', 'fund_closed'] as const;
export type BankTxStatus = (typeof BANK_TX_STATUSES)[number];

/**
 * Collection `bank_transactions` — nhật ký mọi giao dịch tiền vào do webhook ngân hàng báo (chỉ thêm).
 * Unique (provider, providerId) → webhook gửi lại nhiều lần cũng chỉ xử lý một lần.
 */
const bankTransactionSchema = new Schema(
  {
    provider: { type: String, required: true }, // "sepay"
    providerId: { type: String, required: true }, // id giao dịch phía nhà cung cấp
    amount: { type: Number, required: true },
    /** Nội dung chuyển khoản — MÃ HOÁ vì ngân hàng thường thêm tên người chuyển ("CT tu NGUYEN VAN A"). */
    content: encryptedString({ required: true }),
    accountNumber: { type: String },
    referenceCode: { type: String }, // mã tham chiếu ngân hàng
    transactionAt: { type: Date, required: true },
    status: { type: String, enum: BANK_TX_STATUSES, required: true },
    fundId: { type: Schema.Types.ObjectId, ref: 'Fund' },
    householdId: { type: Schema.Types.ObjectId, ref: 'Household' },
    householdCode: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: 'FundPayment' },
    note: { type: String, maxlength: 255 },
  },
  { timestamps: true, collection: 'bank_transactions' },
);

bankTransactionSchema.index({ provider: 1, providerId: 1 }, { unique: true });
bankTransactionSchema.index({ status: 1, transactionAt: -1 });

applyJsonTransform(bankTransactionSchema);

export type BankTransaction = InferSchemaType<typeof bankTransactionSchema>;
export const BankTransactionModel = model('BankTransaction', bankTransactionSchema);
