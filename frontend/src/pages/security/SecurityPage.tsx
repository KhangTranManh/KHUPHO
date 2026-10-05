import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { IconBox } from '@/components/ui/IconBox';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import { useIsStaff } from '@/features/auth/useIsStaff';
import {
  REPORT_CATEGORY_LABEL,
  REPORT_HANDLER_LABEL,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_TONE,
  REPORT_TYPE_ICON,
  REPORT_TYPE_LABEL,
  REPORT_TYPE_TONE,
} from '@/features/reports/constants';
import { getReports, type ReportQuery } from '@/features/reports/reportService';
import type { Report, ReportStatus, ReportType } from '@/features/reports/types';
import { useListQuery } from '@/hooks/useListQuery';
import { formatDateTime } from '@/utils/format';
import { ReportDetailModal } from './components/ReportDetailModal';
import { ReportFormModal } from './components/ReportFormModal';
import styles from './SecurityPage.module.css';

const TABS: TabOption<ReportStatus | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  ...(Object.keys(REPORT_STATUS_LABEL) as ReportStatus[]).map((s) => ({ value: s, label: REPORT_STATUS_LABEL[s] })),
];

/** "Nút báo" theo 3 loại phản ánh. */
const QUICK: { type: Exclude<ReportType, 'sos'>; hint: string }[] = [
  { type: 'an_ninh', hint: 'Trộm cắp, lừa đảo, đối tượng tình nghi' },
  { type: 'mat_an_toan', hint: 'Ngập nước, lấn chiếm, nguy cơ mất an toàn' },
  { type: 'hu_hong_dan_sinh', hint: 'Đèn đường, cống, thang máy hư hỏng…' },
];

/** Chỉ phản ánh thường; SOS xem ở trang SOS. */
const fetchReports = (q: ReportQuery) => getReports({ ...q, kind: 'phan_anh' });

/** Luồng: Nút báo → Form phản ánh → Trưởng khu phố / Công an khu vực xử lý (có lịch sử). */
export function SecurityPage() {
  const isStaff = useIsStaff();
  const list = useListQuery(fetchReports);
  const [formType, setFormType] = useState<Exclude<ReportType, 'sos'> | null>(null);
  const [viewing, setViewing] = useState<Report | null>(null);

  const columns = useMemo<Column<Report>[]>(
    () => [
      {
        key: 'title',
        header: 'Phản ánh',
        render: (rp) => (
          <div className={styles.titleCell}>
            <IconBox icon={REPORT_TYPE_ICON[rp.type]} tone={REPORT_TYPE_TONE[rp.type]} size="sm" />
            <CellStack
              primary={
                <>
                  {rp.title} {rp.severity === 'khan' && <Badge tone="danger">Khẩn</Badge>}
                </>
              }
              secondary={`${rp.code} · ${REPORT_CATEGORY_LABEL[rp.category]}`}
            />
          </div>
        ),
      },
      {
        key: 'location',
        header: 'Địa điểm / Người gửi',
        hideOnMobile: true,
        render: (rp) => (
          <CellStack
            primary={rp.location?.address ?? '—'}
            secondary={`${rp.reporter.name}${rp.reporter.householdCode ? ` (${rp.reporter.householdCode})` : ''} · ${formatDateTime(rp.createdAt)}`}
          />
        ),
      },
      {
        key: 'handler',
        header: 'Xử lý',
        hideOnMobile: true,
        render: (rp) => (
          <CellStack primary={rp.assignedRole ? REPORT_HANDLER_LABEL[rp.assignedRole] : '—'} secondary={rp.assignee?.name} />
        ),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (rp) => <Badge tone={REPORT_STATUS_TONE[rp.status]}>{REPORT_STATUS_LABEL[rp.status]}</Badge>,
      },
      {
        key: 'action',
        header: '',
        align: 'right',
        render: (rp) => (
          <Button size="sm" variant="outline" onClick={() => setViewing(rp)}>
            {isStaff ? 'Xử lý' : 'Chi tiết'}
          </Button>
        ),
      },
    ],
    [isStaff],
  );

  return (
    <div className={styles.page}>
      <div className={styles.quick}>
        {QUICK.map(({ type, hint }) => (
          <button key={type} type="button" className={styles.quickItem} onClick={() => setFormType(type)}>
            <IconBox icon={REPORT_TYPE_ICON[type]} tone={REPORT_TYPE_TONE[type]} size="lg" />
            <span>
              <strong>Báo {REPORT_TYPE_LABEL[type].toLowerCase()}</strong>
              <small>{hint}</small>
            </span>
          </button>
        ))}
      </div>

      <Card
        title={isStaff ? 'Phản ánh của cư dân' : 'Phản ánh của tôi'}
        subtitle={list.data && `${list.data.total} phản ánh`}
        action={
          <Button size="sm" icon="plus" onClick={() => setFormType('an_ninh')}>
            Gửi phản ánh
          </Button>
        }
        flush
      >
        <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm mã, nội dung, địa điểm, người gửi…">
          <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
        </ListToolbar>
        <ListView {...list} columns={columns} rowKey={(rp) => rp.id} onPageChange={list.setPage} emptyText="Chưa có phản ánh nào" />
      </Card>

      <ReportFormModal
        type={formType}
        onClose={() => setFormType(null)}
        onCreated={() => {
          setFormType(null);
          list.reload();
        }}
      />
      <ReportDetailModal
        report={viewing}
        canHandle={isStaff}
        onClose={() => setViewing(null)}
        onSaved={() => {
          setViewing(null);
          list.reload();
        }}
      />
    </div>
  );
}
