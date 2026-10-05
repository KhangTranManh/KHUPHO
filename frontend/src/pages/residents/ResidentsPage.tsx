import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { PersonCell } from '@/components/ui/PersonCell';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import { HOUSING_TYPE_LABEL } from '@/features/households/constants';
import {
  GENDER_LABEL,
  RESIDENCE_STATUS_LABEL,
  RESIDENCE_STATUS_TONE,
  RESIDENT_CATEGORY_LABEL,
  RESIDENT_CATEGORY_TONE,
  householdRoleText,
  isResidentCategory,
} from '@/features/residents/constants';
import { getResidents } from '@/features/residents/residentService';
import type { Resident, ResidenceStatus } from '@/features/residents/types';
import { useListQuery } from '@/hooks/useListQuery';
import { ageFrom } from '@/utils/date';
import { formatDate, maskCitizenId } from '@/utils/format';
import styles from './ResidentsPage.module.css';

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
    render: (p) => <PersonCell name={p.fullName} secondary={p.citizenId ? `CCCD ${maskCitizenId(p.citizenId)}` : 'Chưa có CCCD'} />,
  },
  {
    key: 'age',
    header: 'Tuổi / Giới tính',
    render: (p) => (
      <CellStack
        primary={`${ageFrom(p.dateOfBirth)} tuổi · ${GENDER_LABEL[p.gender]}`}
        secondary={formatDate(p.dateOfBirth)}
      />
    ),
  },
  {
    key: 'phone',
    header: 'Liên hệ',
    hideOnMobile: true,
    render: (p) => (
      <CellStack
        primary={
          p.phone ? (
            <span className={styles.phone}>
              <Icon name="phone" size={12} /> {p.phone}
            </span>
          ) : (
            '—'
          )
        }
        secondary={p.otherContact}
      />
    ),
  },
  {
    key: 'household',
    header: 'Hộ / Vai trò',
    hideOnMobile: true,
    render: (p) => (
      <CellStack
        primary={`${p.householdCode} · ${HOUSING_TYPE_LABEL[p.housingType]}`}
        secondary={householdRoleText(p.householdRole, p.relationToHead)}
      />
    ),
  },
  {
    key: 'categories',
    header: 'Đối tượng',
    hideOnMobile: true,
    render: (p) => (
      <div className={styles.tags}>
        {p.categories.map((c) => (
          <span key={c} className={`tone-${RESIDENT_CATEGORY_TONE[c]} ${styles.tag}`}>
            {RESIDENT_CATEGORY_LABEL[c]}
          </span>
        ))}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Cư trú',
    align: 'center',
    render: (p) => (
      <CellStack
        primary={<Badge tone={RESIDENCE_STATUS_TONE[p.residenceStatus]}>{RESIDENCE_STATUS_LABEL[p.residenceStatus]}</Badge>}
        secondary={p.residenceTo ? `đến ${formatDate(p.residenceTo)}` : undefined}
      />
    ),
  },
];

export function ResidentsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q');
  const nhom = params.get('nhom');
  const category = isResidentCategory(nhom) ? nhom : undefined;

  const list = useListQuery(getResidents, { extra: { category } });

  // Nhận từ khoá từ ô tìm nhanh trên navbar (?q=...).
  useEffect(() => {
    if (q !== null) list.setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi ?q đổi
  }, [q]);

  // Đổi nhóm đối tượng (?nhom=...) → về trang 1.
  useEffect(() => {
    list.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi nhóm đổi
  }, [category]);

  const clearCategory = () => {
    params.delete('nhom');
    setParams(params, { replace: true });
  };

  return (
    <Card
      title="Danh sách nhân khẩu"
      subtitle={list.data && `${list.data.total} người phù hợp`}
      action={
        category && (
          <button type="button" className={`tone-${RESIDENT_CATEGORY_TONE[category]} ${styles.chip}`} onClick={clearCategory}>
            {RESIDENT_CATEGORY_LABEL[category]}
            <Icon name="x" size={12} />
          </button>
        )
      }
      flush
    >
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm tên, CCCD, số hộ, SĐT…">
        <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>
      <ListView {...list} columns={columns} rowKey={(p) => p.id} onPageChange={list.setPage} />
    </Card>
  );
}
