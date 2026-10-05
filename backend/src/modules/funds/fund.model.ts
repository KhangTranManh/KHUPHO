import { Schema, model, type InferSchemaType } from 'mongoose';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';

export const FUND_UNITS = ['ho', 'nguoi'] as const; // theo hộ / theo người
export const FUND_PERIOD_TYPES = ['nam', 'dot'] as const; // theo năm / theo đợt
export const FUND_STATUSES = ['mo', 'dong'] as const;

/** Tài khoản nhận để tạo mã VietQR. */
const bankSchema = new Schema(
  {
    bin: { type: String, required: true, match: /^\d{6}$/ },
    accountNo: { type: String, required: true, trim: true, maxlength: 30 },
    accountName: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { _id: false },
);

/** Kỳ thu: năm 2026, hoặc một đợt cụ thể ("Đợt 1/2026", "Bão Yagi"). */
const periodSchema = new Schema(
  {
    type: { type: String, enum: FUND_PERIOD_TYPES, required: true, default: 'nam' },
    year: { type: Number, required: true },
    label: { type: String, trim: true, maxlength: 60 },
  },
  { _id: false },
);

/**
 * Collection `funds` — quỹ dân sinh.
 * Quan hệ: Hộ 1─n Khoản đóng n─1 Quỹ.
 */
const fundSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 }, // nội dung chuyển khoản
    name: { type: String, required: true, trim: true, maxlength: 150 },
    /** Mức đóng mặc định (đồng) theo đơn vị tính. null = tự nguyện. */
    defaultAmount: { type: Number, min: 0, default: null },
    unit: { type: String, enum: FUND_UNITS, required: true, default: 'ho' },
    period: { type: periodSchema, required: true },
    dueDate: { type: String, match: ISO_DATE_REGEX }, // hạn đóng
    status: { type: String, enum: FUND_STATUSES, required: true, default: 'mo' },
    description: { type: String, trim: true, maxlength: 500 },
    bank: { type: bankSchema, default: undefined },
  },
  { timestamps: true, collection: 'funds' },
);

fundSchema.index({ code: 1, 'period.year': 1, 'period.label': 1 }, { unique: true });
fundSchema.index({ status: 1 });

applyJsonTransform(fundSchema);

export type Fund = InferSchemaType<typeof fundSchema>;
export const FundModel = model('Fund', fundSchema);
