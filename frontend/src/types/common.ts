/** Kiểu dùng chung toàn app. */

export type Tone =
  | 'primary'
  | 'dark'
  | 'danger'
  | 'warning'
  | 'success'
  | 'info'
  | 'secondary'
  | 'flag';

/** Tham số truy vấn danh sách có phân trang. */
export interface ListQuery<F extends string = string> {
  search?: string;
  filter?: F | 'all';
  page: number;
  pageSize: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
