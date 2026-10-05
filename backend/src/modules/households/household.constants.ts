/**
 * Giá trị cố định của hộ gia đình. Giữ đồng bộ với frontend/src/features/households/types.ts.
 */

/** Loại nhà ở: thấp tầng (nhà phố, hẻm) / cao tầng (chung cư). */
export const HOUSING_TYPES = ['thap_tang', 'cao_tang'] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];

/** Loại hộ — hộ khác "thuong" hiện trên sơ đồ hộ chính sách / khó khăn. */
export const HOUSEHOLD_TYPES = ['thuong', 'ngheo', 'can_ngheo', 'chinh_sach', 'kho_khan'] as const;
export type HouseholdType = (typeof HOUSEHOLD_TYPES)[number];

/** Kết quả bình xét gia đình văn hoá theo năm. */
export const CULTURAL_RESULTS = ['dat', 'chua_dat', 'dang_binh_xet'] as const;
export type CulturalResult = (typeof CULTURAL_RESULTS)[number];
