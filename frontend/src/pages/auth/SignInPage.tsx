import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { appConfig } from '@/config/app';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLE_LABEL, homeFor } from '@/features/auth/constants';
import { useAsync } from '@/hooks/useAsync';
import type { SignInLocationState } from '@/features/auth/RequireAuth';
import { ApiError } from '@/services/api';
import styles from './SignInPage.module.css';

/** Đăng nhập chung cho mọi vai trò bằng SĐT hoặc email. */
export function SignInPage() {
  const { state, user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as SignInLocationState | null)?.from;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Chỉ tải danh sách tài khoản demo khi bật VITE_AUTH_MODE=demo (không lọt vào bundle ở chế độ thật).
  const demoAccounts = useAsync(
    () =>
      appConfig.demoAuth
        ? import('@/mocks/demoAuth').then((m) => m.DEMO_ACCOUNTS)
        : Promise.resolve([]),
    [],
  );

  // Đã đăng nhập (VD: mở lại trang này) → vào thẳng.
  if (user) return <Navigate to={from ?? homeFor(user.role)} replace />;

  const notice =
    state.status === 'anonymous' && state.reason === 'expired'
      ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
      : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(identifier, password);
      navigate(from ?? homeFor(me.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập không thành công, vui lòng thử lại');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
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
          <p className={styles.lead}>
            Đăng nhập bằng số điện thoại hoặc email đã đăng ký với khu phố.
          </p>

          {demoAccounts.data && demoAccounts.data.length > 0 && (
            <div className={styles.demo}>
              <p className={styles.demoTitle}>Chế độ demo — chọn tài khoản để điền sẵn:</p>
              <div className={styles.demoList}>
                {demoAccounts.data.map((a) => (
                  <button
                    key={a.login}
                    type="button"
                    className={styles.demoItem}
                    onClick={() => {
                      setIdentifier(a.login);
                      setPassword(a.password);
                      setError(null);
                    }}
                  >
                    <strong>{ROLE_LABEL[a.role]}</strong>
                    <span>
                      {a.login} / {a.password}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(error ?? notice) && (
            <div className={`${styles.alert} ${error ? styles.alertError : ''}`} role="alert">
              <Icon name={error ? 'minusCircle' : 'helpCircle'} size={16} />
              <span>{error ?? notice}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={onSubmit}>
            <TextField
              label="Số điện thoại hoặc email"
              icon="user"
              placeholder="VD: 0901234567 hoặc ten@email.com"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
            />
            <TextField
              label="Mật khẩu"
              icon="lock"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth className={styles.submit} disabled={submitting}>
              {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
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
