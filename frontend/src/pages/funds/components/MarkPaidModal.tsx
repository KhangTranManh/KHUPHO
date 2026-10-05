import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import formStyles from '@/components/ui/Form.module.css';
import { PAYMENT_METHOD_LABEL } from '@/features/funds/constants';
import { markFundPaid } from '@/features/funds/fundService';
import type { Fund, FundHouseholdStatus, MarkPaidResult, PaymentMethod } from '@/features/funds/types';
import { ApiError } from '@/services/api';

interface Props {
  fund: Fund;
  household: FundHouseholdStatus | null;
  onClose: () => void;
  onDone: (result: MarkPaidResult) => void;
}

/** Bước 2–4 của luồng thu: xác nhận hộ đã đóng → lưu khoản thu → gửi thông báo đến hộ. */
export function MarkPaidModal({ fund, household, onClose, onDone }: Props) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('qr');
  const [transactionCode, setTransactionCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!household) return;
    // Số tiền phải đóng: theo hộ = mức mặc định; theo người = mức × số nhân khẩu (backend tính sẵn).
    setAmount(household.amountDue ? String(household.amountDue) : '');
    setMethod('qr');
    setTransactionCode('');
    setError(null);
  }, [household]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!household) return;
    setSaving(true);
    setError(null);
    try {
      onDone(
        await markFundPaid(fund.id, {
          householdId: household.householdId,
          amount: Number(amount),
          method,
          transactionCode: method === 'qr' ? transactionCode.trim() || undefined : undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={household !== null}
      title="Xác nhận đã đóng quỹ"
      onClose={onClose}
      footer={
        <>
          <Button variant="white" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="mark-paid-form" icon="check" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Xác nhận & gửi thông báo'}
          </Button>
        </>
      }
    >
      {household && (
        <form id="mark-paid-form" className={formStyles.form} onSubmit={onSubmit}>
          <div className={formStyles.summary}>
            <strong>
              {household.householdCode} – {household.headName}
            </strong>
            <span>{household.address}</span>
            <span>Quỹ: {fund.name}</span>
          </div>
          <div className={formStyles.row}>
            <TextField
              label="Số tiền (đồng)"
              type="number"
              min={1000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Select<PaymentMethod>
              label="Hình thức"
              value={method}
              onChange={setMethod}
              options={(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))}
            />
          </div>
          {method === 'qr' && (
            <TextField
              label="Mã giao dịch (tuỳ chọn)"
              placeholder="VD: FT26278xxxxx"
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
              maxLength={60}
            />
          )}
          {error && <p className={formStyles.error}>{error}</p>}
        </form>
      )}
    </Modal>
  );
}
