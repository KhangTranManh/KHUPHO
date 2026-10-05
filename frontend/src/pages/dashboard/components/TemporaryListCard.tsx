import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/config/navigation';
import type { TemporaryResidentItem } from '@/features/dashboard/types';
import { RESIDENCE_STATUS_LABEL, RESIDENCE_STATUS_TONE } from '@/features/residents/constants';
import { formatDate } from '@/utils/format';
import styles from './TemporaryListCard.module.css';

/** Tạm trú / tạm vắng mới nhất — danh sách theo dõi của công an khu vực. */
export function TemporaryListCard({ items }: { items: TemporaryResidentItem[] }) {
  return (
    <Card
      title="Tạm trú / tạm vắng gần đây"
      action={
        <Link to={`${ROUTES.residents}`} className={styles.all}>
          Nhân khẩu <Icon name="arrowRight" size={12} />
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className={styles.empty}>Không có ai đang tạm trú / tạm vắng.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((t) => (
            <li key={t.residentId} className={styles.item}>
              <div className={styles.body}>
                <h6>{t.fullName}</h6>
                <p>
                  {t.householdCode} · {t.areaName}
                  {t.note && ` · ${t.note}`}
                </p>
              </div>
              <div className={styles.side}>
                <Badge tone={RESIDENCE_STATUS_TONE[t.residenceStatus]}>{RESIDENCE_STATUS_LABEL[t.residenceStatus]}</Badge>
                <small>
                  {t.residenceFrom && formatDate(t.residenceFrom)}
                  {t.residenceTo && ` – ${formatDate(t.residenceTo)}`}
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
