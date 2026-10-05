import { Schema, model, type InferSchemaType } from 'mongoose';
import { encryptedString } from '../../common/db/encrypted.js';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { searchTokens } from '../../common/security/fieldEncryption.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { buildSearchText } from '../../common/utils/text.js';

export const CHANGE_TYPES = ['nhap_khau', 'chuyen_di', 'sinh', 'tu_vong', 'tam_tru', 'tam_vang'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

/**
 * Collection `resident_changes` — nhật ký biến động dân cư (chỉ thêm, không sửa).
 * Tên nhân khẩu được mã hoá; tìm theo tên qua searchTokens.
 */
const residentChangeSchema = new Schema(
  {
    type: { type: String, enum: CHANGE_TYPES, required: true },
    householdId: { type: Schema.Types.ObjectId, ref: 'Household' },
    memberId: { type: Schema.Types.ObjectId },
    residentName: encryptedString({ required: true }),
    householdCode: { type: String, required: true, trim: true },
    date: { type: String, required: true, match: ISO_DATE_REGEX },
    /** Cán bộ ghi nhận (tên hiển thị) + id tài khoản nếu có. */
    officer: { type: String, required: true, trim: true },
    officerId: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true, maxlength: 255 },
    searchText: { type: String },
    searchTokens: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'resident_changes' },
);

residentChangeSchema.index({ date: -1 });
residentChangeSchema.index({ type: 1, date: -1 });

residentChangeSchema.pre('validate', function () {
  this.searchText = buildSearchText(this.householdCode, this.officer);
  this.searchTokens = searchTokens(this.get('residentName') as string);
});

applyJsonTransform(residentChangeSchema, ['searchText', 'searchTokens']);

export type ResidentChange = InferSchemaType<typeof residentChangeSchema>;
export const ResidentChangeModel = model('ResidentChange', residentChangeSchema);
