import type { ReactNode } from 'react';
import { TextField } from './TextField';
import styles from './ListToolbar.module.css';

interface ListToolbarProps {
  /** Bộ lọc bên trái (thường là <Tabs>). */
  children?: ReactNode;
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
}

export function ListToolbar({ children, search, onSearch, placeholder = 'Tìm kiếm…' }: ListToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>{children}</div>
      <TextField
        className={styles.search}
        icon="search"
        type="search"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        aria-label={placeholder}
      />
    </div>
  );
}
