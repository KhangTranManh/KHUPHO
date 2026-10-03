import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  /** Ẩn cột trên màn hình nhỏ. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
}

/** Bảng dữ liệu kiểu soft UI: tiêu đề in hoa mờ, hàng thoáng, viền mảnh. */
export function DataTable<T>({ columns, rows, rowKey, emptyText = 'Không có dữ liệu' }: DataTableProps<T>) {
  const cellClass = (c: Column<T>) =>
    [styles[c.align ?? 'left'], c.hideOnMobile ? styles.hideMobile : ''].join(' ');

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cellClass(c)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={cellClass(c)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Ô hai dòng: dòng chính đậm + dòng phụ mờ. Dùng trong cột của DataTable. */
export function CellStack({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className={styles.stack}>
      <span className={styles.primary}>{primary}</span>
      {secondary && <span className={styles.secondary}>{secondary}</span>}
    </div>
  );
}
