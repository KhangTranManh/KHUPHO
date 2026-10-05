/** Sổ tay phường — danh bạ. Giữ đồng bộ với backend/src/modules/directory. */

export type DirectoryGroup = 'khan_cap' | 'chinh_quyen' | 'khu_pho' | 'doan_the';

export interface DirectoryEntry {
  id: string;
  group: DirectoryGroup;
  /** Đơn vị / chức danh: "Công an khu vực", "UBND phường", "Hội Cựu chiến binh". */
  unit: string;
  personInCharge?: string;
  phone: string;
  note?: string;
  order: number;
}
