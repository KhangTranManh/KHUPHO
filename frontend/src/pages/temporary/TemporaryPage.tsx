import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { PersonCell } from '@/components/ui/PersonCell';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import {
  TEMPORARY_KIND_LABEL,
  TEMPORARY_STATUS_LABEL,
  TEMPORARY_STATUS_TONE,
  temporaryStatus,
} from '@/features/temporary/constants';
import { getTemporaryRecords } from '@/features/temporary/temporaryService';
import type { TemporaryKind, TemporaryRecord } from '@/features/temporary/types';
import { useListQuery } from '@/hooks/useListQuery';
import { daysBetween } from '@/utils/date';
import { formatDate, maskCitizenId } from '@/utils/format';

const TABS: TabOption<TemporaryKind | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'tam_tru', label: TEMPORARY_KIND_LABEL.tam_tru },
  { value: 'tam_vang', label: TEMPORARY_KIND_LABEL.tam_vang },
];

function remainingText(toDate: string) {
  const left = daysBetween(new Date(), new Date(toDate));
  return left >= 0 ? `Còn ${left} ngày` : `Quá hạn ${-left} ngày`;
}

const columns: Column<TemporaryRecord>[] = [
  {
    key: 'name',
    header: 'Họ và tên',
    render: (t) => <PersonCell name={t.fullName} secondary={`CCCD ${maskCitizenId(t.citizenId)}`} />,
  },
  {
    key: 'kind',
    header: 'Loại / Lý do',
    render: (t) => <CellStack primary={TEMPORARY_KIND_LABEL[t.kind]} secondary={t.reason} />,
  },
  {
    key: 'place',
    header: 'Nơi tạm trú / Nơi đến',
    hideOnMobile: true,
    render: (t) => t.place,
  },
  {
    key: 'period',
    header: 'Thời hạn',
    hideOnMobile: true,
    render: (t) => (
      <CellStack
        primary={`${formatDate(t.fromDate)} – ${formatDate(t.toDate)}`}
        secondary={remainingText(t.toDate)}
      />
    ),
  },
  {
    key: 'status',
    header: 'Trạng thái',
    align: 'center',
    render: (t) => {
      const status = temporaryStatus(t);
      return <Badge tone={TEMPORARY_STATUS_TONE[status]}>{TEMPORARY_STATUS_LABEL[status]}</Badge>;
    },
  },
];

export function TemporaryPage() {
  const list = useListQuery(getTemporaryRecords);

  return (
    <Card
      title="Tạm trú – Tạm vắng"
      subtitle={list.data && `${list.data.total} hồ sơ phù hợp`}
      flush
    >
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm tên, CCCD, địa điểm…">
        <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>
      <ListView {...list} columns={columns} rowKey={(t) => t.id} onPageChange={list.setPage} />
    </Card>
  );
}
