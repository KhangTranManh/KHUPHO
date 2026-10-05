import type { ReactNode } from 'react';
import { appConfig } from '@/config/app';
import styles from './SignInPage.module.css';

/** Khung chung cho các trang xác thực (đăng nhập, đổi mật khẩu): form bên trái, ảnh thương hiệu bên phải. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.formSide}>
        <div className={styles.brand}>
          <img src="/favicon.svg" alt="" className={styles.logo} />
          <span>{appConfig.name}</span>
        </div>
        <div className={styles.formWrap}>{children}</div>
      </div>

      <div className={styles.artSide} aria-hidden="true">
        <div className={styles.art}>
          <img src="/favicon.svg" alt="" className={styles.artLogo} />
          <h4 className={styles.artTitle}>{appConfig.name}</h4>
          <p className={styles.artText}>{appConfig.subtitle}</p>
        </div>
      </div>
    </div>
  );
}
