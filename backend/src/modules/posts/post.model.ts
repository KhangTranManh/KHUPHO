import { Schema, model, type InferSchemaType } from 'mongoose';
import { applyJsonTransform } from '../../common/db/jsonTransform.js';
import { ISO_DATE_REGEX } from '../../common/utils/date.js';
import { buildSearchText } from '../../common/utils/text.js';
import { RESIDENT_CATEGORIES } from '../residents/resident.constants.js';
import { AUDIENCE_SCOPES, POST_CATEGORIES, POST_KINDS } from './post.constants.js';

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true, maxlength: 500 },
    name: { type: String, required: true, maxlength: 200 },
    mimeType: { type: String, maxlength: 100 },
  },
  { _id: false },
);

/**
 * Đối tượng nhận:
 *   all   — toàn khu phố
 *   area  — các khu vực trong `areaIds`
 *   group — cư dân thuộc một trong các nhóm `categories` (VD: chỉ người cao tuổi)
 */
const audienceSchema = new Schema(
  {
    scope: { type: String, enum: AUDIENCE_SCOPES, required: true, default: 'all' },
    areaIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Area' }], default: undefined },
    categories: { type: [{ type: String, enum: RESIDENT_CATEGORIES }], default: undefined },
  },
  { _id: false },
);

/**
 * Collection `posts` — thông báo nhanh (rác, cúp điện, PCCC, tiêm chủng…), tuyên truyền, sự kiện.
 * Quan hệ: Bài đăng ─(nhắm tới)→ Khu vực / Nhóm đối tượng. Trạng thái đọc ở `post_reads`.
 */
const postSchema = new Schema(
  {
    kind: { type: String, enum: POST_KINDS, required: true },
    category: { type: String, enum: POST_CATEGORIES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 10_000 },
    attachments: { type: [attachmentSchema], default: [] },
    eventDate: { type: String, match: ISO_DATE_REGEX },
    eventTime: { type: String, trim: true, maxlength: 50 },
    location: { type: String, trim: true, maxlength: 255 },
    audience: { type: audienceSchema, required: true, default: () => ({ scope: 'all' }) },
    pinned: { type: Boolean, default: false },
    publishedAt: { type: Date, required: true, default: () => new Date() },
    author: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    /** Số tài khoản đã đọc (đếm sẵn từ post_reads). */
    readCount: { type: Number, default: 0 },
    searchText: { type: String },
  },
  { timestamps: true, collection: 'posts' },
);

postSchema.index({ kind: 1, pinned: -1, publishedAt: -1 });
postSchema.index({ 'audience.scope': 1, 'audience.areaIds': 1 });

postSchema.pre('validate', function () {
  this.searchText = buildSearchText(this.title, this.content);
});

applyJsonTransform(postSchema, ['searchText']);

export type Post = InferSchemaType<typeof postSchema>;
export const PostModel = model('Post', postSchema);
