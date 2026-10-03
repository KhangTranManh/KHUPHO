/** Tài khoản cán bộ đang đăng nhập. */
export interface Officer {
  id: string;
  fullName: string;
  position: string; // chức vụ
  unit: string; // đơn vị công tác
  phone: string;
  email: string;
  /** Id các tổ dân phố được phân công phụ trách. */
  groupIds: string[];
  bio: string;
}
