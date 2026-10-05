import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { IconBox } from '@/components/ui/IconBox';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ROUTES } from '@/config/navigation';
import {
  RESIDENT_CATEGORIES,
  RESIDENT_CATEGORY_HINT,
  RESIDENT_CATEGORY_ICON,
  RESIDENT_CATEGORY_LABEL,
  RESIDENT_CATEGORY_TONE,
} from '@/features/residents/constants';
import type { ResidentCategory } from '@/features/residents/types';
import { formatNumber } from '@/utils/format';
import styles from './CategoryCard.module.css';

interface Props {
  byCategory: Record<ResidentCategory, number>;
  totalResidents: number;
}

/** Số nhân khẩu theo nhóm đối tượng. Bấm một nhóm → danh sách nhân khẩu của nhóm đó. */
export function CategoryCard({ byCategory, totalResidents }: Props) {
  return (
    <Card title="Phân loại đối tượng" subtitle="Một người có thể thuộc nhiều nhóm">
      <ul className={styles.list}>
        {RESIDENT_CATEGORIES.map((c) => {
          const count = byCategory[c];
          const pct = totalResidents ? (count / totalResidents) * 100 : 0;
          return (
            <li key={c}>
              <Link to={`${ROUTES.residents}?nhom=${c}`} className={styles.row}>
                <IconBox icon={RESIDENT_CATEGORY_ICON[c]} tone={RESIDENT_CATEGORY_TONE[c]} size="sm" />
                <div className={styles.body}>
                  <div className={styles.top}>
                    <span className={styles.label}>
                      {RESIDENT_CATEGORY_LABEL[c]}
                      <small>{RESIDENT_CATEGORY_HINT[c]}</small>
                    </span>
                    <span className={styles.count}>
                      {formatNumber(count)}
                      <small>{Math.round(pct)}%</small>
                    </span>
                  </div>
                  <ProgressBar value={pct} tone={RESIDENT_CATEGORY_TONE[c]} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
