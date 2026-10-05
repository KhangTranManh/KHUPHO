import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconBox } from '@/components/ui/IconBox';
import { ROUTES } from '@/config/navigation';
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_TONE,
  REPORT_TYPE_ICON,
  REPORT_TYPE_TONE,
} from '@/features/reports/constants';
import type { Report } from '@/features/reports/types';
import { formatDateTime } from '@/utils/format';
import styles from './AttentionCard.module.css';

interface Props {
  sos: Report[];
  sosCount: number;
  reports: Report[];
  reportCount: number;
}

/** Việc cán bộ cần xử lý ngay: SOS chưa xong (đỏ, lên đầu) và phản ánh chưa xong. */
export function AttentionCard({ sos, sosCount, reports, reportCount }: Props) {
  const empty = sos.length === 0 && reports.length === 0;

  const row = (rp: Report, urgent: boolean) => (
    <li key={rp.id} className={`${styles.item} ${urgent ? styles.sos : ''}`}>
      <IconBox icon={REPORT_TYPE_ICON[rp.type]} tone={REPORT_TYPE_TONE[rp.type]} size="sm" />
      <div className={styles.body}>
        <h6 className={styles.name}>{urgent ? `SOS – ${rp.reporter.name}` : rp.title}</h6>
        <p className={styles.meta}>
          {urgent ? (rp.description ?? 'Báo động khẩn cấp') : rp.code} · {rp.location?.address ?? '—'} ·{' '}
          {formatDateTime(rp.createdAt)}
        </p>
      </div>
      <Badge tone={REPORT_STATUS_TONE[rp.status]}>{REPORT_STATUS_LABEL[rp.status]}</Badge>
    </li>
  );

  return (
    <Card title="Cần xử lý" subtitle={`${sosCount} SOS · ${reportCount} phản ánh chưa xong`}>
      {empty ? (
        <p className={styles.empty}>
          <Icon name="checkCircle" size={16} /> Không có việc nào đang chờ.
        </p>
      ) : (
        <ul className={styles.list}>
          {sos.map((a) => row(a, true))}
          {reports.map((rp) => row(rp, false))}
        </ul>
      )}
      <div className={styles.links}>
        <Link to={ROUTES.sos}>
          Báo động SOS <Icon name="arrowRight" size={12} />
        </Link>
        <Link to={ROUTES.security}>
          Phản ánh <Icon name="arrowRight" size={12} />
        </Link>
      </div>
    </Card>
  );
}
