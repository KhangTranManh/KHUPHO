import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PageState } from '@/components/ui/PageState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useIsLeader } from '@/features/auth/useIsStaff';
import { formatCurrency, fundAmountText, fundPeriodText } from '@/features/funds/constants';
import { getFunds } from '@/features/funds/fundService';
import type { FundSummary } from '@/features/funds/types';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatNumber } from '@/utils/format';
import { BankIssuesCard } from './components/BankIssuesCard';
import { FundHouseholdsModal } from './components/FundHouseholdsModal';
import { FundQrModal } from './components/FundQrModal';
import styles from './FundsPage.module.css';

/**
 * Thu quỹ dân sinh.
 *  - Cư dân: mở mã QR riêng của hộ → chuyển khoản → webhook ngân hàng tự ghi "đã đóng" + báo hộ.
 *  - Trưởng KP: danh sách thu (cửa sổ nổi, tự làm mới), đánh dấu tiền mặt, nhắc hộ chưa đóng,
 *    xem chuyển khoản không tự ghi nhận được để đối soát.
 */
export function FundsPage() {
  const isLeader = useIsLeader();
  const funds = useAsync(getFunds, []);
  const [qrFund, setQrFund] = useState<FundSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!funds.data) return <PageState error={funds.error} />;
  const selected = funds.data.find((f) => f.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        {funds.data.map((f) => {
          const pct = f.totalHouseholds ? (f.paidHouseholds / f.totalHouseholds) * 100 : 0;
          return (
            <section key={f.id} className={`${styles.fund} ${f.id === selectedId ? styles.selected : ''}`}>
              <div className={styles.fundHead}>
                <h6>{f.name}</h6>
                <span className={styles.amount}>{fundAmountText(f)}</span>
              </div>
              <p className={styles.desc}>
                {fundPeriodText(f)}
                {f.dueDate && ` · hạn đóng ${formatDate(f.dueDate)}`}
                {f.description && ` · ${f.description}`}
              </p>
              <ProgressBar value={pct} tone={pct >= 80 ? 'success' : 'primary'} />
              <p className={styles.stats}>
                <strong>
                  {formatNumber(f.paidHouseholds)}/{formatNumber(f.totalHouseholds)}
                </strong>{' '}
                hộ đã đóng · {formatCurrency(f.collectedAmount)}
              </p>
              <div className={styles.actions}>
                <Button size="sm" variant="outline" icon="qrCode" onClick={() => setQrFund(f)}>
                  Mã QR
                </Button>
                {isLeader && (
                  <Button size="sm" icon="clipboard" onClick={() => setSelectedId(f.id)}>
                    Danh sách thu
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {isLeader && <BankIssuesCard />}

      {isLeader && selected && (
        <FundHouseholdsModal key={selected.id} fund={selected} onPaid={funds.reload} onClose={() => setSelectedId(null)} />
      )}

      <FundQrModal fund={qrFund} onClose={() => setQrFund(null)} onPaid={funds.reload} />
    </div>
  );
}
