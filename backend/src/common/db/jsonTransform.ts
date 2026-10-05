import type { Schema } from 'mongoose';

/**
 * Chuẩn hoá cách document trả ra API (khi `res.json(doc)`):
 *  - `_id` → `id` (chuỗi), bỏ `_id`;
 *  - chạy getter (giải mã các trường encryptedString);
 *  - ObjectId tham chiếu (areaId, householdId…) tự thành chuỗi hex;
 *  - ẩn các trường nội bộ (VD: blind index, token tìm kiếm).
 * Gọi trong file model: `applyJsonTransform(schema, ['searchTokens'])`.
 */
export function applyJsonTransform(schema: Schema, hiddenFields: string[] = []) {
  schema.set('toJSON', {
    getters: true,
    virtuals: false,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      if (ret._id !== undefined) ret.id = String(ret._id);
      delete ret._id;
      for (const f of hiddenFields) delete ret[f];
      return ret;
    },
  });
}
