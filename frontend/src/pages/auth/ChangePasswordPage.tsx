import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageState } from '@/components/ui/PageState';
import { TextField } from '@/components/ui/TextField';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { homeFor } from '@/features/auth/constants';
import { ApiError } from '@/services/api';
import { AuthLayout } from './AuthLayout';
import styles from './SignInPage.module.css';

/** Khớp chính sách mật khẩu của backend (user.schemas.ts → passwordSchema). */
function checkPolicy(pw: string): string | null {
  if (pw.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  if (pw.length > 72) return 'Mật khẩu tối đa 72 ký tự';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Mật khẩu phải có cả chữ và số';
  return null;
}

/**
 * Đổi mật khẩu — hai trường hợp:
 *  - Bắt buộc: vừa đăng nhập bằng mật khẩu tạm (user.mustChangePassword), không cần mật khẩu hiện tại,
 *    mọi trang khác bị chặn cho tới khi đổi xong.
 *  - Tự nguyện: mở từ trang Hồ sơ, phải nhập mật khẩu hiện tại.
 */
export function ChangePasswordPage() {
  const { state, user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.status === 'loading') return <PageState />;
  if (!user) return <Navigate to={ROUTES.signIn} replace />;

  const forced = !!user.mustChangePassword;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = checkPolicy(next) ?? (next !== confirm ? 'Mật khẩu nhập lại không khớp' : null);
    if (problem) return setError(problem);

    setError(null);
    setSubmitting(true);
    try {
      const me = await changePassword(next, forced ? undefined : current);
      navigate(homeFor(me.role), { replace: true, state: { passwordChanged: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đổi được mật khẩu, vui lòng thử lại');
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h3 className={`tone-primary text-gradient ${styles.title}`}>{forced ? 'Đặt mật khẩu mới' : 'Đổi mật khẩu'}</h3>
      <p className={styles.lead}>
        {forced
          ? `Xin chào ${user.fullName}. Bạn vừa đăng nhập bằng mật khẩu tạm — hãy đặt mật khẩu mới để tiếp tục.`
          : 'Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất.'}
      </p>

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <Icon name="minusCircle" size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className={styles.form} onSubmit={onSubmit}>
        {/* Ô tên đăng nhập ẩn giúp trình quản lý mật khẩu lưu đúng tài khoản. */}
        <input type="text" autoComplete="username" value={user.phone ?? user.email ?? ''} readOnly hidden />
        {!forced && (
          <TextField
            label="Mật khẩu hiện tại"
            icon="lock"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoFocus
          />
        )}
        <TextField
          label="Mật khẩu mới"
          icon="lock"
          type="password"
          placeholder="Ít nhất 8 ký tự, có chữ và số"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          autoFocus={forced}
        />
        <TextField
          label="Nhập lại mật khẩu mới"
          icon="lock"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <Button type="submit" fullWidth className={styles.submit} disabled={submitting}>
          {submitting ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
        </Button>
      </form>

      <p className={styles.help}>
        {forced ? (
          <button type="button" className={styles.linkButton} onClick={() => logout()}>
            Đăng xuất
          </button>
        ) : (
          <Link to={ROUTES.profile} className={styles.linkButton}>
            ← Quay lại hồ sơ
          </Link>
        )}
      </p>
    </AuthLayout>
  );
}
