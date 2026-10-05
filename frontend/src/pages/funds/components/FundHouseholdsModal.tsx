import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CellStack, type Column } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { ListView } from '@/components/ui/ListView';
import { Modal } from '@/components/ui/Modal';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import { PAYMENT_METHOD_LABEL, formatCurrency } from '@/features/funds/constants';
import { getFundHouseholds, remindUnpaid } from '@/features/funds/fundService';
import type { FundHouseholdFilter, FundHouseholdStatus, FundSummary } from '@/features/funds/types';
import { useListQuery } from '@/hooks/useListQuery';
import { formatDateTime } from '@/utils/format';
import { MarkPaidModal } from './MarkPaidModal';
import styles from './FundHouseholdsModal.module.css';

/** Tự làm mới khi đang mở — thấy ngay hộ vừa chuyển khoản (webhook ngân hàng ghi nhận). */
const REFRESH_MS = 10_000;

const TABS: TabOption<FundHouseholdFilter | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'chua_dong', label: 'Chưa đóng' },
  { value: 'da_dong', label: 'Đã đóng' },
];

interface Props {
  fund: FundSummary;
  /** Gọi sau khi ghi nhận một khoản — để cập nhật số liệu thẻ quỹ. */
  onPaid: () => void;
  onClose: () => void;
}

/**
 * Cửa sổ danh sách thu của một quỹ: ai đã đóng, ai chưa; đánh dấu đã đóng (tiền mặt) và nhắc hộ chưa đóng.
 * Khoản chuyển khoản qua QR được ghi tự động — danh sách tự làm mới mỗi 10 giây.
 */
export function FundHouseholdsModal({ fund, onPaid, onClose }: Props) {
  const fetcher = useMemo(() => (q: Parameters<typeof getFundHouseholds>[1]) => getFundHouseholds(fund.id, q), [fund.id]);
  const list = useListQuery(fetcher);
  const [paying, setPaying] = useState<FundHouseholdStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);

  const reloadList = list.reload;
  useEffect(() => {
    const timer = setInterval(() => {
      reloadList();
      onPaid();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [reloadList, onPaid]);

  /** Gửi thông báo nhắc tới mọi hộ chưa đóng quỹ này. */
  const onRemind = async () => {
    setReminding(true);
    try {
      const { notified } = await remindUnpaid(fund.id);
      setNotice(`Đã gửi thông báo nhắc tới ${notified} hộ chưa đóng.`);
    } finally {
      setReminding(false);
    }
  };

  const columns: Column<FundHouseholdStatus>[] = [
    { key: 'code', header: 'Số hộ', render: (h) => <CellStack primary={h.householdCode} secondary={h.areaName} /> },
    { key: 'head', header: 'Chủ hộ', render: (h) => <CellStack primary={h.headName} secondary={h.address} /> },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (h) =>
        h.payment ? (
          <CellStack
            primary={<Badge tone="success">Đã đóng {formatCurrency(h.payment.amount)}</Badge>}
            secondary={[
              h.payment.method && PAYMENT_METHOD_LABEL[h.payment.method],
              h.payment.transactionCode,
              h.payment.paidAt && formatDateTime(h.payment.paidAt),
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        ) : (
          <CellStack
            primary={<Badge tone="secondary">Chưa đóng</Badge>}
            secondary={h.amountDue ? `Phải đóng ${formatCurrency(h.amountDue)}` : 'Tự nguyện'}
          />
        ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (h) =>
        !h.payment && (
          <Button size="sm" variant="outline" icon="check" onClick={() => setPaying(h)}>
            Đánh dấu đã đóng
          </Button>
        ),
    },
  ];

  return (
    <Modal open title={`Danh sách thu: ${fund.name}`} onClose={onClose} size="xl">
      <div className={styles.head}>
        <span className={styles.summary}>
          {list.data && `${list.data.total} hộ`} · tự cập nhật khi có chuyển khoản
        </span>
        <Button size="sm" variant="outline" icon="bell" onClick={onRemind} disabled={reminding}>
          Nhắc hộ chưa đóng
        </Button>
      </div>
      {notice && (
        <p className={styles.notice} role="status">
          <Icon name="checkCircle" size={16} /> {notice}
        </p>
      )}
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm số hộ, chủ hộ, địa chỉ…">
        <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>
      <ListView {...list} columns={columns} rowKey={(h) => h.householdId} onPageChange={list.setPage} />

      <MarkPaidModal
        fund={fund}
        household={paying}
        onClose={() => setPaying(null)}
        onDone={(result) => {
          setPaying(null);
          setNotice(
            `Đã ghi nhận hộ ${result.payment.householdCode} đóng ${formatCurrency(result.payment.amount)}` +
              (result.notified ? ' và gửi thông báo đến hộ.' : '.'),
          );
          list.reload();
          onPaid();
        }}
      />
    </Modal>
  );
}
