import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IconBox } from '@/components/ui/IconBox';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { PoliceDashboard } from '@/features/dashboard/types';
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_TONE,
  REPORT_TYPE_ICON,
  REPORT_TYPE_LABEL,
  REPORT_TYPE_TONE,
} from '@/features/reports/constants';
import type { ReportStatus, ReportType } from '@/features/reports/types';
import { formatNumber } from '@/utils/format';
import styles from './ReportBreakdownCard.module.css';

const TYPES: ReportType[] = ['sos', 'an_ninh', 'mat_an_toan', 'hu_hong_dan_sinh'];
const STATUSES: ReportStatus[] = ['moi', 'dang_xu_ly', 'da_xong'];

interface Props {
  openByType: PoliceDashboard['openByType'];
  byStatus: PoliceDashboard['byStatus'];
}

/** Phản ánh chưa xong theo loại + tổng số phản ánh theo trạng thái. */
export function ReportBreakdownCard({ openByType, byStatus }: Props) {
  const totalOpen = TYPES.reduce((s, t) => s + openByType[t], 0);

  return (
    <Card title="Phản ánh theo loại" subtitle={`${formatNumber(totalOpen)} việc chưa xong`}>
      <ul className={styles.list}>
        {TYPES.map((t) => (
          <li key={t} className={styles.row}>
            <IconBox icon={REPORT_TYPE_ICON[t]} tone={REPORT_TYPE_TONE[t]} size="sm" />
            <div className={styles.body}>
              <div className={styles.top}>
                <span>{REPORT_TYPE_LABEL[t]}</span>
                <strong>{formatNumber(openByType[t])}</strong>
              </div>
              <ProgressBar value={totalOpen ? (openByType[t] / totalOpen) * 100 : 0} tone={REPORT_TYPE_TONE[t]} />
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.statuses}>
        {STATUSES.map((s) => (
          <span key={s}>
            <Badge tone={REPORT_STATUS_TONE[s]}>{REPORT_STATUS_LABEL[s]}</Badge> {formatNumber(byStatus[s])}
          </span>
        ))}
      </div>
    </Card>
  );
}
