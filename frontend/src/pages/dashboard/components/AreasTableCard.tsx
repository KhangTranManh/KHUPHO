import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CellStack, DataTable, type Column } from '@/components/ui/DataTable';
import { IconBox } from '@/components/ui/IconBox';
import type { AreaOverview } from '@/features/dashboard/types';
import {
  AREA_MANAGER_LABEL,
  HOUSING_TYPE_ICON,
  HOUSING_TYPE_LABEL,
  HOUSING_TYPE_TONE,
} from '@/features/households/constants';
import { formatNumber } from '@/utils/format';
import styles from './AreasTableCard.module.css';

const num = (n: number) => <strong className={styles.num}>{formatNumber(n)}</strong>;

const columns: Column<AreaOverview>[] = [
  {
    key: 'name',
    header: 'Địa bàn',
    render: (a) => (
      <div className={styles.area}>
        <IconBox icon={HOUSING_TYPE_ICON[a.housingType]} tone={HOUSING_TYPE_TONE[a.housingType]} size="sm" />
        <CellStack primary={a.name} secondary={`${AREA_MANAGER_LABEL[a.housingType]}: ${a.managerName}`} />
      </div>
    ),
  },
  {
    key: 'type',
    header: 'Loại',
    align: 'center',
    hideOnMobile: true,
    render: (a) => <Badge tone={HOUSING_TYPE_TONE[a.housingType]}>{HOUSING_TYPE_LABEL[a.housingType]}</Badge>,
  },
  { key: 'households', header: 'Số hộ', align: 'center', render: (a) => num(a.households) },
  { key: 'residents', header: 'Nhân khẩu', align: 'center', render: (a) => num(a.residents) },
  { key: 'tamTru', header: 'Tạm trú', align: 'center', hideOnMobile: true, render: (a) => num(a.temporaryResidents) },
  { key: 'tamVang', header: 'Tạm vắng', align: 'center', hideOnMobile: true, render: (a) => num(a.temporaryAbsent) },
];

/** Thống kê theo địa bàn: tổ dân phố (thấp tầng) và toà chung cư (cao tầng). */
export function AreasTableCard({ areas }: { areas: AreaOverview[] }) {
  return (
    <Card title="Địa bàn quản lý" subtitle={`${areas.length} địa bàn`} flush>
      <DataTable columns={columns} rows={areas} rowKey={(a) => a.id} />
    </Card>
  );
}
