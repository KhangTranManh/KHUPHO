import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Nút hành động ở chân hộp thoại. */
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/** Hộp thoại nổi. Đóng bằng nút ×, phím Esc hoặc bấm ra ngoài. */
export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`${styles.dialog} ${styles[size]}`}>
        <header className={styles.header}>
          <h6 id={titleId}>{title}</h6>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
