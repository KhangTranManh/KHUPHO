import type { Tone } from '@/types/common';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  tone?: Tone;
  label?: string;
}

export function ProgressBar({ value, tone = 'primary', label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`tone-${tone} ${styles.wrap}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={styles.bar} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
