import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Tone } from '@/types/common';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gradient' | 'outline' | 'white' | 'link';
  tone?: Tone;
  size?: 'sm' | 'md';
  icon?: IconName;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'gradient',
  tone = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const cls = [
    `tone-${tone}`,
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth ? styles.full : '',
    className,
  ].join(' ');

  return (
    <button type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
