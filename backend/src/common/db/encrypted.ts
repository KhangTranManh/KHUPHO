import { decryptMaybe, encryptField, isEncrypted } from '../security/fieldEncryption.js';

/**
 * Kiểu trường String được mã hoá tự động trong schema Mongoose:
 *   fullName: encryptedString({ required: true })
 * - Gán giá trị thường → lưu bản mã (setter).
 * - Đọc qua document / res.json → nhận lại bản rõ (getter; schema cần toJSON.getters = true,
 *   đã bật trong applyJsonTransform).
 * - Truy vấn .lean() / aggregate trả bản mã → tự giải mã bằng decryptMaybe trong mapper.
 * - Không truy vấn trực tiếp được trên trường mã hoá: dùng thêm trường blindIndex / searchTokens.
 */
export function encryptedString(options: { required?: boolean } = {}) {
  return {
    type: String,
    required: options.required ?? false,
    set: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : isEncrypted(v) ? v : encryptField(String(v))),
    get: (v: unknown) => decryptMaybe(v),
  };
}
