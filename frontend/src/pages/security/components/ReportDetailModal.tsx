import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import styles from '@/components/ui/Form.module.css';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import {
  REPORT_ACTION_LABEL,
  REPORT_CATEGORY_LABEL,
  REPORT_HANDLER_LABEL,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_TONE,
} from '@/features/reports/constants';
import { updateReport } from '@/features/reports/reportService';
import type { Report, ReportHandlerRole, ReportStatus } from '@/features/reports/types';
import { ApiError } from '@/services/api';
import { formatDateTime } from '@/utils/format';
import detail from './ReportDetail.module.css';

interface Props {
  report: Report | null;
  /** Cán bộ: hiện phần cập nhật trạng thái / giao xử lý. */
  canHandle: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Chi tiết phản ánh / SOS + lịch sử xử lý; cán bộ cập nhật ngay tại đây. */
export function ReportDetailModal({ report, canHandle, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<ReportStatus>('dang_xu_ly');
  const [handler, setHandler] = useState<ReportHandlerRole>('truong_kp');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!report) return;
    setStatus(report.status === 'moi' ? 'dang_xu_ly' : report.status);
    setHandler(report.assignedRole ?? 'truong_kp');
    setNote('');
    setError(null);
  }, [report]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setSaving(true);
    setError(null);
    try {
      await updateReport(report.id, {
        status: status !== report.status ? status : undefined,
        assignedRole: handler !== report.assignedRole ? handler : undefined,
        note: note.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={report !== null}
      title={report ? `${report.code} – ${report.title}` : ''}
      onClose={onClose}
      size="lg"
      footer={
        canHandle ? (
          <>
            <Button variant="white" onClick={onClose}>
              Đóng
            </Button>
            <Button type="submit" form="report-detail-form" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Cập nhật'}
            </Button>
          </>
        ) : (
          <Button variant="white" onClick={onClose}>
            Đóng
          </Button>
        )
      }
    >
      {report && (
        <form id="report-detail-form" className={styles.form} onSubmit={onSubmit}>
          <div className={styles.summary}>
            <strong>
              {REPORT_CATEGORY_LABEL[report.category]} · <Badge tone={REPORT_STATUS_TONE[report.status]}>{REPORT_STATUS_LABEL[report.status]}</Badge>{' '}
              {report.severity === 'khan' && <Badge tone="danger">Khẩn</Badge>}
            </strong>
            {report.description && <p>{report.description}</p>}
            <span>
              {report.location?.address ?? '—'} · Gửi lúc {formatDateTime(report.createdAt)}
            </span>
            <span>
              Người gửi: {report.reporter.name}
              {report.reporter.phone && ` – ${report.reporter.phone}`}
              {report.reporter.householdCode && ` · Hộ ${report.reporter.householdCode}`}
            </span>
            {report.images.length > 0 && (
              <div className={detail.images}>
                {report.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer">
                    <img src={src} alt="Ảnh phản ánh" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className={detail.sectionTitle}>Lịch sử xử lý</p>
            <ol className={detail.history}>
              {report.history.map((h, i) => (
                <li key={i}>
                  <span className={detail.time}>{formatDateTime(h.at)}</span>
                  <span>
                    <strong>{h.byName}</strong> — {REPORT_ACTION_LABEL[h.action]}
                    {h.toStatus && h.action !== 'tao' && `: ${REPORT_STATUS_LABEL[h.toStatus]}`}
                    {h.note && <em> · {h.note}</em>}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {canHandle && (
            <>
              <div className={styles.row}>
                <Select<ReportStatus>
                  label="Trạng thái"
                  value={status}
                  onChange={setStatus}
                  options={(Object.keys(REPORT_STATUS_LABEL) as ReportStatus[]).map((s) => ({ value: s, label: REPORT_STATUS_LABEL[s] }))}
                />
                <Select<ReportHandlerRole>
                  label="Giao xử lý"
                  value={handler}
                  onChange={setHandler}
                  options={(Object.keys(REPORT_HANDLER_LABEL) as ReportHandlerRole[]).map((v) => ({ value: v, label: REPORT_HANDLER_LABEL[v] }))}
                />
              </div>
              <TextArea label="Ghi chú (người gửi sẽ thấy)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} />
            </>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}
    </Modal>
  );
}
