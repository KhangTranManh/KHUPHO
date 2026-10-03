import { appConfig } from '@/config/app';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>
        © {new Date().getFullYear()} {appConfig.name} — {appConfig.subtitle}
      </span>
      <span className={styles.version}>Phiên bản 0.1.0</span>
    </footer>
  );
}
