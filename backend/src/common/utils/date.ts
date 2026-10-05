/**
 * Ngày không có giờ (ngày sinh, ngày đăng ký, thời hạn tạm trú…) lưu dạng chuỗi "yyyy-mm-dd":
 * không lệch múi giờ, so sánh / sắp xếp được bằng chuỗi, khớp kiểu frontend dùng.
 */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** Ngày cách hôm nay `days` ngày, dạng yyyy-mm-dd (âm = quá khứ). */
export const isoDaysFromToday = (days: number, today = new Date()) => toISODate(addDays(today, days));

export function ageFrom(dateOfBirth: string, today = new Date()) {
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}
