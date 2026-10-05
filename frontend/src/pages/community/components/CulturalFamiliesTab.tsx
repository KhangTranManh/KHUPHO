import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import { getCulturalFamilies } from '@/features/community/communityService';
import { CULTURAL_RESULT_LABEL, CULTURAL_RESULT_TONE } from '@/features/community/constants';
import type { CulturalFamily, CulturalResult } from '@/features/community/types';
import { useListQuery } from '@/hooks/useListQuery';

const TABS: TabOption<CulturalResult | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  ...(Object.keys(CULTURAL_RESULT_LABEL) as CulturalResult[]).map((r) => ({ value: r, label: CULTURAL_RESULT_LABEL[r] })),
];

const columns: Column<CulturalFamily>[] = [
  { key: 'code', header: 'Số hộ', render: (c) => <CellStack primary={c.householdCode} secondary={c.areaName} /> },
  { key: 'head', header: 'Chủ hộ', render: (c) => c.headName },
  {
    key: 'result',
    header: 'Kết quả',
    align: 'center',
    render: (c) => <Badge tone={CULTURAL_RESULT_TONE[c.result]}>{CULTURAL_RESULT_LABEL[c.result]}</Badge>,
  },
  {
    key: 'years',
    header: 'Năm liên tiếp',
    align: 'center',
    hideOnMobile: true,
    render: (c) => (c.consecutiveYears ? `${c.consecutiveYears} năm` : '—'),
  },
  { key: 'note', header: 'Ghi chú', hideOnMobile: true, render: (c) => c.note ?? '—' },
];

/** Bình xét gia đình văn hoá năm nay. */
export function CulturalFamiliesTab() {
  const year = new Date().getFullYear();
  const list = useListQuery(getCulturalFamilies, { extra: { year } });

  return (
    <Card title={`Gia đình văn hoá năm ${year}`} subtitle={list.data && `${list.data.total} hộ`} flush>
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm số hộ, chủ hộ…">
        <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>
      <ListView {...list} columns={columns} rowKey={(c) => c.id} onPageChange={list.setPage} />
    </Card>
  );
}
