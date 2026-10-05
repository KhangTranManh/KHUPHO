import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import styles from '@/components/ui/Form.module.css';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABEL,
  REPORT_CATEGORY_TYPE,
  REPORT_HANDLER_LABEL,
  REPORT_SEVERITY_LABEL,
  REPORT_TYPE_LABEL,
  defaultHandlerFor,
} from '@/features/reports/constants';
import { createReport } from '@/features/reports/reportService';
import type { CreateReportInput, ReportHandlerRole, ReportSeverity, ReportType } from '@/features/reports/types';
import { ApiError } from '@/services/api';

interface Props {
  /** Loại được chọn từ "nút báo"; null = đóng. */
  type: Exclude<ReportType, 'sos'> | null;
  onClose: () => void;
  onCreated: () => void;
}

type Category = CreateReportInput['category'];

const firstCategoryOf = (type: ReportType) => REPORT_CATEGORIES.find((c) => REPORT_CATEGORY_TYPE[c] === type)!;

const empty = (type: ReportType): CreateReportInput => {
  const category = firstCategoryOf(type);
  return { category, severity: 'thuong', title: '', description: '', address: '', assignedRole: defaultHandlerFor(category), reporterPhone: '' };
};

/** Form phản ánh — mọi vai trò đều gửi được. Người gửi / hộ lấy từ tài khoản. */
export function ReportFormModal({ type, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateReportInput>(empty('an_ninh'));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (type) {
      setForm(empty(type));
      setError(null);
    }
  }, [type]);

  const set = <K extends keyof CreateReportInput>(key: K, value: CreateReportInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onCategory = (category: Category) => setForm((f) => ({ ...f, category, assignedRole: defaultHandlerFor(category) }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createReport({ ...form, reporterPhone: form.reporterPhone?.trim() || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được phản ánh, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={type !== null}
      title="Gửi phản ánh"
      onClose={onClose}
      footer={
        <>
          <Button variant="white" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="report-form" icon="send" disabled={submitting}>
            {submitting ? 'Đang gửi…' : 'Gửi phản ánh'}
          </Button>
        </>
      }
    >
      <form id="report-form" className={styles.form} onSubmit={onSubmit}>
        <div className={styles.row}>
          <Select<Category>
            label="Loại phản ánh"
            value={form.category}
            onChange={onCategory}
            options={REPORT_CATEGORIES.map((c) => ({
              value: c,
              label: `${REPORT_TYPE_LABEL[REPORT_CATEGORY_TYPE[c]]} – ${REPORT_CATEGORY_LABEL[c]}`,
            }))}
          />
          <Select<ReportSeverity>
            label="Mức độ"
            value={form.severity}
            onChange={(v) => set('severity', v)}
            options={(Object.keys(REPORT_SEVERITY_LABEL) as ReportSeverity[]).map((v) => ({ value: v, label: REPORT_SEVERITY_LABEL[v] }))}
          />
        </div>
        <Select<ReportHandlerRole>
          label="Gửi tới"
          value={form.assignedRole ?? 'truong_kp'}
          onChange={(v) => set('assignedRole', v)}
          options={(Object.keys(REPORT_HANDLER_LABEL) as ReportHandlerRole[]).map((v) => ({ value: v, label: REPORT_HANDLER_LABEL[v] }))}
        />
        <TextField label="Tiêu đề" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={150} required />
        <TextArea
          label="Mô tả sự việc"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Thời gian, diễn biến, đặc điểm nhận dạng (nếu có)…"
          maxLength={2000}
          required
        />
        <div className={styles.row}>
          <TextField label="Địa điểm" icon="mapPin" value={form.address} onChange={(e) => set('address', e.target.value)} required />
          <TextField
            label="SĐT liên hệ (tuỳ chọn)"
            icon="phone"
            type="tel"
            value={form.reporterPhone ?? ''}
            onChange={(e) => set('reporterPhone', e.target.value)}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </Modal>
  );
}
