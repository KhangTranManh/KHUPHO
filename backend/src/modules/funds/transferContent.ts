/**
 * Nội dung chuyển khoản chuẩn để tự đối soát: "QKP <MÃ QUỸ> <SỐ HỘ>", VD "QKP VINGUOINGHEO HK1001".
 *  - Chỉ chữ in hoa + số: nhiều ngân hàng tự bỏ dấu "-", dấu cách, chữ có dấu trong nội dung.
 *  - Tiền tố QKP ("quỹ khu phố") để tìm được giữa phần ngân hàng tự thêm (VD: "MBVCB.123.QKP VINGUOINGHEO HK1001.CT tu…").
 *  - Ngắn (< 25 ký tự với mã quỹ thông thường) vì một số ngân hàng cắt nội dung dài.
 * Frontend không tự ghép chuỗi này — nhận sẵn từ GET /funds/:id/my-payment.
 *
 * Khi đọc lại, ranh giới mã quỹ / số hộ có thể mất (ngân hàng bỏ dấu cách) → không tách bằng regex
 * mà so với mã quỹ, số hộ CÓ THẬT (bankTransfer.service.ts).
 */
const PREFIX = 'QKP';

/** Bỏ mọi ký tự không phải chữ / số, in hoa: "VI-NGUOI-NGHEO" → "VINGUOINGHEO". */
export const compactCode = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export const buildTransferContent = (fundCode: string, householdCode: string) =>
  `${PREFIX} ${compactCode(fundCode)} ${compactCode(householdCode)}`;

/** Phần sau "QKP" (đã thu gọn) — VD "VINGUOINGHEOHK1001CTTU0123". Không có "QKP" → null. */
export function extractReference(content: string): string | null {
  const compact = compactCode(content);
  const at = compact.indexOf(PREFIX);
  return at < 0 ? null : compact.slice(at + PREFIX.length, at + PREFIX.length + 60);
}

/**
 * Các số hộ có thể nằm ở đầu `rest` (chữ + số), dài nhất trước, kèm dạng có "-":
 * "HK10010123" → ["HK10010123", "HK-10010123", "HK1001012", …, "HK10", "HK-10"].
 * Phòng trường hợp ngân hàng nối thêm chữ số ngay sau số hộ.
 */
export function householdCandidates(rest: string): string[] {
  const m = /^([A-Z]{1,4})(\d{2,10})/.exec(rest);
  if (!m) return [];
  const [, letters, digits] = m;
  const out: string[] = [];
  for (let n = digits.length; n >= 2; n--) out.push(`${letters}${digits.slice(0, n)}`, `${letters}-${digits.slice(0, n)}`);
  return out;
}
