/** Chỉ lấy các trường đã đổi so với ban đầu (so sánh theo chuỗi; undefined ≡ ''). Mảng so theo nội dung. */
export function changedFields<T extends Record<string, unknown>>(original: T, draft: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(draft) as (keyof T)[]) {
    const a = original[key];
    const b = draft[key];
    const same = Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a ?? []) === JSON.stringify(b ?? []) : (a ?? '') === (b ?? '');
    if (!same) out[key] = b;
  }
  return out;
}
