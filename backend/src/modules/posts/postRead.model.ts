import { Schema, model } from 'mongoose';

/**
 * Collection `post_reads` — trạng thái đọc: tài khoản nào đã xem bài nào, lúc nào.
 * Tách riêng khỏi `posts` vì số lượt đọc tăng không giới hạn. Unique (postId, userId).
 */
const postReadSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false, collection: 'post_reads' },
);

postReadSchema.index({ postId: 1, userId: 1 }, { unique: true });
postReadSchema.index({ userId: 1, readAt: -1 });

export const PostReadModel = model('PostRead', postReadSchema);
