/** Bỏ dấu tiếng Việt + chữ thường: "Nguyễn Văn Đức" → "nguyen van duc". Dùng cho tìm kiếm. */
export const normalizeText = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

/** Ghép các trường thành chuỗi tìm kiếm đã chuẩn hoá (bỏ giá trị rỗng). */
export const buildSearchText = (...fields: (string | number | null | undefined)[]) =>
  normalizeText(fields.filter((f) => f !== undefined && f !== null && f !== '').join(' '));

/** Thoát ký tự đặc biệt để dùng chuỗi người dùng nhập trong RegExp. */
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
