import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { fundAmountText, transferContent, vietQrImageUrl } from '@/features/funds/constants';
import type { Fund } from '@/features/funds/types';
import styles from './FundQrModal.module.css';

/** Bước 1 của luồng thu: mở mã QR chuyển khoản cho quỹ. */
export function FundQrModal({ fund, onClose }: { fund: Fund | null; onClose: () => void }) {
  const qr = fund ? vietQrImageUrl(fund) : undefined;

  return (
    <Modal open={fund !== null} title={fund ? `Đóng quỹ: ${fund.name}` : ''} onClose={onClose}>
      {fund && (
        <div className={styles.wrap}>
          {qr ? (
            <img className={styles.qr} src={qr} alt={`Mã QR chuyển khoản quỹ ${fund.name}`} />
          ) : (
            <div className={styles.placeholder}>
              <Icon name="qrCode" size={48} strokeWidth={1.5} />
              <span>Quỹ chưa gắn tài khoản nhận nên chưa tạo được mã QR.</span>
            </div>
          )}
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
            <dt>Nội dung chuyển khoản</dt>
            <dd>
              <code>{transferContent(fund)} &lt;số hộ&gt;</code>
            </dd>
          </dl>
          <p className={styles.note}>
            Ghi kèm số hộ trong nội dung để cán bộ đối soát. Sau khi xác nhận, hộ sẽ nhận thông báo đã đóng.
          </p>
        </div>
      )}
    </Modal>
  );
}
