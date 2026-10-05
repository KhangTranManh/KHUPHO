import { useId, type TextareaHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

/** Ô nhập nhiều dòng — cùng kiểu dáng với TextField. */
export function TextArea({ label, className = '', id, rows = 4, ...rest }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea id={inputId} rows={rows} className={`${styles.input} ${styles.textarea}`} {...rest} />
    </div>
  );
}
