import { Card } from '@/components/ui/Card';
import type { AgeGenderBucket } from '@/features/dashboard/types';
import { formatNumber } from '@/utils/format';
import styles from './AgeGenderCard.module.css';

/** Tháp dân số: nam bên trái, nữ bên phải, mỗi hàng một nhóm tuổi. */
export function AgeGenderCard({ buckets }: { buckets: AgeGenderBucket[] }) {
  const max = Math.max(1, ...buckets.flatMap((b) => [b.nam, b.nu]));
  const totalNam = buckets.reduce((s, b) => s + b.nam, 0);
  const totalNu = buckets.reduce((s, b) => s + b.nu, 0);
  /** Độ dài thanh: chừa chỗ cho con số bên cạnh. */
  const width = (n: number) => `calc(${n / max} * (100% - 2.5rem))`;

  return (
    <Card title="Độ tuổi & giới tính" subtitle={`Nam ${formatNumber(totalNam)} · Nữ ${formatNumber(totalNu)}`}>
      <div className={styles.legend}>
        <span className="tone-primary">
          <i className={styles.dot} /> Nam
        </span>
        <span className="tone-danger">
          <i className={styles.dot} /> Nữ
        </span>
      </div>

      <ul className={styles.rows}>
        {buckets.map((b) => (
          <li key={b.label} className={styles.row}>
            <span className={`${styles.side} ${styles.left}`}>
              <span className={styles.value}>{formatNumber(b.nam)}</span>
              <span className={`tone-primary ${styles.bar}`} style={{ width: width(b.nam) }} />
            </span>
            <span className={styles.label}>{b.label}</span>
            <span className={styles.side}>
              <span className={`tone-danger ${styles.bar}`} style={{ width: width(b.nu) }} />
              <span className={styles.value}>{formatNumber(b.nu)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
