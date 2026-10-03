import { BarChart } from '@/components/charts/BarChart';
import { Card } from '@/components/ui/Card';
import { IconBox } from '@/components/ui/IconBox';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CHANGE_TYPE_ICON, CHANGE_TYPE_LABEL, CHANGE_TYPE_TONE } from '@/features/changes/constants';
import type { DashboardSummary } from '@/features/dashboard/types';
import { formatNumber } from '@/utils/format';
import styles from './ChangesChartCard.module.css';

interface Props {
  monthly: DashboardSummary['monthlyChanges'];
  byType: DashboardSummary['changesByType'];
}

/** Biểu đồ cột số biến động theo tháng + tổng theo 4 loại chính. */
export function ChangesChartCard({ monthly, byType }: Props) {
  const types = Object.keys(byType) as (keyof typeof byType)[];
  const totalByType = types.reduce((sum, t) => sum + byType[t], 0);
  const thisMonth = monthly.at(-1)?.value ?? 0;
  const lastMonth = monthly.at(-2)?.value ?? 0;

  return (
    <Card>
      <div className={styles.chartBox}>
        <BarChart data={monthly} />
      </div>

      <h6 className={styles.title}>Biến động dân cư</h6>
      <p className={styles.subtitle}>
        Tháng này <strong>{formatNumber(thisMonth)}</strong> lượt (tháng trước{' '}
        {formatNumber(lastMonth)})
      </p>

      <div className={styles.items}>
        {types.map((t) => (
          <div key={t} className={styles.item}>
            <div className={styles.itemHead}>
              <IconBox icon={CHANGE_TYPE_ICON[t]} tone={CHANGE_TYPE_TONE[t]} size="sm" />
              <span className={styles.itemLabel}>{CHANGE_TYPE_LABEL[t]}</span>
            </div>
            <h5 className={styles.itemValue}>{formatNumber(byType[t])}</h5>
            <ProgressBar
              value={totalByType ? (byType[t] / totalByType) * 100 : 0}
              tone={CHANGE_TYPE_TONE[t]}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
