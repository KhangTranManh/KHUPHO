import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { IconBox } from '@/components/ui/IconBox';
import { ROUTES } from '@/config/navigation';
import type { OfficerDashboard } from '@/features/dashboard/types';
import {
  HOUSING_TYPES,
  HOUSING_TYPE_DESCRIPTION,
  HOUSING_TYPE_ICON,
  HOUSING_TYPE_LABEL,
  HOUSING_TYPE_TONE,
} from '@/features/households/constants';
import { formatNumber } from '@/utils/format';
import styles from './HousingTypeCard.module.css';

/** So sánh cư dân thấp tầng và cao tầng. Bấm vào một nhóm → danh sách hộ của nhóm đó. */
export function HousingTypeCard({ data }: { data: OfficerDashboard['byHousingType'] }) {
  const totalResidents = HOUSING_TYPES.reduce((sum, t) => sum + data[t].residents, 0);
  const totalHouseholds = HOUSING_TYPES.reduce((sum, t) => sum + data[t].households, 0);
  const share = (n: number) => (totalResidents ? Math.round((n / totalResidents) * 100) : 0);

  return (
    <Card
      title="Cư dân theo loại nhà ở"
      subtitle={`${formatNumber(totalHouseholds)} hộ · ${formatNumber(totalResidents)} nhân khẩu`}
    >
      <div className={styles.split} role="img" aria-label="Tỉ lệ nhân khẩu thấp tầng / cao tầng">
        {HOUSING_TYPES.map((t) => (
          <span
            key={t}
            className={`tone-${HOUSING_TYPE_TONE[t]} ${styles.segment}`}
            style={{ width: `${share(data[t].residents)}%` }}
          />
        ))}
      </div>

      <div className={styles.grid}>
        {HOUSING_TYPES.map((t) => {
          const s = data[t];
          return (
            <Link key={t} to={`${ROUTES.households}?loai=${t}`} className={styles.item}>
              <div className={styles.head}>
                <IconBox icon={HOUSING_TYPE_ICON[t]} tone={HOUSING_TYPE_TONE[t]} />
                <div className={styles.titles}>
                  <h6>{HOUSING_TYPE_LABEL[t]}</h6>
                  <p>{HOUSING_TYPE_DESCRIPTION[t]}</p>
                </div>
                <span className={`tone-${HOUSING_TYPE_TONE[t]} text-gradient ${styles.pct}`}>
                  {share(s.residents)}%
                </span>
              </div>
              <dl className={styles.numbers}>
                <div>
                  <dt>Hộ</dt>
                  <dd>{formatNumber(s.households)}</dd>
                </div>
                <div>
                  <dt>Nhân khẩu</dt>
                  <dd>{formatNumber(s.residents)}</dd>
                </div>
                <div>
                  <dt>Tạm trú</dt>
                  <dd>{formatNumber(s.byStatus.tam_tru)}</dd>
                </div>
                <div>
                  <dt>Tạm vắng</dt>
                  <dd>{formatNumber(s.byStatus.tam_vang)}</dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
