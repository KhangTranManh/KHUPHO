import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import formStyles from '@/components/ui/Form.module.css';
import { Modal } from '@/components/ui/Modal';
import { submitSurvey } from '@/features/community/communityService';
import type { Survey } from '@/features/community/types';
import { ApiError } from '@/services/api';
import styles from './Community.module.css';

interface Props {
  survey: Survey | null;
  onClose: () => void;
  onSubmitted: (survey: Survey) => void;
}

/** Trả lời khảo sát: mỗi câu chọn một phương án. */
export function SurveyModal({ survey, onClose, onSubmitted }: Props) {
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (survey) {
      setAnswers(survey.questions.map(() => undefined));
      setError(null);
    }
  }, [survey]);

  const complete = answers.length > 0 && answers.every((a) => a !== undefined);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!survey || !complete) return;
    setSaving(true);
    setError(null);
    try {
      onSubmitted(await submitSurvey(survey.id, answers as number[]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không gửi được, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={survey !== null}
      title={survey?.title ?? ''}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="white" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="survey-form" disabled={!complete || saving}>
            {saving ? 'Đang gửi…' : 'Gửi trả lời'}
          </Button>
        </>
      }
    >
      {survey && (
        <form id="survey-form" className={formStyles.form} onSubmit={onSubmit}>
          {survey.questions.map((q, qi) => (
            <fieldset key={q.id} className={styles.fieldset}>
              <legend className={styles.question}>
                {qi + 1}. {q.text}
              </legend>
              {q.options.map((opt, oi) => (
                <label key={opt} className={styles.radio}>
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[qi] === oi}
                    onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                  />
                  {opt}
                </label>
              ))}
            </fieldset>
          ))}
          {error && <p className={formStyles.error}>{error}</p>}
        </form>
      )}
    </Modal>
  );
}
