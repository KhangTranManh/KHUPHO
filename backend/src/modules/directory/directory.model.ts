import { Schema, model, type InferSchemaType } from 'mongoose';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';

export const DIRECTORY_GROUPS = ['khan_cap', 'chinh_quyen', 'khu_pho', 'doan_the'] as const;

/**
 * Collection `directory` — Sổ tay phường: đơn vị (CSKV, PCCC, Y tế, UBND, hội đoàn thể…),
 * người phụ trách, SĐT, ghi chú. Thông tin công khai cho cư dân nên không mã hoá.
 */
const directorySchema = new Schema(
  {
    group: { type: String, enum: DIRECTORY_GROUPS, required: true },
    unit: { type: String, required: true, trim: true, maxlength: 150 }, // đơn vị / chức danh
    personInCharge: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    note: { type: String, trim: true, maxlength: 255 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'directory' },
);

directorySchema.index({ group: 1, order: 1 });

applyJsonTransform(directorySchema);

export type DirectoryEntry = InferSchemaType<typeof directorySchema>;
export const DirectoryModel = model('DirectoryEntry', directorySchema);
