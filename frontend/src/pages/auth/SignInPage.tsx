import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { TextField } from '@/components/ui/TextField';
import { appConfig } from '@/config/app';
import { ROUTES } from '@/config/navigation';
import styles from './SignInPage.module.css';

/**
 * Màn hình đăng nhập. CHƯA có xác thực thật: bấm đăng nhập chỉ chuyển vào trang tổng quan.
 * Khi có backend: gọi API đăng nhập, lưu phiên, và chặn route trong router.tsx.
 */
export function SignInPage() {
  const navigate = useNavigate();
  const [remember, setRemember] = useState(true);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate(ROUTES.dashboard);
  };

  return (
    <div className={styles.page}>
      <div className={styles.formSide}>
        <div className={styles.brand}>
          <img src="/favicon.svg" alt="" className={styles.logo} />
          <span>{appConfig.name}</span>
        </div>

        <div className={styles.formWrap}>
          <h3 className={`tone-primary text-gradient ${styles.title}`}>Chào mừng trở lại</h3>
          <p className={styles.lead}>Đăng nhập bằng tài khoản cán bộ được cấp.</p>

          <form className={styles.form} onSubmit={onSubmit}>
            <TextField label="Tên đăng nhập" icon="user" placeholder="vd: canbo.to1" autoComplete="username" required />
            <TextField
              label="Mật khẩu"
              icon="lock"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <Switch label="Ghi nhớ đăng nhập" checked={remember} onChange={setRemember} />
            <Button type="submit" fullWidth className={styles.submit}>
              Đăng nhập
            </Button>
          </form>

          <p className={styles.help}>Quên mật khẩu? Liên hệ quản trị viên hệ thống của phường.</p>
        </div>
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
