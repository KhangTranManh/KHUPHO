import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLE_LABEL } from '@/features/auth/constants';
import { ApiError } from '@/services/api';
import styles from './ProfilePage.module.css';

/** Tuỳ chọn thông báo — hiện chỉ lưu trong state, chưa gửi lên backend. */
const NOTIFICATION_OPTIONS = [
  { key: 'newRecord', label: 'Có hồ sơ cư trú mới cần xử lý' },
  { key: 'expiring', label: 'Tạm trú sắp hết hạn' },
  { key: 'changes', label: 'Biến động nhân khẩu' },
  { key: 'system', label: 'Thông báo bảo trì hệ thống' },
] as const;

type NotificationKey = (typeof NOTIFICATION_OPTIONS)[number]['key'];

const dateTimeFmt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/** Hồ sơ của người đang đăng nhập — dùng cho cả 3 vai trò. */
export function ProfilePage() {
  const { user, logoutAll } = useAuth();
  const [notify, setNotify] = useState<Record<NotificationKey, boolean>>({
    newRecord: true,
    expiring: true,
    changes: false,
    system: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const info: [string, string | undefined][] = [
    ['Họ và tên', user.fullName],
    ['Vai trò', ROLE_LABEL[user.role]],
    ['Email', user.email],
    ['Điện thoại', user.phone],
  ];

  const onLogoutAll = async () => {
    setBusy(true);
    setError(null);
    try {
      await logoutAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thực hiện được, vui lòng thử lại');
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.cover} aria-hidden="true" />

      <div className={styles.header}>
        <Avatar name={user.fullName} size="xl" tone="primary" />
        <div>
          <h5>{user.fullName}</h5>
          <p className={styles.position}>{ROLE_LABEL[user.role]}</p>
        </div>
      </div>

      <div className={styles.grid}>
        <Card title="Thông tin tài khoản">
          <dl className={styles.info}>
            {info
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className={styles.infoRow}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </Card>

        <Card title="Cài đặt thông báo">
          <p className={styles.sectionLabel}>Nhận thông báo khi</p>
          <ul className={styles.switches}>
            {NOTIFICATION_OPTIONS.map((o) => (
              <li key={o.key}>
                <Switch
                  label={o.label}
                  checked={notify[o.key]}
                  onChange={(v) => setNotify((s) => ({ ...s, [o.key]: v }))}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Bảo mật">
          <p className={styles.bio}>
            Lần đăng nhập gần nhất:{' '}
            <strong>{user.lastLoginAt ? dateTimeFmt.format(new Date(user.lastLoginAt)) : '—'}</strong>
          </p>
          <hr className={styles.divider} />
          <p className={styles.bio}>
            Nghi ngờ tài khoản bị dùng ở nơi khác? Đăng xuất khỏi mọi thiết bị, kể cả thiết bị này.
          </p>
          {error && <p className={styles.error}>{error}</p>}
          <Button
            variant="outline"
            tone="danger"
            icon="logOut"
            className={styles.dangerButton}
            onClick={onLogoutAll}
            disabled={busy}
          >
            Đăng xuất mọi thiết bị
          </Button>
        </Card>
      </div>
    </div>
  );
}
