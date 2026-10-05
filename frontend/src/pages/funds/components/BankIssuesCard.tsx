import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CellStack, DataTable, type Column } from '@/components/ui/DataTable';
import { BANK_TX_STATUS_LABEL, formatCurrency } from '@/features/funds/constants';
import { getBankTransactionIssues } from '@/features/funds/fundService';
import type { BankTransaction } from '@/features/funds/types';
import { useAsync } from '@/hooks/useAsync';
import { formatDateTime } from '@/utils/format';

const columns: Column<BankTransaction>[] = [
  {
    key: 'time',
    header: 'Thời gian',
    render: (t) => <CellStack primary={formatDateTime(t.transactionAt)} secondary={t.referenceCode} />,
  },
  { key: 'amount', header: 'Số tiền', render: (t) => <strong>{formatCurrency(t.amount)}</strong> },
  { key: 'content', header: 'Nội dung chuyển khoản', render: (t) => <CellStack primary={t.content} secondary={t.note} /> },
  {
    key: 'status',
    header: 'Tình trạng',
    render: (t) => (
      <CellStack
        primary={<Badge tone={t.status === 'unmatched' ? 'danger' : 'warning'}>{BANK_TX_STATUS_LABEL[t.status]}</Badge>}
        secondary={t.householdCode && `Hộ ${t.householdCode}`}
      />
    ),
  },
];

/**
 * Trưởng KP: chuyển khoản đã vào tài khoản nhưng hệ thống KHÔNG tự ghi nhận được
 * (sai nội dung, chuyển thiếu, chuyển trùng…) → đối soát rồi "Đánh dấu đã đóng" tay hoặc hoàn tiền.
 * Ẩn khi không có giao dịch nào cần xử lý.
 */
export function BankIssuesCard() {
  const issues = useAsync(getBankTransactionIssues, []);
  if (!issues.data?.length) return null;

  return (
    <Card title="Chuyển khoản cần đối soát" subtitle={`${issues.data.length} giao dịch chưa tự ghi nhận được`} flush>
      <DataTable columns={columns} rows={issues.data} rowKey={(t) => t.id} />
    </Card>
  );
}
