import type { Tone } from '@/types/common';
import { formatNumber } from '@/utils/format';
import type { IconName } from './Icon';
import { IconBox } from './IconBox';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: number;
  icon: IconName;
  tone?: Tone;
  /** Phần trăm thay đổi so với kỳ trước; dương = xanh, âm = đỏ. */
  delta?: number;
}

/** Thẻ số liệu nhỏ: tiêu đề + số lớn + % thay đổi, icon gradient bên phải. */
export function StatCard({ label, value, icon, tone = 'primary', delta }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <h5 className={styles.value}>
          {formatNumber(value)}
          {delta !== undefined && (
            <span className={delta >= 0 ? styles.up : styles.down}>
              {delta >= 0 ? '+' : ''}
              {delta}%
            </span>
          )}
        </h5>
      </div>
      <IconBox icon={icon} tone={tone} />
    </div>
  );
}
