import { useEffect, useId, useRef, type ReactNode } from 'react';
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
  size?: 'md' | 'lg' | 'xl';
}

/** Các hộp thoại đang mở (theo thứ tự) — Esc chỉ đóng hộp thoại trên cùng khi mở chồng nhau. */
const openStack: string[] = [];

/** Hộp thoại nổi. Đóng bằng nút ×, phím Esc hoặc bấm ra ngoài. Mở chồng được (Esc đóng cái trên cùng). */
export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  // Giữ onClose mới nhất mà không chạy lại effect (cha render lại không làm đảo thứ tự hộp thoại).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    openStack.push(titleId);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openStack.at(-1) === titleId && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(titleId), 1);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, titleId]);

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
