import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const SESSION_REVOKE_REASONS = ['logout', 'logout_all', 'token_reuse', 'user_disabled', 'password_changed', 'session_limit'] as const;

/**
 * Collection `sessions` — mỗi lần đăng nhập trên một thiết bị là một phiên.
 * Chỉ lưu SHA-256 của refresh token, không lưu token gốc.
 * Mỗi lần refresh, token được xoay vòng: token cũ chuyển sang `previousTokenHash`;
 * nếu token cũ bị dùng lại (dấu hiệu bị đánh cắp) → thu hồi cả phiên.
 * Mongo tự xoá phiên khi quá `expiresAt` (TTL index).
 */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    previousTokenHash: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedReason: { type: String, enum: SESSION_REVOKE_REASONS },
    lastUsedAt: { type: Date },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true, versionKey: false, collection: 'sessions' },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ previousTokenHash: 1 }, { sparse: true });

export type Session = InferSchemaType<typeof sessionSchema>;
export type SessionDocument = HydratedDocument<Session>;

export const SessionModel = model('Session', sessionSchema);
