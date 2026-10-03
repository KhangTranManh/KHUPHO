import { useId, type InputHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './TextField.module.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: IconName;
}

export function TextField({ label, icon, className = '', id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.control}>
        {icon && (
          <span className={styles.icon}>
            <Icon name={icon} size={14} />
          </span>
        )}
        <input id={inputId} className={`${styles.input} ${icon ? styles.withIcon : ''}`} {...rest} />
      </div>
    </div>
  );
}
