import type { Resident } from '@/features/residents/types';

/**
 * Khu vực, hộ gia đình. Giữ đồng bộ với backend/src/modules/{areas,households}.
 *
 * Cư dân chia 2 nhóm theo loại nhà ở:
 *   thap_tang — nhà phố, nhà trong hẻm; khu vực thuộc tổ dân phố, gồm các hẻm / đường
 *   cao_tang  — căn hộ chung cư; khu vực là toà / block
 */
export type HousingType = 'thap_tang' | 'cao_tang';

/** Loại hộ — khác "thuong" hiện trên sơ đồ hộ chính sách / khó khăn. */
export type HouseholdType = 'thuong' | 'ngheo' | 'can_ngheo' | 'chinh_sach' | 'kho_khan';

export type CulturalResult = 'dat' | 'chua_dat' | 'dang_binh_xet';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Khu vực / Toà nhà. */
export interface Area {
  id: string;
  name: string; // "Tổ 1", "Hoà Bình – Block A"
  housingType: HousingType;
  residentialGroup: string; // tổ dân phố
  streets?: string[]; // hẻm / đường (thấp tầng)
  building?: { name: string; block?: string; floors?: number }; // cao tầng
  /** Tổ trưởng (thấp tầng) hoặc trưởng ban quản trị (cao tầng). */
  managerName: string;
  managerPhone?: string;
}

export interface Household {
  id: string;
  code: string; // mã hộ
  housingType: HousingType;
  areaId: string;
  areaName: string;
  address: string;

  // Thấp tầng
  houseNumber?: string;
  alley?: string;
  street?: string;
  // Cao tầng
  building?: string;
  block?: string;
  floor?: number;
  apartment?: string; // số căn

  householdType: HouseholdType;
  /** Toạ độ — cho sơ đồ hộ chính sách và SOS. */
  location?: GeoPoint;
  /** Danh hiệu gia đình văn hoá theo năm. */
  culturalTitles: { year: number; result: CulturalResult; note?: string }[];

  /** Suy ra từ thành viên có quan hệ "chủ hộ". */
  headName: string;
  /** SĐT liên hệ của hộ. */
  headPhone?: string;
  memberCount: number;
  registeredAt: string;
}

/** Hộ kèm danh sách nhân khẩu (GET /households/:id). */
export interface HouseholdDetail extends Household {
  members: Resident[];
}
