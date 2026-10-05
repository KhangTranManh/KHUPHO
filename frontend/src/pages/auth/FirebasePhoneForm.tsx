import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { confirmOtp, resetOtp, sendOtp } from '@/features/auth/firebasePhone';
import { ApiError } from '@/services/api';
import styles from './SignInPage.module.css';

/** Ô chứa reCAPTCHA ẩn — luôn được render, không phụ thuộc bước hiện tại. */
const RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha';

/**
 * Đăng nhập lần đầu / quên mật khẩu bằng OTP SMS của Firebase (VITE_PHONE_AUTH=firebase):
 * nhập SĐT → nhận mã 6 số → xác minh → backend cấp phiên → trang đặt mật khẩu mới.
 */
export function FirebasePhoneForm({ onBack }: { onBack: () => void }) {
  const { loginWithFirebase } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Rời form → gỡ reCAPTCHA (tránh hộp thoại hết giờ chờ bật lên ở trang khác).
  useEffect(() => resetOtp, []);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error || err instanceof ApiError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await sendOtp(phone, RECAPTCHA_CONTAINER_ID);
      setStep('otp');
    });
  };

  const onVerify = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const idToken = await confirmOtp(code);
      await loginWithFirebase(idToken);
      navigate(ROUTES.changePassword, { replace: true });
    });
  };

  return (
    <>
      <h3 className={`tone-primary text-gradient ${styles.title}`}>Đăng nhập lần đầu</h3>
      <p className={styles.lead}>
        {step === 'phone'
          ? 'Nhập số điện thoại đã đăng ký với khu phố. Hệ thống gửi mã xác minh 6 số qua SMS. Quên mật khẩu cũng làm như vậy.'
          : `Đã gửi mã xác minh tới ${phone}. Nhập mã để tiếp tục đặt mật khẩu mới.`}
      </p>

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <Icon name="minusCircle" size={16} />
          <span>{error}</span>
        </div>
      )}

      {step === 'phone' ? (
        <form className={styles.form} onSubmit={onSend}>
          <TextField
            label="Số điện thoại"
            icon="phone"
            type="tel"
            inputMode="tel"
            placeholder="VD: 0901234567"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" fullWidth icon="send" className={styles.submit} disabled={busy}>
            {busy ? 'Đang gửi…' : 'Gửi mã xác minh'}
          </Button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={onVerify}>
          <TextField
            label="Mã xác minh (6 số)"
            icon="lock"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />
          <Button type="submit" fullWidth className={styles.submit} disabled={busy || code.length !== 6}>
            {busy ? 'Đang xác minh…' : 'Xác minh'}
          </Button>
          <button type="button" className={styles.linkButton} onClick={() => setStep('phone')}>
            Đổi số / gửi lại mã
          </button>
        </form>
      )}

      <p className={styles.help}>
        <button type="button" className={styles.linkButton} onClick={onBack}>
          ← Quay lại đăng nhập
        </button>
      </p>
      <div id={RECAPTCHA_CONTAINER_ID} />
    </>
  );
}
