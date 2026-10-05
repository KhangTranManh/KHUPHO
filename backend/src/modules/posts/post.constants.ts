/** Bài đăng — thông báo & tuyên truyền. Giữ đồng bộ với frontend/src/features/posts. */

/** Loại bài: thông báo nhanh, tuyên truyền, sự kiện. */
export const POST_KINDS = ['thong_bao_nhanh', 'tuyen_truyen', 'su_kien'] as const;

/** Danh mục (độc lập với loại). */
export const POST_CATEGORIES = [
  'rac',
  'cup_dien',
  'pccc',
  'tiem_chung',
  'kham_suc_khoe',
  'chinh_sach',
  'phong_dich',
  'van_dong_quy',
  'le_hoi',
  'khac',
] as const;

/** Phạm vi đối tượng nhận. */
export const AUDIENCE_SCOPES = ['all', 'area', 'group'] as const;
