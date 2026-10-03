const DAY_MS = 86_400_000;

/** Date → yyyy-mm-dd theo giờ địa phương. */
export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** Số ngày từ `from` tới `to` (âm nếu `to` ở quá khứ). */
export function daysBetween(from: Date, to: Date) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

export function ageFrom(dateOfBirth: string, today = new Date()) {
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age;
}

/** Nhãn "T<tháng>" của 12 tháng gần nhất, cũ → mới. */
export function lastMonthLabels(count = 12, today = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (count - 1 - i), 1);
    return `T${d.getMonth() + 1}`;
  });
}
