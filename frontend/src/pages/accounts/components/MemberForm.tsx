import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { updateMember } from '@/features/accounts/accountService';
import type { UpdateMemberInput } from '@/features/accounts/types';
import type { Household } from '@/features/households/types';
import {
  GENDER_LABEL,
  RELATION_LABEL,
  RESIDENCE_STATUS_LABEL,
  RESIDENCE_STATUS_TONE,
  RESIDENT_CATEGORIES,
  RESIDENT_CATEGORY_LABEL,
} from '@/features/residents/constants';
import type { Gender, Relation, ResidenceStatus, Resident, ResidentCategory } from '@/features/residents/types';
import { ApiError } from '@/services/api';
import { changedFields } from '../diff';
import styles from '../AccountsPage.module.css';

const options = <V extends string>(labels: Record<V, string>) =>
  (Object.keys(labels) as V[]).map((value) => ({ value, label: labels[value] }));
const GENDER_OPTIONS = options<Gender>(GENDER_LABEL);
const RELATION_OPTIONS = options<Relation>(RELATION_LABEL);
const STATUS_OPTIONS = options<ResidenceStatus>(RESIDENCE_STATUS_LABEL);

interface Props {
  household: Household;
  member: Resident;
  onSaved: () => void;
}

/**
 * Sửa hồ sơ một nhân khẩu. Chỉ gửi trường đã đổi; để trống SĐT / CCCD / liên hệ khác = xoá.
 * Đổi tình trạng cư trú → backend ghi thêm lịch sử cư trú + nhật ký biến động.
 * Chủ hộ không đổi được quan hệ ở đây (chuyển chủ hộ là nghiệp vụ riêng).
 */
export function MemberForm({ household, member, onSaved }: Props) {
  const isHead = member.householdRole === 'chu_ho';
  const original = {
    fullName: member.fullName,
    phone: member.phone ?? '',
    citizenId: member.citizenId ?? '',
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    relation: member.relationToHead ?? 'khac',
    otherContact: member.otherContact ?? '',
    categories: member.categories,
    residenceStatus: member.residenceStatus,
    residenceFrom: member.residenceFrom ?? '',
    residenceTo: member.residenceTo ?? '',
  };
  const [draft, setDraft] = useState(original);
  const [residenceNote, setResidenceNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const toggleCategory = (c: ResidentCategory) =>
    set('categories', draft.categories.includes(c) ? draft.categories.filter((x) => x !== c) : [...draft.categories, c]);

  const changes = changedFields(original, draft);
  if (isHead) delete changes.relation;
  const statusChanged = 'residenceStatus' in changes;
  const temporary = draft.residenceStatus !== 'thuong_tru';
  const dirty = Object.keys(changes).length > 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const input: UpdateMemberInput = { ...changes, ...(statusChanged && residenceNote ? { residenceNote } : {}) };
      await updateMember(household.id, member.id, input);
      setNotice('Đã lưu. Thông tin được mã hoá lại và cập nhật tìm kiếm.');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={`${member.fullName} · hộ ${household.code}`}
      subtitle={
        <span className={styles.badges}>
          <Badge tone={isHead ? 'primary' : 'secondary'}>{isHead ? 'Chủ hộ' : RELATION_LABEL[member.relationToHead ?? 'khac']}</Badge>
          <Badge tone={RESIDENCE_STATUS_TONE[member.residenceStatus]}>{RESIDENCE_STATUS_LABEL[member.residenceStatus]}</Badge>
          <span className={styles.muted}>
            {household.address} · {household.areaName}
          </span>
        </span>
      }
    >
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.grid}>
          <TextField label="Họ tên" value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} required minLength={2} />
          <TextField label="Số điện thoại" type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Để trống = không có" />
          <TextField
            label="Số CCCD"
            inputMode="numeric"
            maxLength={12}
            pattern="\d{12}"
            title="12 chữ số"
            value={draft.citizenId}
            onChange={(e) => set('citizenId', e.target.value.replace(/\D/g, ''))}
            placeholder="12 chữ số — trẻ em có thể để trống"
          />
          <TextField label="Ngày sinh" type="date" value={draft.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} required />
          <Select label="Giới tính" value={draft.gender} options={GENDER_OPTIONS} onChange={(v) => set('gender', v)} />
          {isHead ? (
            <TextField label="Quan hệ với chủ hộ" value="Chủ hộ" disabled />
          ) : (
            <Select label="Quan hệ với chủ hộ" value={draft.relation} options={RELATION_OPTIONS} onChange={(v) => set('relation', v)} />
          )}
          <Select label="Tình trạng cư trú" value={draft.residenceStatus} options={STATUS_OPTIONS} onChange={(v) => set('residenceStatus', v)} />
          {temporary && (
            <>
              <TextField label="Từ ngày" type="date" value={draft.residenceFrom} onChange={(e) => set('residenceFrom', e.target.value)} required />
              <TextField label="Đến ngày" type="date" value={draft.residenceTo} onChange={(e) => set('residenceTo', e.target.value)} />
            </>
          )}
          {statusChanged && (
            <TextField
              label="Lý do / ghi chú thay đổi cư trú"
              value={residenceNote}
              onChange={(e) => setResidenceNote(e.target.value)}
              placeholder="VD: Đi làm ăn xa – TP. Hồ Chí Minh"
              maxLength={255}
            />
          )}
          <TextField
            label="Liên hệ khác"
            value={draft.otherContact}
            onChange={(e) => set('otherContact', e.target.value)}
            placeholder="Người thân, nơi làm việc…"
            maxLength={255}
          />
        </div>

        <fieldset className={styles.categories}>
          <legend>Nhóm đối tượng</legend>
          {RESIDENT_CATEGORIES.map((c) => (
            <label key={c} className={styles.chip}>
              <input type="checkbox" checked={draft.categories.includes(c)} onChange={() => toggleCategory(c)} />
              {RESIDENT_CATEGORY_LABEL[c]}
            </label>
          ))}
        </fieldset>

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
        <div className={styles.actions}>
          {dirty && (
            <Button type="button" variant="white" onClick={() => setDraft(original)} disabled={busy}>
              Huỷ thay đổi
            </Button>
          )}
          <Button type="submit" icon="check" disabled={busy || !dirty}>
            {busy ? 'Đang lưu…' : 'Lưu nhân khẩu'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
