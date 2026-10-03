import type { ReactNode } from 'react';
import type { Tone } from '@/types/common';
import styles from './Badge.module.css';

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
}

/** Nhãn trạng thái nền gradient, chữ in hoa nhỏ. */
export function Badge({ tone, children }: BadgeProps) {
  return <span className={`tone-${tone} ${styles.badge}`}>{children}</span>;
}
