import { Schema, model, type InferSchemaType } from 'mongoose';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';

export const PAYMENT_STATUSES = ['chua_dong', 'da_dong'] as const;
export const PAYMENT_METHODS = ['qr', 'tien_mat'] as const;

/**
 * Collection `fund_payments` — khoản đóng của một hộ cho một quỹ (unique fundId + householdId).
 * Hộ chưa có bản ghi, hoặc có nhưng status = chua_dong → chưa đóng (đối tượng cần nhắc).
 */
const fundPaymentSchema = new Schema(
  {
    fundId: { type: Schema.Types.ObjectId, ref: 'Fund', required: true },
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    householdCode: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYMENT_STATUSES, required: true, default: 'chua_dong' },
    method: { type: String, enum: PAYMENT_METHODS },
    /** Mã giao dịch ngân hàng (khi đóng qua QR). */
    transactionCode: { type: String, trim: true, maxlength: 60 },
    paidAt: { type: Date },
    /** Cán bộ xác nhận đã đóng. */
    confirmedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
    },
  },
  { timestamps: true, collection: 'fund_payments' },
);

fundPaymentSchema.index({ fundId: 1, householdId: 1 }, { unique: true });
fundPaymentSchema.index({ fundId: 1, status: 1 });
fundPaymentSchema.index({ householdId: 1 });

applyJsonTransform(fundPaymentSchema);

export type FundPayment = InferSchemaType<typeof fundPaymentSchema>;
export const FundPaymentModel = model('FundPayment', fundPaymentSchema);
