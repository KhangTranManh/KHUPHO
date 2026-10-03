import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { PersonCell } from '@/components/ui/PersonCell';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import {
  GENDER_LABEL,
  RELATION_LABEL,
  RESIDENCE_STATUS_LABEL,
  RESIDENCE_STATUS_TONE,
} from '@/features/residents/constants';
import { getResidents } from '@/features/residents/residentService';
import type { Resident, ResidenceStatus } from '@/features/residents/types';
import { useListQuery } from '@/hooks/useListQuery';
import { ageFrom } from '@/utils/date';
import { formatDate, maskCitizenId } from '@/utils/format';

const TABS: TabOption<ResidenceStatus | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'thuong_tru', label: RESIDENCE_STATUS_LABEL.thuong_tru },
  { value: 'tam_tru', label: RESIDENCE_STATUS_LABEL.tam_tru },
  { value: 'tam_vang', label: RESIDENCE_STATUS_LABEL.tam_vang },
];

const columns: Column<Resident>[] = [
  {
    key: 'name',
    header: 'Họ và tên',
    render: (p) => <PersonCell name={p.fullName} secondary={`CCCD ${maskCitizenId(p.citizenId)}`} />,
  },
  {
    key: 'household',
    header: 'Hộ / Quan hệ',
    render: (p) => <CellStack primary={p.householdCode} secondary={RELATION_LABEL[p.relation]} />,
  },
  {
    key: 'dob',
    header: 'Ngày sinh',
    hideOnMobile: true,
    render: (p) => (
      <CellStack
        primary={formatDate(p.dateOfBirth)}
        secondary={`${GENDER_LABEL[p.gender]} · ${ageFrom(p.dateOfBirth)} tuổi`}
      />
    ),
  },
  { key: 'group', header: 'Tổ', align: 'center', hideOnMobile: true, render: (p) => p.groupName },
  {
    key: 'status',
    header: 'Cư trú',
    align: 'center',
    render: (p) => (
      <Badge tone={RESIDENCE_STATUS_TONE[p.residenceStatus]}>
        {RESIDENCE_STATUS_LABEL[p.residenceStatus]}
      </Badge>
    ),
  },
  {
    key: 'registered',
    header: 'Ngày đăng ký',
    align: 'center',
    hideOnMobile: true,
    render: (p) => formatDate(p.registeredAt),
  },
];

export function ResidentsPage() {
  const list = useListQuery(getResidents);
  const [params] = useSearchParams();
  const q = params.get('q');

  // Nhận từ khoá từ ô tìm nhanh trên navbar (?q=...).
  useEffect(() => {
    if (q !== null) list.setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi ?q đổi
  }, [q]);

  return (
    <Card
      title="Danh sách nhân khẩu"
      subtitle={list.data && `${list.data.total} người phù hợp`}
      flush
    >
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm tên, CCCD, số hộ…">
        <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>
      <ListView {...list} columns={columns} rowKey={(p) => p.id} onPageChange={list.setPage} />
    </Card>
  );
}
