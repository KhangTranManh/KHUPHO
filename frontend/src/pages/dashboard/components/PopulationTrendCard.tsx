import { LineChart } from '@/components/charts/LineChart';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { DashboardSummary } from '@/features/dashboard/types';
import { formatNumber } from '@/utils/format';
import styles from './PopulationTrendCard.module.css';

/** Số nhân khẩu thường trú / tạm trú 12 tháng gần nhất. */
export function PopulationTrendCard({ trend }: { trend: DashboardSummary['populationTrend'] }) {
  const total = (i: number) => trend.permanent[i] + trend.temporary[i];
  const growth = total(trend.labels.length - 1) - total(0);

  return (
    <Card
      title="Xu hướng dân số"
      subtitle={
        <span className={growth >= 0 ? styles.up : styles.down}>
          <Icon name={growth >= 0 ? 'arrowUp' : 'arrowDown'} size={14} />
          <strong>
            {growth >= 0 ? '+' : ''}
            {formatNumber(growth)} người
          </strong>
          <span className={styles.muted}> trong 12 tháng</span>
        </span>
      }
    >
      <LineChart
        labels={trend.labels}
        series={[
          { name: 'Thường trú', values: trend.permanent, tone: 'primary' },
          { name: 'Tạm trú', values: trend.temporary, tone: 'dark' },
        ]}
      />
    </Card>
  );
}
