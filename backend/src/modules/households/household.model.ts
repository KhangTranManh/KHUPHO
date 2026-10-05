import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { encryptedString } from '../../common/db/encrypted.js';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { searchTokens } from '../../common/security/fieldEncryption.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { buildSearchText } from '../../common/utils/text.js';
import { CULTURAL_RESULTS, HOUSEHOLD_TYPES, HOUSING_TYPES } from './household.constants.js';
import { memberSchema } from './member.schema.js';

/** Danh hiệu gia đình văn hoá một năm — nhúng trong hộ. */
const culturalTitleSchema = new Schema(
  {
    year: { type: Number, required: true, min: 2000, max: 2100 },
    result: { type: String, enum: CULTURAL_RESULTS, required: true },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

/** Toạ độ GeoJSON [kinh độ, vĩ độ] — dùng cho sơ đồ hộ chính sách và SOS. */
const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: { validator: (v: number[]) => v.length === 2, message: 'Toạ độ gồm [kinh độ, vĩ độ]' },
    },
  },
  { _id: false },
);

/**
 * Collection `households` — Hộ gia đình, NHÚNG danh sách nhân khẩu (`members`) và
 * danh hiệu văn hoá theo năm (`culturalTitles`).
 * Quan hệ: Khu vực 1─n Hộ 1─n Nhân khẩu; Hộ 1─n Khoản đóng; Hộ 1─n Phản ánh.
 * Chủ hộ = thành viên có relation "chu_ho" (đúng một người).
 */
const householdSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 20 }, // mã hộ
    housingType: { type: String, enum: HOUSING_TYPES, required: true },
    areaId: { type: Schema.Types.ObjectId, ref: 'Area', required: true },
    areaName: { type: String, required: true }, // sao chép từ areas để hiển thị
    address: { type: String, required: true, trim: true, maxlength: 255 },

    // Thấp tầng
    houseNumber: { type: String, trim: true, maxlength: 20 },
    alley: { type: String, trim: true, maxlength: 60 },
    street: { type: String, trim: true, maxlength: 120 },
    // Cao tầng
    building: { type: String, trim: true, maxlength: 120 },
    block: { type: String, trim: true, maxlength: 20 },
    floor: { type: Number, min: 0, max: 200 },
    apartment: { type: String, trim: true, maxlength: 20 }, // số căn

    /** SĐT liên hệ của hộ (mặc định là SĐT chủ hộ). */
    contactPhone: encryptedString(),
    householdType: { type: String, enum: HOUSEHOLD_TYPES, required: true, default: 'thuong' },
    location: { type: pointSchema, default: undefined },
    culturalTitles: { type: [culturalTitleSchema], default: [] },
    members: { type: [memberSchema], default: [] },
    registeredAt: { type: String, required: true, match: ISO_DATE_REGEX },

    /** Tìm kiếm: bản rõ không nhạy cảm (mã hộ, địa chỉ) + token của thành viên (tên, SĐT). */
    searchText: { type: String },
    searchTokens: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'households' },
);

householdSchema.index({ housingType: 1, areaId: 1 });
householdSchema.index({ householdType: 1 });
householdSchema.index({ location: '2dsphere' }, { sparse: true });
householdSchema.index({ 'members.citizenIdHash': 1 });
householdSchema.index({ 'members.phoneHash': 1 });
householdSchema.index({ 'members.searchTokens': 1 });
householdSchema.index({ 'members.residenceStatus': 1 });
householdSchema.index({ 'members.categories': 1 });
householdSchema.index({ 'culturalTitles.year': 1, 'culturalTitles.result': 1 });

householdSchema.pre('validate', function () {
  const heads = this.members.filter((m) => m.relation === 'chu_ho').length;
  if (this.members.length > 0 && heads !== 1) {
    this.invalidate('members', 'Mỗi hộ phải có đúng một chủ hộ');
  }
  this.searchText = buildSearchText(this.code, this.address, this.areaName);
  this.searchTokens = searchTokens(
    ...this.members.map((m) => m.get('fullName') as string),
    this.get('contactPhone') as string | undefined,
  );
});

applyJsonTransform(householdSchema, ['searchText', 'searchTokens']);

export type Household = InferSchemaType<typeof householdSchema>;
export type HouseholdDocument = HydratedDocument<Household>;
export const HouseholdModel = model('Household', householdSchema);
