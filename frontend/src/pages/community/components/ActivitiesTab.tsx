import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconBox } from '@/components/ui/IconBox';
import { PageState } from '@/components/ui/PageState';
import { getActivities } from '@/features/community/communityService';
import { ACTIVITY_KIND_ICON, ACTIVITY_KIND_LABEL, ACTIVITY_KIND_TONE } from '@/features/community/constants';
import type { Activity } from '@/features/community/types';
import { useAsync } from '@/hooks/useAsync';
import { toISODate } from '@/utils/date';
import styles from './Community.module.css';

function ActivityRow({ a }: { a: Activity }) {
  const [, month, day] = a.date.split('-');
  return (
    <li className={styles.activity}>
      <div className={styles.dateBox}>
        <strong>{day}</strong>
        <span>Th {Number(month)}</span>
      </div>
      <IconBox icon={ACTIVITY_KIND_ICON[a.kind]} tone={ACTIVITY_KIND_TONE[a.kind]} size="sm" />
      <div className={styles.activityBody}>
        <h6>{a.title}</h6>
        <p>
          <Icon name="calendar" size={12} /> {a.startTime}
          {a.endTime && ` – ${a.endTime}`} · <Icon name="mapPin" size={12} /> {a.location}
        </p>
        <small>
          {ACTIVITY_KIND_LABEL[a.kind]}
          {a.organizer && ` · ${a.organizer}`}
        </small>
      </div>
    </li>
  );
}

/** Lịch sinh hoạt khu phố: sắp diễn ra trước, đã diễn ra sau. */
export function ActivitiesTab() {
  const { data, error } = useAsync(getActivities, []);
  if (!data) return <PageState error={error} />;

  const today = toISODate(new Date());
  const upcoming = data.filter((a) => a.date >= today);
  const past = data.filter((a) => a.date < today).reverse();

  return (
    <div className={styles.stack}>
      <Card title="Sắp diễn ra" subtitle={`${upcoming.length} hoạt động`}>
        {upcoming.length === 0 ? (
          <p className={styles.desc}>Chưa có lịch mới.</p>
        ) : (
          <ul className={styles.activities}>
            {upcoming.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </ul>
        )}
      </Card>
      {past.length > 0 && (
        <Card title="Đã diễn ra">
          <ul className={`${styles.activities} ${styles.past}`}>
            {past.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
