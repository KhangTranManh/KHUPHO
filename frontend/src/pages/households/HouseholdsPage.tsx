import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { IconBox } from '@/components/ui/IconBox';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { PersonCell } from '@/components/ui/PersonCell';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import {
  HOUSING_TYPES,
  HOUSING_TYPE_ICON,
  HOUSING_TYPE_LABEL,
  HOUSING_TYPE_TONE,
  isHousingType,
} from '@/features/households/constants';
import { getHouseholds } from '@/features/households/householdService';
import type { Household, HousingType } from '@/features/households/types';
import { useListQuery } from '@/hooks/useListQuery';
import { formatDate } from '@/utils/format';
import styles from './HouseholdsPage.module.css';

const TABS: TabOption<HousingType | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  ...HOUSING_TYPES.map((t) => ({ value: t, label: HOUSING_TYPE_LABEL[t] })),
];

const columns: Column<Household>[] = [
  {
    key: 'code',
    header: 'Số hộ',
    render: (h) => (
      <div className={styles.code}>
        <IconBox icon={HOUSING_TYPE_ICON[h.housingType]} size="sm" tone={HOUSING_TYPE_TONE[h.housingType]} />
        <CellStack primary={h.code} secondary={`Từ ${formatDate(h.registeredAt)}`} />
      </div>
    ),
  },
  {
    key: 'head',
    header: 'Chủ hộ',
    render: (h) => <PersonCell name={h.headName} secondary={h.headPhone ?? 'Chưa có SĐT'} />,
  },
  {
    key: 'address',
    header: 'Địa chỉ',
    hideOnMobile: true,
    render: (h) => <CellStack primary={h.address} secondary={h.areaName} />,
  },
  {
    key: 'type',
    header: 'Loại nhà ở',
    align: 'center',
    hideOnMobile: true,
    render: (h) => <Badge tone={HOUSING_TYPE_TONE[h.housingType]}>{HOUSING_TYPE_LABEL[h.housingType]}</Badge>,
  },
  {
    key: 'members',
    header: 'Nhân khẩu',
    align: 'center',
    render: (h) => <strong className={styles.num}>{h.memberCount}</strong>,
  },
];

export function HouseholdsPage() {
  const list = useListQuery(getHouseholds);
  const [params] = useSearchParams();
  const loai = params.get('loai');

  // Mở từ dashboard với ?loai=thap_tang | cao_tang → chọn sẵn tab.
  useEffect(() => {
    if (isHousingType(loai)) list.setFilter(loai);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi ?loai đổi
  }, [loai]);

  return (
    <Card title="Hộ gia đình" subtitle={list.data && `${list.data.total} hộ phù hợp`} flush>
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm số hộ, chủ hộ, địa chỉ, SĐT…">
        <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>
      <ListView {...list} columns={columns} rowKey={(h) => h.id} onPageChange={list.setPage} />
    </Card>
  );
}
