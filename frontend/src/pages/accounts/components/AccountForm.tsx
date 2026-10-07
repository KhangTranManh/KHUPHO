import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { createAccount, updateAccount } from '@/features/accounts/accountService';
import type { AccountStatus, PhoneLookup } from '@/features/accounts/types';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLE_LABEL } from '@/features/auth/constants';
import type { Role } from '@/features/auth/types';
import { ApiError } from '@/services/api';
import { formatDateTime } from '@/utils/format';
import { changedFields } from '../diff';
import styles from '../AccountsPage.module.css';

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((value) => ({ value, label: ROLE_LABEL[value] }));
const STATUS_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'disabled', label: 'Khoá (không đăng nhập được)' },
];

interface Props {
  lookup: PhoneLookup;
  onUpdated: (next: PhoneLookup) => void;
}

/** Tài khoản đăng nhập của SĐT: sửa nếu đã có, tạo mới (chưa kích hoạt) nếu chưa có. */
export function AccountForm({ lookup, onUpdated }: Props) {
  return lookup.account ? <EditAccount lookup={lookup} onUpdated={onUpdated} /> : <CreateAccount lookup={lookup} onUpdated={onUpdated} />;
}

function useSubmit(onUpdated: Props['onUpdated']) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const run = async (action: () => Promise<PhoneLookup>, success: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      onUpdated(await action());
      setNotice(success);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };
  const messages = (
    <>
      {error && (
        <p className={styles.error} role="alert">
          <Icon name="minusCircle" size={16} /> {error}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          <Icon name="checkCircle" size={16} /> {notice}
        </p>
      )}
    </>
  );
  return { busy, run, messages, setError };
}

function EditAccount({ lookup, onUpdated }: Props) {
  const account = lookup.account!;
  const { user } = useAuth();
  const isSelf = user?.id === account.id;
  const original = {
    fullName: account.fullName,
    phone: account.phone ?? '',
    role: account.role,
    status: account.status,
    householdCode: account.linkedHousehold?.householdCode ?? '',
  };
  const [draft, setDraft] = useState(original);
  const { busy, run, messages, setError } = useSubmit(onUpdated);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const changes = changedFields(original, draft);
  const dirty = Object.keys(changes).length > 0;

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (changes.status === 'disabled' && !window.confirm(`Khoá tài khoản ${account.fullName}? Người này bị đăng xuất ngay.`)) return;
    void run(() => updateAccount(account.id, changes), 'Đã lưu. Thay đổi SĐT / vai trò / trạng thái có hiệu lực ngay (đăng xuất các phiên cũ).');
  };

  const onResetPassword = () => {
    if (!window.confirm(`Đặt lại mật khẩu cho ${account.fullName}? Người này phải đăng nhập lần đầu lại (xác minh SĐT) và đặt mật khẩu mới.`)) return;
    setError(null);
    void run(() => updateAccount(account.id, { resetPassword: true }), 'Đã đặt lại mật khẩu — tài khoản về trạng thái chưa kích hoạt.');
  };

  return (
    <Card
      title="Tài khoản đăng nhập"
      subtitle={
        <span className={styles.badges}>
          <Badge tone={account.status === 'active' ? 'success' : 'danger'}>{account.status === 'active' ? 'Hoạt động' : 'Đã khoá'}</Badge>
          <Badge tone={account.activated ? 'info' : 'warning'}>{account.activated ? 'Đã kích hoạt' : 'Chưa kích hoạt'}</Badge>
          {account.mustChangePassword && <Badge tone="warning">Phải đổi mật khẩu</Badge>}
          {account.lastLoginAt && <span className={styles.muted}>Đăng nhập gần nhất {formatDateTime(account.lastLoginAt)}</span>}
        </span>
      }
    >
      <form className={styles.form} onSubmit={onSave}>
        <div className={styles.grid}>
          <TextField label="Họ tên" value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} required minLength={2} />
          <TextField label="Số điện thoại đăng nhập" type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} required />
          <Select label="Vai trò" value={draft.role} options={ROLE_OPTIONS} onChange={(v) => set('role', v)} disabled={isSelf} />
          <Select label="Trạng thái" value={draft.status} options={STATUS_OPTIONS} onChange={(v) => set('status', v)} disabled={isSelf} />
          {draft.role === 'cu_dan' && (
            <TextField
              label="Hộ liên kết (mã hộ — để trống = bỏ liên kết)"
              placeholder="VD: HK-1002"
              value={draft.householdCode}
              onChange={(e) => set('householdCode', e.target.value.toUpperCase())}
            />
          )}
        </div>
        {account.linkedHousehold && (
          <p className={styles.muted}>
            Đang liên kết: hộ {account.linkedHousehold.householdCode} · {account.linkedHousehold.address}
            {account.linkedHousehold.memberName && ` · nhân khẩu ${account.linkedHousehold.memberName}`}
          </p>
        )}
        {isSelf && <p className={styles.muted}>Đây là tài khoản của bạn — không tự đổi vai trò / khoá / đặt lại mật khẩu được.</p>}
        {messages}
        <div className={styles.actions}>
          {!isSelf && account.activated && (
            <Button type="button" variant="outline" tone="danger" icon="lock" onClick={onResetPassword} disabled={busy}>
              Đặt lại mật khẩu
            </Button>
          )}
          <Button type="submit" icon="check" disabled={busy || !dirty}>
            {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CreateAccount({ lookup, onUpdated }: Props) {
  const suggestedName = lookup.members[0]?.member.fullName ?? '';
  const [fullName, setFullName] = useState(suggestedName);
  const [role, setRole] = useState<Role>('cu_dan');
  const [householdCode, setHouseholdCode] = useState('');
  const { busy, run, messages } = useSubmit(onUpdated);

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    void run(
      () => createAccount({ phone: lookup.phone, fullName, role, householdCode: householdCode || undefined }),
      'Đã tạo tài khoản. Người dùng vào trang đăng nhập → "Xác minh qua SMS" để kích hoạt và đặt mật khẩu.',
    );
  };

  return (
    <Card title="Chưa có tài khoản đăng nhập" subtitle={`Tạo tài khoản cho số ${lookup.phone} — người dùng tự đặt mật khẩu khi đăng nhập lần đầu.`}>
      <form className={styles.form} onSubmit={onCreate}>
        <div className={styles.grid}>
          <TextField label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
          <Select label="Vai trò" value={role} options={ROLE_OPTIONS} onChange={setRole} />
          {role === 'cu_dan' && (
            <TextField
              label="Hộ liên kết (tuỳ chọn)"
              placeholder={lookup.members.length ? 'Tự liên kết nhân khẩu có số này' : 'VD: HK-1002'}
              value={householdCode}
              onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
            />
          )}
        </div>
        {messages}
        <div className={styles.actions}>
          <Button type="submit" icon="userPlus" disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
