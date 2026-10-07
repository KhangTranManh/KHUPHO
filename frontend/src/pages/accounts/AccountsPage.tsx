import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PageState } from '@/components/ui/PageState';
import { TextField } from '@/components/ui/TextField';
import { lookupPhone } from '@/features/accounts/accountService';
import type { PhoneLookup } from '@/features/accounts/types';
import { ApiError } from '@/services/api';
import { AccountForm } from './components/AccountForm';
import { MemberForm } from './components/MemberForm';
import styles from './AccountsPage.module.css';

/**
 * Quản lý tài khoản (chỉ Trưởng KP): nhập một SĐT → xem tài khoản đăng nhập và các nhân khẩu ghi SĐT đó → sửa.
 * SĐT tra cứu nằm trên URL (?phone=) — tải lại trang / gửi link vẫn mở đúng người.
 * Mọi thay đổi do backend mã hoá + băm lại (họ tên, SĐT, CCCD, token tìm kiếm).
 */
export function AccountsPage() {
  const [params, setParams] = useSearchParams();
  const phone = params.get('phone') ?? '';
  const [input, setInput] = useState(phone);
  const [result, setResult] = useState<PhoneLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: string) => {
    if (!p) return setResult(null);
    setLoading(true);
    setError(null);
    try {
      setResult(await lookupPhone(p));
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : 'Không tra cứu được, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setInput(phone);
    void load(phone);
  }, [phone, load]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const p = input.trim();
    if (p === phone) void load(p);
    else setParams(p ? { phone: p } : {});
  };

  /** Sau khi lưu: backend trả kết quả mới; nếu SĐT tài khoản đổi thì chuyển URL sang số mới. */
  const onUpdated = (next: PhoneLookup) => {
    setResult(next);
    if (next.phone !== phone) setParams({ phone: next.phone }, { replace: true });
  };

  return (
    <div className={styles.page}>
      <Card title="Tra cứu theo số điện thoại" subtitle="Xem và sửa tài khoản đăng nhập cùng hồ sơ nhân khẩu ghi số điện thoại này">
        <form className={styles.search} onSubmit={onSearch}>
          <TextField
            icon="phone"
            type="tel"
            inputMode="tel"
            placeholder="VD: 0912345678"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Số điện thoại"
            required
            autoFocus
          />
          <Button type="submit" icon="search" disabled={loading}>
            {loading ? 'Đang tra…' : 'Tra cứu'}
          </Button>
        </form>
        {error && (
          <p className={styles.error} role="alert">
            <Icon name="minusCircle" size={16} /> {error}
          </p>
        )}
      </Card>

      {loading && !result && <PageState />}

      {result && (
        <>
          <AccountForm key={`${result.account?.id ?? 'new'}-${result.phone}`} lookup={result} onUpdated={onUpdated} />

          <section className={styles.members}>
            <h6 className={styles.sectionTitle}>Nhân khẩu ghi số {result.phone}</h6>
            {result.members.length === 0 ? (
              <p className={styles.empty}>Không có nhân khẩu nào ghi số điện thoại này trong hồ sơ hộ.</p>
            ) : (
              result.members.map(({ household, member }) => (
                <MemberForm
                  key={member.id}
                  household={household}
                  member={member}
                  onSaved={() => void load(result.phone)}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
