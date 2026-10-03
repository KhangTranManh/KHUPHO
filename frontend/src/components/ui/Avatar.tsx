import type { Tone } from '@/types/common';
import { initials } from '@/utils/format';
import styles from './Avatar.module.css';

const TONES: Tone[] = ['primary', 'info', 'success', 'warning', 'danger', 'dark'];

/** Chọn tông màu cố định theo tên để cùng một người luôn cùng màu. */
function toneFor(name: string): Tone {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'xl';
  tone?: Tone;
}

/** Ảnh đại diện dạng chữ cái đầu trên nền gradient. */
export function Avatar({ name, size = 'sm', tone }: AvatarProps) {
  return (
    <span className={`tone-${tone ?? toneFor(name)} ${styles.avatar} ${styles[size]}`} title={name}>
      {initials(name)}
    </span>
  );
}

export function AvatarGroup({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className={styles.group}>
      {shown.map((n) => (
        <Avatar key={n} name={n} size="xs" />
      ))}
      {rest > 0 && <span className={`${styles.avatar} ${styles.xs} ${styles.more}`}>+{rest}</span>}
    </span>
  );
}
