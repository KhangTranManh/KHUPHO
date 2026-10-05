import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { encryptedString } from '../../common/db/encrypted.js';
import { blindIndex } from '../../common/security/fieldEncryption.js';
import { ROLES, USER_STATUSES } from './user.roles.js';

/** Liên kết tài khoản cư dân ↔ nhân khẩu (households.members). Nhân khẩu ─1 Tài khoản. */
const residentRefSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    memberId: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

/**
 * Collection `users` — tài khoản đăng nhập. Đăng nhập bằng SĐT hoặc email.
 * Họ tên / SĐT / email được mã hoá; phoneHash / emailHash (blind index, unique) để tra cứu khi đăng nhập.
 * Trường nhạy cảm `select: false` → không trả ra ngoài trừ khi chủ động `.select('+...')`.
 */
const userSchema = new Schema(
  {
    fullName: encryptedString({ required: true }),
    phone: encryptedString(),
    phoneHash: { type: String },
    email: encryptedString(),
    emailHash: { type: String },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    status: { type: String, enum: USER_STATUSES, required: true, default: 'active' },
    residentRef: { type: residentRefSchema, default: undefined },

    // Chống dò mật khẩu
    failedLoginCount: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false, collection: 'users' },
);

userSchema.index({ phoneHash: 1 }, { unique: true, partialFilterExpression: { phoneHash: { $type: 'string' } } });
userSchema.index({ emailHash: 1 }, { unique: true, partialFilterExpression: { emailHash: { $type: 'string' } } });
userSchema.index({ 'residentRef.memberId': 1 }, { unique: true, partialFilterExpression: { 'residentRef.memberId': { $exists: true } } });
userSchema.index({ role: 1, status: 1 });

userSchema.pre('validate', function () {
  const phone = this.get('phone') as string | undefined;
  const email = this.get('email') as string | undefined;
  if (!phone && !email) this.invalidate('phone', 'Cần SĐT hoặc email để đăng nhập');
  this.phoneHash = phone ? blindIndex('phone', phone) : undefined;
  this.emailHash = email ? blindIndex('email', email) : undefined;
});

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model('User', userSchema);
