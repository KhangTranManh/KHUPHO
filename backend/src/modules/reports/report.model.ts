import { Schema, model, type InferSchemaType } from 'mongoose';
import { encryptedString } from '../../common/db/encrypted.js';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { searchTokens } from '../../common/security/fieldEncryption.js';
import { buildSearchText } from '../../common/utils/text.js';
import {
  REPORT_ACTIONS,
  REPORT_CATEGORIES,
  REPORT_CATEGORY_TYPE,
  REPORT_HANDLER_ROLES,
  REPORT_SEVERITIES,
  REPORT_STATUSES,
  REPORT_TYPES,
} from './report.constants.js';

/** Người gửi + hộ của người gửi. Tên / SĐT mã hoá. */
const reporterSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    householdId: { type: Schema.Types.ObjectId, ref: 'Household' },
    householdCode: { type: String },
    name: encryptedString({ required: true }),
    phone: encryptedString(),
  },
  { _id: false },
);

const locationSchema = new Schema(
  {
    address: { type: String, trim: true, maxlength: 255 },
    /** GeoJSON [kinh độ, vĩ độ] nếu có (VD: lấy từ GPS khi bấm SOS). */
    point: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined },
    },
  },
  { _id: false },
);

/** Một bước xử lý — chỉ thêm, không sửa. */
const historySchema = new Schema(
  {
    at: { type: Date, required: true, default: () => new Date() },
    byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    byName: { type: String, required: true },
    action: { type: String, enum: REPORT_ACTIONS, required: true },
    fromStatus: { type: String, enum: REPORT_STATUSES },
    toStatus: { type: String, enum: REPORT_STATUSES },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

/**
 * Collection `reports` — phản ánh an ninh / mất an toàn / hư hỏng dân sinh và SOS.
 * Quan hệ: Hộ / Người 1─n Phản ánh. Lịch sử xử lý nhúng trong `history`.
 * Thời gian gửi = createdAt; thời gian xử lý xong = resolvedAt.
 */
const reportSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // PA-2026-0012 / SOS-2026-0003
    type: { type: String, enum: REPORT_TYPES, required: true },
    category: { type: String, enum: REPORT_CATEGORIES, required: true },
    severity: { type: String, enum: REPORT_SEVERITIES, required: true, default: 'thuong' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000 },
    /** URL ảnh đính kèm (lưu file ở dịch vụ lưu trữ riêng). */
    images: { type: [{ type: String, maxlength: 500 }], default: [] },
    location: { type: locationSchema, default: undefined },

    reporter: { type: reporterSchema, required: true },
    status: { type: String, enum: REPORT_STATUSES, required: true, default: 'moi' },
    /** Giao cho Trưởng KP hay Công an KV; có thể kèm người cụ thể. */
    assignedRole: { type: String, enum: REPORT_HANDLER_ROLES },
    assignee: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
    },
    resolvedAt: { type: Date },
    history: { type: [historySchema], default: [] },

    searchText: { type: String },
    searchTokens: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'reports' },
);

reportSchema.index({ type: 1, status: 1, createdAt: -1 });
reportSchema.index({ 'reporter.userId': 1, createdAt: -1 });
reportSchema.index({ 'reporter.householdId': 1 });
reportSchema.index({ 'location.point': '2dsphere' }, { sparse: true });

reportSchema.pre('validate', function () {
  this.type = REPORT_CATEGORY_TYPE[this.category];
  if (this.type === 'sos') this.severity = 'khan';
  this.searchText = buildSearchText(this.code, this.title, this.location?.address, this.reporter?.householdCode);
  this.searchTokens = searchTokens(this.get('reporter.name') as string, this.get('reporter.phone') as string);
});

applyJsonTransform(reportSchema, ['searchText', 'searchTokens']);

export type Report = InferSchemaType<typeof reportSchema>;
export const ReportModel = model('Report', reportSchema);
