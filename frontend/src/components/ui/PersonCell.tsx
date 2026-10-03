import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { CellStack } from './DataTable';
import styles from './PersonCell.module.css';

/** Ô "avatar + tên + dòng phụ" dùng trong các bảng có cột người. */
export function PersonCell({ name, secondary }: { name: string; secondary?: ReactNode }) {
  return (
    <div className={styles.person}>
      <Avatar name={name} />
      <CellStack primary={name} secondary={secondary} />
    </div>
  );
}
