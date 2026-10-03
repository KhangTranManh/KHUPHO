import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { IconBox } from '@/components/ui/IconBox';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import { getChanges } from '@/features/changes/changeService';
import { CHANGE_TYPE_ICON, CHANGE_TYPE_LABEL, CHANGE_TYPE_TONE } from '@/features/changes/constants';
import type { ChangeType, ResidentChange } from '@/features/changes/types';
import { useListQuery } from '@/hooks/useListQuery';
import { formatDate } from '@/utils/format';
import styles from './ChangesPage.module.css';

const TABS: TabOption<ChangeType | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  ...(Object.keys(CHANGE_TYPE_LABEL) as ChangeType[]).map((t) => ({
    value: t,
    label: CHANGE_TYPE_LABEL[t],
  })),
];

const columns: Column<ResidentChange>[] = [
  {
    key: 'type',
    header: 'Loại biến động',
    render: (c) => (
      <div className={styles.type}>
        <IconBox icon={CHANGE_TYPE_ICON[c.type]} tone={CHANGE_TYPE_TONE[c.type]} size="sm" />
        <CellStack primary={CHANGE_TYPE_LABEL[c.type]} secondary={formatDate(c.date)} />
      </div>
    ),
  },
  {
    key: 'resident',
    header: 'Công dân',
    render: (c) => <CellStack primary={c.residentName} secondary={c.householdCode} />,
  },
  {
    key: 'officer',
    header: 'Cán bộ ghi nhận',
    hideOnMobile: true,
    render: (c) => (
      <span className={styles.officer}>
        <Avatar name={c.officer} size="xs" />
        {c.officer}
      </span>
    ),
  },
  {
    key: 'note',
    header: 'Ghi chú',
    hideOnMobile: true,
    render: (c) => <span className={styles.note}>{c.note ?? '—'}</span>,
  },
];

export function ChangesPage() {
  const list = useListQuery(getChanges);

  return (
    <Card
      title="Lịch sử biến động"
      subtitle={list.data && `${list.data.total} lượt biến động`}
      flush
    >
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm công dân, số hộ, cán bộ…">
        <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>
      <ListView {...list} columns={columns} rowKey={(c) => c.id} onPageChange={list.setPage} />
    </Card>
  );
}
