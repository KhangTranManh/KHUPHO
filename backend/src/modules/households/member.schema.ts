import { Schema } from 'mongoose';
import { encryptedString } from '../../common/db/encrypted.js';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { blindIndex, searchTokens } from '../../common/security/fieldEncryption.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { GENDERS, RELATIONS, RESIDENCE_STATUSES, RESIDENT_CATEGORIES } from '../residents/resident.constants.js';

/** Một giai đoạn cư trú (thường trú / tạm trú / tạm vắng) — lịch sử, chỉ thêm. */
const residencePeriodSchema = new Schema(
  {
    status: { type: String, enum: RESIDENCE_STATUSES, required: true },
    from: { type: String, required: true, match: ISO_DATE_REGEX },
    to: { type: String, match: ISO_DATE_REGEX },
    note: { type: String, trim: true, maxlength: 255 }, // lý do, nơi đến…
    recordedAt: { type: Date, default: () => new Date() },
    recordedBy: { type: String }, // tên cán bộ ghi nhận
  },
  { _id: false },
);

/**
 * Nhân khẩu — NHÚNG trong `households.members[]` (Hộ 1─n Nhân khẩu).
 * Trường cá nhân được mã hoá (encryptedString); `*Hash` / `searchTokens` để tra cứu không cần giải mã.
 * Tuổi tính từ dateOfBirth, không lưu.
 */
export const memberSchema = new Schema(
  {
    fullName: encryptedString({ required: true }),
    gender: { type: String, enum: GENDERS, required: true },
    dateOfBirth: { type: String, required: true, match: ISO_DATE_REGEX },
    citizenId: encryptedString(), // CCCD — trẻ em có thể chưa có
    citizenIdHash: { type: String },
    phone: encryptedString(),
    phoneHash: { type: String },
    /** Quan hệ với chủ hộ; "chu_ho" = chính chủ hộ. */
    relation: { type: String, enum: RELATIONS, required: true },
    /** Liên hệ khác: người thân, Zalo, nơi làm việc… */
    otherContact: encryptedString(),

    /** Tình trạng cư trú hiện tại + thời hạn (nếu tạm trú / tạm vắng). */
    residenceStatus: { type: String, enum: RESIDENCE_STATUSES, required: true, default: 'thuong_tru' },
    residenceFrom: { type: String, match: ISO_DATE_REGEX },
    residenceTo: { type: String, match: ISO_DATE_REGEX },
    /** Các giai đoạn cư trú trước đây và hiện tại. */
    residenceHistory: { type: [residencePeriodSchema], default: [] },

    categories: { type: [{ type: String, enum: RESIDENT_CATEGORIES }], default: [] },
    registeredAt: { type: String, required: true, match: ISO_DATE_REGEX },

    /** HMAC từng từ của họ tên / CCCD / SĐT / số hộ — để tìm kiếm. */
    searchTokens: { type: [String], default: [] },
  },
  { timestamps: false },
);

/** Cập nhật blind index + token tìm kiếm mỗi khi lưu (đọc bản rõ qua getter). */
memberSchema.pre('validate', function () {
  const fullName = this.get('fullName') as string | undefined;
  const citizenId = this.get('citizenId') as string | undefined;
  const phone = this.get('phone') as string | undefined;
  this.citizenIdHash = citizenId ? blindIndex('cccd', citizenId) : undefined;
  this.phoneHash = phone ? blindIndex('phone', phone) : undefined;
  this.searchTokens = searchTokens(fullName, citizenId, phone);
});

applyJsonTransform(memberSchema, ['citizenIdHash', 'phoneHash', 'searchTokens']);
