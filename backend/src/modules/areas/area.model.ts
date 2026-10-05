import { Schema, model, type InferSchemaType } from 'mongoose';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { HOUSING_TYPES } from '../households/household.constants.js';

/** Thông tin toà nhà — chỉ cho khu vực cao tầng. */
const buildingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 }, // "Chung cư Hoà Bình"
    block: { type: String, trim: true, maxlength: 20 }, // "A"
    floors: { type: Number, min: 1, max: 200 },
  },
  { _id: false },
);

/**
 * Collection `areas` — Khu vực / Toà nhà.
 *   Thấp tầng: thuộc một tổ dân phố, gồm các hẻm / đường.
 *   Cao tầng : một toà / block chung cư (tên toà, block, số tầng).
 * Quan hệ: Khu vực 1─n Hộ.
 */
const areaSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 120 }, // "Tổ 1", "Hoà Bình – Block A"
    housingType: { type: String, enum: HOUSING_TYPES, required: true },
    /** Tổ dân phố quản lý khu vực này. */
    residentialGroup: { type: String, required: true, trim: true, maxlength: 60 },
    /** Tên hẻm / đường (thấp tầng). */
    streets: { type: [{ type: String, trim: true, maxlength: 120 }], default: undefined },
    building: { type: buildingSchema, default: undefined },
    /** Tổ trưởng (thấp tầng) / trưởng ban quản trị (cao tầng). */
    managerName: { type: String, required: true, trim: true, maxlength: 120 },
    managerPhone: { type: String, trim: true, maxlength: 20 },
  },
  { timestamps: true, collection: 'areas' },
);

applyJsonTransform(areaSchema);

export type Area = InferSchemaType<typeof areaSchema>;
export const AreaModel = model('Area', areaSchema);
