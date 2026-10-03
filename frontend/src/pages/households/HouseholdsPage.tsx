import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { IconBox } from '@/components/ui/IconBox';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { PersonCell } from '@/components/ui/PersonCell';
import { Tabs } from '@/components/ui/Tabs';
import { getGroups, getHouseholds } from '@/features/households/householdService';
import type { Household } from '@/features/households/types';
import { useAsync } from '@/hooks/useAsync';
import { useListQuery } from '@/hooks/useListQuery';
import { formatDate } from '@/utils/format';
import styles from './HouseholdsPage.module.css';

const columns: Column<Household>[] = [
  {
    key: 'code',
    header: 'Số hộ',
    render: (h) => (
      <div className={styles.code}>
        <IconBox icon="home" size="sm" tone="primary" />
        <CellStack primary={h.code} secondary={`Từ ${formatDate(h.registeredAt)}`} />
      </div>
    ),
  },
  { key: 'head', header: 'Chủ hộ', render: (h) => <PersonCell name={h.headName} /> },
  {
    key: 'address',
    header: 'Địa chỉ',
    hideOnMobile: true,
    render: (h) => <CellStack primary={h.address} secondary={h.groupName} />,
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
  const groups = useAsync(getGroups, []);

  const tabs = [
    { value: 'all', label: 'Tất cả' },
    ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name })),
  ];

  return (
    <Card
      title="Hộ gia đình"
      subtitle={list.data && `${list.data.total} hộ phù hợp`}
      flush
    >
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm số hộ, chủ hộ, địa chỉ…">
        <Tabs options={tabs} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>
      <ListView {...list} columns={columns} rowKey={(h) => h.id} onPageChange={list.setPage} />
    </Card>
  );
}
