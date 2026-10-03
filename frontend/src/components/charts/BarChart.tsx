import { formatNumber } from '@/utils/format';
import { niceScale } from './scale';
import styles from './BarChart.module.css';

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
}

/**
 * Biểu đồ cột mảnh màu trắng — đặt bên trong khối nền gradient tối.
 * Vẽ bằng HTML nên co giãn theo khung mà chữ không bị méo.
 */
export function BarChart({ data, height = 170 }: BarChartProps) {
  const { max, ticks } = niceScale(0, Math.max(...data.map((d) => d.value), 1));

  return (
    <div className={styles.chart}>
      <div className={styles.plot} style={{ height }}>
        <div className={styles.grid}>
          {ticks.map((t) => (
            <div key={t} className={styles.gridLine}>
              <span className={styles.tick}>{formatNumber(t)}</span>
            </div>
          ))}
        </div>
        <div className={styles.bars}>
          {data.map((d) => (
            <div key={d.label} className={styles.col} title={`${d.label}: ${formatNumber(d.value)}`}>
              <div className={styles.bar} style={{ height: `${(d.value / max) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.labels}>
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
