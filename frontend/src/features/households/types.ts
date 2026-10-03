/** Hộ gia đình và tổ dân phố. Giữ đồng bộ với schema `ho_gia_dinh`, `to_dan_pho`. */

export interface Household {
  id: string;
  code: string; // số hộ
  headName: string;
  address: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  registeredAt: string;
}

export interface ResidentialGroup {
  id: string;
  name: string; // "Tổ 1"
  leaderName: string; // tổ trưởng
}
