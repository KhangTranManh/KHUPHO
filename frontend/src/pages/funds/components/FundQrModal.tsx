import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PageState } from '@/components/ui/PageState';
import { appConfig } from '@/config/app';
import { useAuth } from '@/features/auth/AuthContext';
import { formatCurrency, fundAmountText, vietQrImageUrl } from '@/features/funds/constants';
import { getMyFundPayment, simulateTransferDemo } from '@/features/funds/fundService';
import type { Fund, FundBankAccount, MyFundPayment } from '@/features/funds/types';
import { useAsync } from '@/hooks/useAsync';
import { formatDateTime } from '@/utils/format';
import styles from './FundQrModal.module.css';

/** Kiểm tra lại trạng thái mỗi 5 giây trong lúc chờ tiền về. */
const POLL_MS = 5_000;

interface Props {
  fund: Fund | null;
  onClose: () => void;
  /** Tiền đã về (tự xác nhận) — để trang cập nhật số liệu quỹ. */
  onPaid: () => void;
}

/**
 * Mã QR đóng quỹ.
 *  - Cư dân (tài khoản có hộ): QR riêng của hộ — đúng số tiền + nội dung "QKP <MÃ QUỸ> <SỐ HỘ>".
 *    Có webhook ngân hàng → màn hình tự chuyển sang "Đã nhận" khi tiền về.
 *  - Trưởng KP (không thuộc hộ): thông tin chung của quỹ.
 */
export function FundQrModal({ fund, onClose, onPaid }: Props) {
  const { user } = useAuth();
  return (
    <Modal open={fund !== null} title={fund ? `Đóng quỹ: ${fund.name}` : ''} onClose={onClose}>
      {fund &&
        (user?.householdId ? (
          <HouseholdQr key={fund.id} fund={fund} onPaid={onPaid} />
        ) : (
          <GeneralInfo fund={fund} />
        ))}
    </Modal>
  );
}

function QrImage({ bank, content, amount }: { bank?: FundBankAccount; content: string; amount?: number | null }) {
  if (!bank) {
    return (
      <div className={styles.placeholder}>
        <Icon name="qrCode" size={48} strokeWidth={1.5} />
        <span>Quỹ chưa gắn tài khoản nhận nên chưa tạo được mã QR. Vui lòng đóng trực tiếp cho trưởng khu phố.</span>
      </div>
    );
  }
  return <img className={styles.qr} src={vietQrImageUrl(bank, content, amount)} alt="Mã QR chuyển khoản" />;
}

function HouseholdQr({ fund, onPaid }: { fund: Fund; onPaid: () => void }) {
  const mine = useAsync(() => getMyFundPayment(fund.id), [fund.id]);
  const paid = mine.data?.payment;
  const [simulating, setSimulating] = useState(false);

  // Chờ tiền về: hỏi lại định kỳ tới khi đã đóng (chỉ khi có tự xác nhận qua ngân hàng).
  const waiting = !!mine.data?.autoConfirm && !!mine.data.bank && !paid;
  const reload = mine.reload;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, reload]);

  // Vừa chuyển sang "đã đóng" trong lúc mở → báo trang cập nhật số liệu.
  const [wasPaid] = useState(() => !!paid);
  useEffect(() => {
    if (paid && !wasPaid) onPaid();
  }, [paid, wasPaid, onPaid]);

  if (!mine.data) return <PageState error={mine.error} />;
  const d: MyFundPayment = mine.data;

  if (paid) {
    return (
      <div className={styles.wrap}>
        <div className={styles.success}>
          <Icon name="checkCircle" size={48} />
          <strong>Hộ {d.householdCode} đã đóng quỹ</strong>
          <span>
            {formatCurrency(paid.amount)}
            {paid.paidAt && ` · ${formatDateTime(paid.paidAt)}`}
          </span>
          {paid.confirmedBy?.name && <small>Xác nhận: {paid.confirmedBy.name}</small>}
        </div>
        <p className={styles.note}>Gia đình cũng nhận được thông báo xác nhận trong mục Thông báo.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <QrImage bank={d.bank} content={d.transferContent} amount={d.amountDue} />
      <dl className={styles.info}>
        <dt>Số tiền</dt>
        <dd>{d.amountDue ? formatCurrency(d.amountDue) : 'Tự nguyện (tuỳ tâm)'}</dd>
        {d.bank && (
          <>
            <dt>Tài khoản</dt>
            <dd>
              {d.bank.accountNo} – {d.bank.accountName}
            </dd>
          </>
        )}
        <dt>Nội dung</dt>
        <dd>
          <code>{d.transferContent}</code>
        </dd>
      </dl>
      {waiting ? (
        <p className={styles.waiting} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          Đang chờ ngân hàng xác nhận… Màn hình tự cập nhật khi tiền về.
        </p>
      ) : (
        <p className={styles.note}>Trưởng khu phố sẽ đối soát và xác nhận; hộ nhận thông báo khi đã ghi nhận.</p>
      )}
      <p className={styles.note}>
        Quét bằng app ngân hàng là điền sẵn số tiền và nội dung — <strong>giữ nguyên nội dung</strong> để hệ thống nhận đúng hộ.
      </p>
      {appConfig.useMock && (
        <Button
          size="sm"
          variant="outline"
          icon="zap"
          disabled={simulating}
          onClick={async () => {
            setSimulating(true);
            await simulateTransferDemo(fund.id);
            reload();
          }}
        >
          Mô phỏng đã chuyển khoản (demo)
        </Button>
      )}
    </div>
  );
}

/** Trưởng KP: thông tin chung — mỗi hộ có mã QR riêng (kèm số hộ) trong tài khoản cư dân. */
function GeneralInfo({ fund }: { fund: Fund }) {
  return (
    <div className={styles.wrap}>
      <QrImage bank={fund.bank} content={`QKP ${fund.code.toUpperCase().replace(/[^A-Z0-9]/g, '')}`} />
      <dl className={styles.info}>
        <dt>Số tiền</dt>
        <dd>{fundAmountText(fund)}</dd>
        {fund.bank && (
          <>
            <dt>Tài khoản</dt>
            <dd>
              {fund.bank.accountNo} – {fund.bank.accountName}
            </dd>
          </>
        )}
      </dl>
      <p className={styles.note}>
        Mỗi hộ thấy mã QR riêng (kèm số hộ) khi đăng nhập tài khoản cư dân — chuyển khoản qua mã đó được tự ghi nhận vào
        danh sách thu. Chuyển khoản không đúng nội dung xem ở mục "Chuyển khoản cần đối soát".
      </p>
    </div>
  );
}
