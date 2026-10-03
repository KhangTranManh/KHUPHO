const numberFmt = new Intl.NumberFormat('vi-VN');
const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const formatNumber = (n: number) => numberFmt.format(n);

/** ISO yyyy-mm-dd → dd/mm/yyyy */
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

/** "Nguyễn Văn An" → "NA" (chữ đầu của họ và tên). */
export function initials(fullName: string) {
  const words = fullName.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Che bớt số CCCD khi hiển thị trong danh sách: 001203004567 → 0012••••4567 */
export const maskCitizenId = (id: string) =>
  id.length > 8 ? `${id.slice(0, 4)}${'•'.repeat(id.length - 8)}${id.slice(-4)}` : id;
