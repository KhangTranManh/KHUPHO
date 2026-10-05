import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import styles from '@/components/ui/Form.module.css';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { getAreas } from '@/features/households/householdService';
import { AUDIENCE_SCOPE_LABEL, POST_CATEGORIES, POST_CATEGORY_LABEL, POST_KINDS, POST_KIND_LABEL } from '@/features/posts/constants';
import { createPost } from '@/features/posts/postService';
import type { CreatePostInput, PostAudience } from '@/features/posts/types';
import { RESIDENT_CATEGORIES, RESIDENT_CATEGORY_LABEL } from '@/features/residents/constants';
import type { ResidentCategory } from '@/features/residents/types';
import { useAsync } from '@/hooks/useAsync';
import { ApiError } from '@/services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY: CreatePostInput = { kind: 'thong_bao_nhanh', category: 'rac', title: '', content: '', pinned: false };

/** Cán bộ đăng bài: loại, danh mục, nội dung, lịch, đối tượng nhận. */
export function PostFormModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreatePostInput>(EMPTY);
  const [audience, setAudience] = useState<PostAudience>({ scope: 'all' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const areas = useAsync(() => (open ? getAreas() : Promise.resolve([])), [open]);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setAudience({ scope: 'all' });
      setError(null);
    }
  }, [open]);

  const set = <K extends keyof CreatePostInput>(key: K, value: CreatePostInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggle = <T extends string>(list: T[] | undefined, value: T) =>
    list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Bỏ các trường tuỳ chọn để trống.
      const input = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== undefined),
      ) as unknown as CreatePostInput;
      await createPost({ ...input, audience });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đăng được, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Đăng bài"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="white" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="post-form" icon="megaphone" disabled={saving}>
            {saving ? 'Đang đăng…' : 'Đăng bài'}
          </Button>
        </>
      }
    >
      <form id="post-form" className={styles.form} onSubmit={onSubmit}>
        <div className={styles.row}>
          <Select label="Loại bài" value={form.kind} onChange={(v) => set('kind', v)} options={POST_KINDS.map((k) => ({ value: k, label: POST_KIND_LABEL[k] }))} />
          <Select label="Danh mục" value={form.category} onChange={(v) => set('category', v)} options={POST_CATEGORIES.map((c) => ({ value: c, label: POST_CATEGORY_LABEL[c] }))} />
        </div>
        <TextField label="Tiêu đề" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} required />
        <TextArea label="Nội dung" rows={6} value={form.content} onChange={(e) => set('content', e.target.value)} maxLength={10_000} required />
        <div className={styles.row}>
          <TextField label="Ngày diễn ra" type="date" value={form.eventDate ?? ''} onChange={(e) => set('eventDate', e.target.value)} />
          <TextField label="Thời gian" placeholder="VD: 07:30 – 11:00" value={form.eventTime ?? ''} onChange={(e) => set('eventTime', e.target.value)} />
        </div>
        <TextField label="Địa điểm" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} />

        <Select<PostAudience['scope']>
          label="Đối tượng nhận"
          value={audience.scope}
          onChange={(scope) => setAudience({ scope })}
          options={(Object.keys(AUDIENCE_SCOPE_LABEL) as PostAudience['scope'][]).map((s) => ({ value: s, label: AUDIENCE_SCOPE_LABEL[s] }))}
        />
        {audience.scope === 'area' && (
          <div className={styles.checks}>
            {(areas.data ?? []).map((a) => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  checked={!!audience.areaIds?.includes(a.id)}
                  onChange={() => setAudience((x) => ({ ...x, areaIds: toggle(x.areaIds, a.id) }))}
                />
                {a.name}
              </label>
            ))}
          </div>
        )}
        {audience.scope === 'group' && (
          <div className={styles.checks}>
            {RESIDENT_CATEGORIES.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={!!audience.categories?.includes(c)}
                  onChange={() => setAudience((x) => ({ ...x, categories: toggle<ResidentCategory>(x.categories, c) }))}
                />
                {RESIDENT_CATEGORY_LABEL[c]}
              </label>
            ))}
          </div>
        )}

        <Switch label="Ghim lên đầu trang" checked={!!form.pinned} onChange={(v) => set('pinned', v)} />
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </Modal>
  );
}
