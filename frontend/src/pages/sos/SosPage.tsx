import { useMemo, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CellStack, type Column } from '@/components/ui/DataTable';
import formStyles from '@/components/ui/Form.module.css';
import { Icon } from '@/components/ui/Icon';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { Modal } from '@/components/ui/Modal';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useIsStaff } from '@/features/auth/useIsStaff';
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from '@/features/reports/constants';
import { getSosAlerts, sendSos } from '@/features/reports/reportService';
import type { Report, ReportStatus } from '@/features/reports/types';
import { ReportDetailModal } from '@/pages/security/components/ReportDetailModal';
import { useListQuery } from '@/hooks/useListQuery';
import { ApiError } from '@/services/api';
import { formatDateTime } from '@/utils/format';
import styles from './SosPage.module.css';

const TABS: TabOption<ReportStatus | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  ...(Object.keys(REPORT_STATUS_LABEL) as ReportStatus[]).map((s) => ({ value: s, label: REPORT_STATUS_LABEL[s] })),
];

const EMERGENCY = [
  { label: 'Công an', phone: '113' },
  { label: 'Cứu hoả', phone: '114' },
  { label: 'Cấp cứu', phone: '115' },
];

/** Nút báo động SOS (mọi vai trò) + danh sách SOS — cùng collection phản ánh, xử lý bằng chung hộp thoại chi tiết. */
export function SosPage() {
  const isStaff = useIsStaff();
  const list = useListQuery(getSosAlerts);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('');
  const [sent, setSent] = useState<Report | null>(null);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const alert = await sendSos({ message: message.trim() || undefined, address: address.trim() || undefined });
      setSent(alert);
      setConfirming(false);
      setMessage('');
      list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được, hãy gọi ngay 113 / 114 / 115');
    } finally {
      setSending(false);
    }
  };

  const columns = useMemo<Column<Report>[]>(
    () => [
      {
        key: 'who',
        header: 'Người báo',
        render: (a) => (
          <CellStack primary={a.reporter.name} secondary={[a.reporter.phone, a.reporter.householdCode].filter(Boolean).join(' · ')} />
        ),
      },
      {
        key: 'msg',
        header: 'Nội dung / Vị trí',
        render: (a) => <CellStack primary={a.description ?? '(không ghi nội dung)'} secondary={a.location?.address} />,
      },
      { key: 'time', header: 'Thời gian', hideOnMobile: true, render: (a) => formatDateTime(a.createdAt) },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (a) => (
          <CellStack
            primary={<Badge tone={REPORT_STATUS_TONE[a.status]}>{REPORT_STATUS_LABEL[a.status]}</Badge>}
            secondary={a.assignee?.name}
          />
        ),
      },
      {
        key: 'action',
        header: '',
        align: 'right',
        render: (a) => (
          <Button size="sm" variant="outline" tone={a.status === 'moi' ? 'danger' : 'primary'} onClick={() => setViewing(a)}>
            {isStaff ? (a.status === 'moi' ? 'Tiếp nhận' : 'Xử lý') : 'Chi tiết'}
          </Button>
        ),
      },
    ],
    [isStaff],
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <button type="button" className={styles.sos} onClick={() => setConfirming(true)} aria-label="Gửi báo động SOS">
          <Icon name="siren" size={44} strokeWidth={1.8} />
          SOS
        </button>
        <div className={styles.heroText}>
          <h5>Cần hỗ trợ khẩn cấp?</h5>
          <p>Bấm nút SOS để báo ngay cho cán bộ khu phố. Trường hợp nguy hiểm đến tính mạng, gọi trực tiếp:</p>
          <div className={styles.emergency}>
            {EMERGENCY.map((e) => (
              <a key={e.phone} href={`tel:${e.phone}`} className={styles.call}>
                <Icon name="phone" size={14} /> {e.phone} <small>{e.label}</small>
              </a>
            ))}
          </div>
          {sent && (
            <p className={styles.sent} role="status">
              <Icon name="checkCircle" size={16} /> Đã gửi báo động lúc {formatDateTime(sent.createdAt)}. Cán bộ sẽ liên hệ
              ngay.
            </p>
          )}
        </div>
      </section>

      <Card title={isStaff ? 'Báo động SOS' : 'Báo động của tôi'} subtitle={list.data && `${list.data.total} báo động`} flush>
        <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm người báo, địa chỉ, SĐT…">
          <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
        </ListToolbar>
        <ListView {...list} columns={columns} rowKey={(a) => a.id} onPageChange={list.setPage} emptyText="Chưa có báo động nào" />
      </Card>

      <ReportDetailModal
        report={viewing}
        canHandle={isStaff}
        onClose={() => setViewing(null)}
        onSaved={() => {
          setViewing(null);
          list.reload();
        }}
      />

      <Modal
        open={confirming}
        title="Gửi báo động SOS?"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button variant="white" onClick={() => setConfirming(false)}>
              Huỷ
            </Button>
            <Button type="submit" form="sos-form" tone="danger" icon="siren" disabled={sending}>
              {sending ? 'Đang gửi…' : 'Gửi SOS ngay'}
            </Button>
          </>
        }
      >
        <form id="sos-form" className={formStyles.form} onSubmit={onSend}>
          <p className={styles.warn}>Cán bộ khu phố sẽ nhận được báo động kèm họ tên và số điện thoại trong tài khoản của bạn.</p>
          <TextArea label="Tình huống (tuỳ chọn)" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
          <TextField label="Vị trí hiện tại (tuỳ chọn)" icon="mapPin" value={address} onChange={(e) => setAddress(e.target.value)} />
          {error && <p className={formStyles.error}>{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
