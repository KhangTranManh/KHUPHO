import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { IconBox } from '@/components/ui/IconBox';
import { PageState } from '@/components/ui/PageState';
import { Switch } from '@/components/ui/Switch';
import { getCurrentOfficer } from '@/features/account/accountService';
import { getGroups } from '@/features/households/householdService';
import { useAsync } from '@/hooks/useAsync';
import styles from './ProfilePage.module.css';

/** Tuỳ chọn thông báo — hiện chỉ lưu trong state, chưa gửi lên backend. */
const NOTIFICATION_OPTIONS = [
  { key: 'newRecord', label: 'Có hồ sơ cư trú mới cần xử lý' },
  { key: 'expiring', label: 'Tạm trú sắp hết hạn trong tổ phụ trách' },
  { key: 'changes', label: 'Biến động nhân khẩu trong tổ phụ trách' },
  { key: 'weekly', label: 'Báo cáo tổng hợp hằng tuần' },
  { key: 'system', label: 'Thông báo bảo trì hệ thống' },
] as const;

type NotificationKey = (typeof NOTIFICATION_OPTIONS)[number]['key'];

export function ProfilePage() {
  const officer = useAsync(getCurrentOfficer, []);
  const groups = useAsync(getGroups, []);
  const [notify, setNotify] = useState<Record<NotificationKey, boolean>>({
    newRecord: true,
    expiring: true,
    changes: false,
    weekly: true,
    system: false,
  });

  if (!officer.data) return <PageState error={officer.error} />;
  const me = officer.data;
  const myGroups = (groups.data ?? []).filter((g) => me.groupIds.includes(g.id));

  return (
    <div className={styles.page}>
      <div className={styles.cover} aria-hidden="true" />

      <div className={styles.header}>
        <Avatar name={me.fullName} size="xl" tone="primary" />
        <div>
          <h5>{me.fullName}</h5>
          <p className={styles.position}>{me.position}</p>
        </div>
      </div>

      <div className={styles.grid}>
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

        <Card title="Thông tin cán bộ">
          <p className={styles.bio}>{me.bio}</p>
          <hr className={styles.divider} />
          <dl className={styles.info}>
            <dt>Họ và tên</dt>
            <dd>{me.fullName}</dd>
            <dt>Đơn vị</dt>
            <dd>{me.unit}</dd>
            <dt>Điện thoại</dt>
            <dd>{me.phone}</dd>
            <dt>Email</dt>
            <dd>{me.email}</dd>
          </dl>
        </Card>

        <Card title="Tổ dân phố phụ trách">
          {!groups.data ? (
            <PageState error={groups.error} />
          ) : (
            <ul className={styles.groups}>
              {myGroups.map((g) => (
                <li key={g.id}>
                  <IconBox icon="mapPin" size="sm" tone="dark" />
                  <div>
                    <h6 className={styles.groupName}>{g.name}</h6>
                    <p className={styles.groupLeader}>Tổ trưởng: {g.leaderName}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
