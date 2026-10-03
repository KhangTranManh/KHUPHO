import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ROLES, USER_STATUSES } from './user.roles.js';

/**
 * Collection `users` — tài khoản đăng nhập của cả 3 vai trò.
 * Người dân dùng số CCCD làm `username` và lưu thêm ở `citizenId` để liên kết với nhân khẩu.
 * Các trường nhạy cảm `select: false` → không bao giờ trả ra ngoài trừ khi chủ động `.select('+...')`.
 */
const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 64 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 20 },
    citizenId: { type: String, trim: true, match: /^\d{12}$/ },
    status: { type: String, enum: USER_STATUSES, required: true, default: 'active' },

    // Chống dò mật khẩu
    failedLoginCount: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false, collection: 'users' },
);

userSchema.index({ role: 1, status: 1 });
// Mỗi CCCD chỉ gắn với một tài khoản (bỏ qua tài khoản không có CCCD).
userSchema.index(
  { citizenId: 1 },
  { unique: true, partialFilterExpression: { citizenId: { $type: 'string' } } },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model('User', userSchema);
