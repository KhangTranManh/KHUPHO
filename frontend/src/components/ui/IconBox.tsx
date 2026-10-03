import type { Tone } from '@/types/common';
import { Icon, type IconName } from './Icon';
import styles from './IconBox.module.css';

interface IconBoxProps {
  icon: IconName;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  /** `plain`: nền trắng, icon màu chữ — dùng cho mục sidebar chưa chọn. */
  variant?: 'gradient' | 'plain';
  className?: string;
}

const ICON_SIZE = { sm: 14, md: 18, lg: 22 } as const;

/** Ô vuông bo góc chứa icon — chi tiết đặc trưng của soft UI. */
export function IconBox({
  icon,
  tone = 'primary',
  size = 'md',
  variant = 'gradient',
  className = '',
}: IconBoxProps) {
  return (
    <span className={`tone-${tone} ${styles.box} ${styles[size]} ${styles[variant]} ${className}`}>
      <Icon name={icon} size={ICON_SIZE[size]} />
    </span>
  );
}
