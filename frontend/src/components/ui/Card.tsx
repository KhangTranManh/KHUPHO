import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Bỏ padding phần thân — dùng cho bảng tràn sát mép. */
  flush?: boolean;
}

/** Khối nội dung nền trắng, bo góc lớn, bóng mềm. */
export function Card({ title, subtitle, action, children, className = '', flush }: CardProps) {
  return (
    <section className={`${styles.card} ${className}`}>
      {(title || action) && (
        <header className={styles.header}>
          <div>
            {title && <h6 className={styles.title}>{title}</h6>}
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? styles.flush : styles.body}>{children}</div>
    </section>
  );
}
