import type { Paged } from '@/types/common';
import { DataTable, type Column } from './DataTable';
import { PageState } from './PageState';
import { Pagination } from './Pagination';
import styles from './ListView.module.css';

interface ListViewProps<T> {
  data?: Paged<T>;
  error?: string;
  loading: boolean;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onPageChange: (page: number) => void;
  emptyText?: string;
}

/** Bảng + phân trang + trạng thái tải/lỗi cho một kết quả `Paged<T>`. */
export function ListView<T>({ data, error, loading, columns, rowKey, onPageChange, emptyText }: ListViewProps<T>) {
  if (!data) return <PageState error={error} />;

  return (
    <div className={loading ? styles.loading : undefined} aria-busy={loading}>
      <DataTable columns={columns} rows={data.items} rowKey={rowKey} emptyText={emptyText} />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={onPageChange} />
    </div>
  );
}
