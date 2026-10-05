import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CellStack, DataTable, type Column } from '@/components/ui/DataTable';
import { IconBox } from '@/components/ui/IconBox';
import { PageState } from '@/components/ui/PageState';
import {
  HOUSEHOLD_TYPE_LABEL,
  HOUSEHOLD_TYPE_TONE,
  HOUSING_TYPE_ICON,
  HOUSING_TYPE_TONE,
  WELFARE_HOUSEHOLD_TYPES,
} from '@/features/households/constants';
import { getAreas } from '@/features/households/householdService';
import type { HouseholdType } from '@/features/households/types';
import type { WelfareHousehold } from '@/features/welfare/types';
import { getWelfareHouseholds } from '@/features/welfare/welfareService';
import { useAsync } from '@/hooks/useAsync';
import styles from './WelfarePage.module.css';

/** "2 người cao tuổi · 1 khuyết tật" */
const vulnerableText = (w: WelfareHousehold) =>
  [w.elderlyCount && `${w.elderlyCount} người cao tuổi`, w.disabledCount && `${w.disabledCount} khuyết tật`]
    .filter(Boolean)
    .join(' · ') || '—';

const columns: Column<WelfareHousehold>[] = [
  {
    key: 'code',
    header: 'Hộ',
    render: (w) => <CellStack primary={`${w.code} – ${w.headName}`} secondary={w.headPhone ?? 'Chưa có SĐT'} />,
  },
  {
    key: 'type',
    header: 'Loại hộ',
    render: (w) => <Badge tone={HOUSEHOLD_TYPE_TONE[w.householdType]}>{HOUSEHOLD_TYPE_LABEL[w.householdType]}</Badge>,
  },
  { key: 'address', header: 'Địa chỉ', hideOnMobile: true, render: (w) => <CellStack primary={w.address} secondary={w.areaName} /> },
  {
    key: 'members',
    header: 'Cần quan tâm',
    hideOnMobile: true,
    render: (w) => <CellStack primary={`${w.memberCount} nhân khẩu`} secondary={vulnerableText(w)} />,
  },
  {
    key: 'location',
    header: 'Toạ độ',
    hideOnMobile: true,
    render: (w) => (w.location ? `${w.location.lat.toFixed(5)}, ${w.location.lng.toFixed(5)}` : '—'),
  },
];

/** Sơ đồ hộ chính sách / khó khăn theo khu vực + danh sách chi tiết. */
export function WelfarePage() {
  const welfare = useAsync(getWelfareHouseholds, []);
  const areas = useAsync(getAreas, []);
  const [type, setType] = useState<HouseholdType | 'all'>('all');

  const filtered = useMemo(
    () => (welfare.data ?? []).filter((w) => type === 'all' || w.householdType === type),
    [welfare.data, type],
  );

  if (!welfare.data || !areas.data) return <PageState error={welfare.error ?? areas.error} />;

  const countOf = (t: HouseholdType) => welfare.data!.filter((w) => w.householdType === t).length;

  return (
    <div className={styles.page}>
      <div className={styles.legend} role="group" aria-label="Lọc theo loại hộ">
        <button type="button" className={`${styles.chip} ${type === 'all' ? styles.active : ''}`} onClick={() => setType('all')}>
          Tất cả <strong>{welfare.data.length}</strong>
        </button>
        {WELFARE_HOUSEHOLD_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`tone-${HOUSEHOLD_TYPE_TONE[t]} ${styles.chip} ${type === t ? styles.active : ''}`}
            onClick={() => setType(type === t ? 'all' : t)}
          >
            <i className={styles.dot} /> {HOUSEHOLD_TYPE_LABEL[t]} <strong>{countOf(t)}</strong>
          </button>
        ))}
      </div>

      <Card title="Sơ đồ theo khu vực" subtitle="Mỗi ô là một hộ — rê chuột để xem chi tiết">
        <div className={styles.map}>
          {areas.data.map((area) => {
            const items = filtered.filter((w) => w.areaId === area.id);
            return (
              <div key={area.id} className={styles.area}>
                <div className={styles.areaHead}>
                  <IconBox icon={HOUSING_TYPE_ICON[area.housingType]} tone={HOUSING_TYPE_TONE[area.housingType]} size="sm" />
                  <span>{area.name}</span>
                  <strong>{items.length}</strong>
                </div>
                <div className={styles.tiles}>
                  {items.length === 0 && <span className={styles.none}>Không có</span>}
                  {items.map((w) => (
                    <span
                      key={w.id}
                      className={`tone-${HOUSEHOLD_TYPE_TONE[w.householdType]} ${styles.tile}`}
                      title={`${w.code} – ${w.headName}\n${HOUSEHOLD_TYPE_LABEL[w.householdType]}\n${w.address}\n${vulnerableText(w)}`}
                    >
                      {w.code.replace('HK-', '')}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Danh sách hộ" subtitle={`${filtered.length} hộ`} flush>
        <DataTable columns={columns} rows={filtered} rowKey={(w) => w.id} emptyText="Không có hộ nào" />
      </Card>
    </div>
  );
}
