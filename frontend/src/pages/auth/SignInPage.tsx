import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { appConfig } from '@/config/app';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { requestTempPassword } from '@/features/auth/authService';
import { ROLE_LABEL, homeFor } from '@/features/auth/constants';
import { useAsync } from '@/hooks/useAsync';
import type { SignInLocationState } from '@/features/auth/RequireAuth';
import type { TempPasswordResult } from '@/features/auth/types';
import { ApiError } from '@/services/api';
import { AuthLayout } from './AuthLayout';
import { FirebasePhoneForm } from './FirebasePhoneForm';
import styles from './SignInPage.module.css';

/**
 * Đăng nhập chung cho mọi vai trò bằng SĐT hoặc email.
 * Lần đầu / quên mật khẩu → trang đặt mật khẩu mới, xác minh SĐT bằng một trong hai cách (VITE_PHONE_AUTH):
 *   firebase      — OTP SMS qua Firebase (FirebasePhoneForm);
 *   temp_password — mật khẩu tạm do backend gửi (SMS mock), đăng nhập bằng mật khẩu tạm.
 */
export function SignInPage() {
  const { state, user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as SignInLocationState | null)?.from;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // "temp" = form xin mật khẩu tạm qua SMS (đăng nhập lần đầu / quên mật khẩu).
  const [mode, setMode] = useState<'login' | 'temp'>('login');
  const [tempResult, setTempResult] = useState<TempPasswordResult | null>(null);
  // Chỉ tải danh sách tài khoản demo khi bật VITE_AUTH_MODE=demo (không lọt vào bundle ở chế độ thật).
  const demoAccounts = useAsync(
    () =>
      appConfig.demoAuth
        ? import('@/mocks/demoAuth').then((m) => m.DEMO_ACCOUNTS)
        : Promise.resolve([]),
    [],
  );

  // Đã đăng nhập (VD: mở lại trang này) → vào thẳng.
  if (user) return <Navigate to={user.mustChangePassword ? ROUTES.changePassword : (from ?? homeFor(user.role))} replace />;

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
      navigate(me.mustChangePassword ? ROUTES.changePassword : (from ?? homeFor(me.role)), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập không thành công, vui lòng thử lại');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestTemp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setTempResult(await requestTempPassword(identifier));
      setPassword('');
      setMode('login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: 'login' | 'temp') => {
    setMode(next);
    setError(null);
    setTempResult(null);
  };

  if (mode === 'temp' && appConfig.phoneAuth === 'firebase') {
    return (
      <AuthLayout>
        <FirebasePhoneForm onBack={() => switchMode('login')} />
      </AuthLayout>
    );
  }

  if (mode === 'temp') {
    return (
      <AuthLayout>
        <h3 className={`tone-primary text-gradient ${styles.title}`}>Đăng nhập lần đầu</h3>
        <p className={styles.lead}>
          Nhập số điện thoại đã đăng ký với khu phố. Hệ thống gửi <strong>mật khẩu tạm</strong> qua SMS; đăng nhập
          bằng mật khẩu đó rồi đặt mật khẩu mới. Quên mật khẩu cũng làm như vậy.
        </p>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            <Icon name="minusCircle" size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={onRequestTemp}>
          <TextField
            label="Số điện thoại"
            icon="phone"
            type="tel"
            inputMode="tel"
            placeholder="VD: 0901234567"
            autoComplete="tel"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" fullWidth icon="send" className={styles.submit} disabled={submitting}>
            {submitting ? 'Đang gửi…' : 'Gửi mật khẩu tạm'}
          </Button>
        </form>

        <p className={styles.help}>
          <button type="button" className={styles.linkButton} onClick={() => switchMode('login')}>
            ← Quay lại đăng nhập
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h3 className={`tone-primary text-gradient ${styles.title}`}>Chào mừng trở lại</h3>
      <p className={styles.lead}>Đăng nhập bằng số điện thoại hoặc email đã đăng ký với khu phố.</p>

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

      {tempResult && !error && (
        <div className={styles.alert} role="status">
          <Icon name="send" size={16} />
          <span>
            {tempResult.message} Mật khẩu tạm dùng một lần, hết hạn sau ít phút.
            {tempResult.devTempPassword && (
              <>
                {' '}
                <strong>(Thử nghiệm — chưa gửi SMS thật) Mật khẩu tạm: </strong>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setPassword(tempResult.devTempPassword!)}
                  title="Điền vào ô mật khẩu"
                >
                  <code>{tempResult.devTempPassword}</code>
                </button>
              </>
            )}
          </span>
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
          label={tempResult ? 'Mật khẩu tạm (trong SMS)' : 'Mật khẩu'}
          icon="lock"
          type="password"
          placeholder="••••••••"
          autoComplete={tempResult ? 'one-time-code' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" fullWidth className={styles.submit} disabled={submitting}>
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>

      <p className={styles.help}>
        Lần đầu đăng nhập hoặc quên mật khẩu?{' '}
        <button type="button" className={styles.linkButton} onClick={() => switchMode('temp')}>
          {appConfig.phoneAuth === 'firebase' ? 'Xác minh qua SMS' : 'Nhận mật khẩu tạm qua SMS'}
        </button>
      </p>
    </AuthLayout>
  );
}
