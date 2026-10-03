import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/config/navigation';
import { CHANGE_TYPE_ICON, CHANGE_TYPE_LABEL, CHANGE_TYPE_TONE } from '@/features/changes/constants';
import type { ResidentChange } from '@/features/changes/types';
import { formatDate } from '@/utils/format';
import styles from './RecentChangesCard.module.css';

/** Dòng thời gian các biến động mới nhất. */
export function RecentChangesCard({ changes }: { changes: ResidentChange[] }) {
  return (
    <Card
      title="Biến động gần đây"
      subtitle={
        <Link to={ROUTES.changes} className={styles.all}>
          Xem tất cả <Icon name="arrowRight" size={12} />
        </Link>
      }
    >
      <ol className={styles.timeline}>
        {changes.map((c) => (
          <li key={c.id} className={styles.item}>
            <span className={`tone-${CHANGE_TYPE_TONE[c.type]} ${styles.icon}`}>
              <Icon name={CHANGE_TYPE_ICON[c.type]} size={16} />
            </span>
            <div>
              <h6 className={styles.title}>
                {CHANGE_TYPE_LABEL[c.type]} — {c.residentName}
              </h6>
              <p className={styles.meta}>
                {formatDate(c.date)} · {c.householdCode}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
