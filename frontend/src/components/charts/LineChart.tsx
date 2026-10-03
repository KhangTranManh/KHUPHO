import { useId } from 'react';
import type { Tone } from '@/types/common';
import { formatNumber } from '@/utils/format';
import { niceScale } from './scale';
import styles from './LineChart.module.css';

export interface LineSeries {
  name: string;
  values: number[];
  tone: Tone;
}

interface LineChartProps {
  labels: string[];
  series: LineSeries[];
  height?: number;
}

/** Đường cong mượt (Catmull-Rom → Bézier) trong hệ toạ độ 0..100. */
function smoothPath(points: [number, number][]) {
  if (points.length < 2) return '';
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i - 1] ?? points[i];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[i + 2] ?? points[i + 1];
    const t = 6;
    d += ` C${x1 + (x2 - x0) / t},${y1 + (y2 - y0) / t} ${x2 - (x3 - x1) / t},${y2 - (y3 - y1) / t} ${x2},${y2}`;
  }
  return d;
}

/** Biểu đồ đường có vùng tô gradient mờ bên dưới — kiểu "overview" của soft UI. */
export function LineChart({ labels, series, height = 260 }: LineChartProps) {
  const gradientId = useId();
  const all = series.flatMap((s) => s.values);
  const { min, max, ticks } = niceScale(Math.min(...all), Math.max(...all));

  const toPoints = (values: number[]): [number, number][] =>
    values.map((v, i) => [
      (i / Math.max(values.length - 1, 1)) * 100,
      (1 - (v - min) / (max - min)) * 100,
    ]);

  return (
    <div className={styles.chart}>
      <div className={styles.legend}>
        {series.map((s) => (
          <span key={s.name} className={`tone-${s.tone} ${styles.legendItem}`}>
            <i className={styles.dot} />
            {s.name}
          </span>
        ))}
      </div>

      <div className={styles.plot} style={{ height }}>
        <div className={styles.grid}>
          {ticks.map((t) => (
            <div key={t} className={styles.gridLine}>
              <span className={styles.tick}>{formatNumber(t)}</span>
            </div>
          ))}
        </div>

        <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {series.map((s, idx) => {
            const pts = toPoints(s.values);
            const line = smoothPath(pts);
            const id = `${gradientId}-${idx}`;
            return (
              <g key={s.name} className={`tone-${s.tone}`}>
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: 'var(--tone-solid)', stopOpacity: 0.25 }} />
                    <stop offset="100%" style={{ stopColor: 'var(--tone-solid)', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path d={`${line} L100,100 L0,100 Z`} fill={`url(#${id})`} />
                <path
                  d={line}
                  fill="none"
                  style={{ stroke: 'var(--tone-solid)' }}
                  strokeWidth={3}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className={styles.labels}>
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
