import styles from './Tabs.module.css';

export interface TabOption<V extends string> {
  value: V;
  label: string;
}

interface TabsProps<V extends string> {
  options: TabOption<V>[];
  value: V;
  onChange: (value: V) => void;
}

/** Nhóm nút chọn dạng "pill" — ô đang chọn nổi lên nền trắng. */
export function Tabs<V extends string>({ options, value, onChange }: TabsProps<V>) {
  return (
    <div className={styles.tabs} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={`${styles.tab} ${o.value === value ? styles.active : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
