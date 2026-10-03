import { Icon } from './Icon';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/** Danh sách số trang cần hiện: luôn có trang đầu/cuối, quanh trang hiện tại, "…" ở khoảng trống. */
function pageList(page: number, last: number): (number | '…')[] {
  const pages = new Set([1, last, page - 1, page, page + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className={styles.bar} aria-label="Phân trang">
      <span className={styles.info}>
        Hiển thị {from}–{to} / {total}
      </span>
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.page}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Trang trước"
        >
          <Icon name="chevronLeft" size={14} />
        </button>
        {pageList(page, last).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className={styles.gap}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`${styles.page} ${p === page ? styles.active : ''}`}
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={styles.page}
          disabled={page >= last}
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
        >
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </nav>
  );
}
