import { useId, type SelectHTMLAttributes } from 'react';
import styles from './TextField.module.css';

export interface SelectOption<V extends string> {
  value: V;
  label: string;
}

interface SelectProps<V extends string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label?: string;
  value: V;
  options: SelectOption<V>[];
  onChange: (value: V) => void;
}

/** Danh sách chọn — cùng kiểu dáng với TextField. */
export function Select<V extends string>({ label, value, options, onChange, className = '', id, ...rest }: SelectProps<V>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`${styles.input} ${styles.select}`}
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
