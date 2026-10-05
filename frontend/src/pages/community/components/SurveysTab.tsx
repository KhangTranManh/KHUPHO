import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageState } from '@/components/ui/PageState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getSurveys } from '@/features/community/communityService';
import { SURVEY_STATUS_LABEL, SURVEY_STATUS_TONE } from '@/features/community/constants';
import type { Survey } from '@/features/community/types';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatNumber } from '@/utils/format';
import { SurveyModal } from './SurveyModal';
import styles from './Community.module.css';

function SurveyResults({ survey }: { survey: Survey }) {
  return (
    <div className={styles.results}>
      {survey.questions.map((q, qi) => {
        const total = survey.results[qi]?.reduce((s, n) => s + n, 0) || 1;
        return (
          <div key={q.id}>
            <p className={styles.question}>{q.text}</p>
            {q.options.map((opt, oi) => {
              const n = survey.results[qi]?.[oi] ?? 0;
              return (
                <div key={opt} className={styles.option}>
                  <span>{opt}</span>
                  <span className={styles.optionCount}>
                    {formatNumber(n)} ({Math.round((n / total) * 100)}%)
                  </span>
                  <ProgressBar value={(n / total) * 100} tone="info" />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function SurveysTab() {
  const { data, error, reload } = useAsync(getSurveys, []);
  const [answering, setAnswering] = useState<Survey | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!data) return <PageState error={error} />;

  return (
    <div className={styles.stack}>
      {data.map((s) => {
        const canAnswer = s.status === 'dang_mo' && !s.hasResponded;
        return (
          <Card
            key={s.id}
            title={s.title}
            subtitle={`${formatDate(s.startDate)} – ${formatDate(s.endDate)} · ${formatNumber(s.responseCount)} lượt trả lời`}
            action={<Badge tone={SURVEY_STATUS_TONE[s.status]}>{SURVEY_STATUS_LABEL[s.status]}</Badge>}
          >
            {s.description && <p className={styles.desc}>{s.description}</p>}
            <div className={styles.actions}>
              {canAnswer && (
                <Button size="sm" icon="clipboard" onClick={() => setAnswering(s)}>
                  Tham gia khảo sát
                </Button>
              )}
              {s.hasResponded && <span className={styles.done}>Bạn đã trả lời khảo sát này.</span>}
              <Button size="sm" variant="link" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                {expanded === s.id ? 'Ẩn kết quả' : 'Xem kết quả'}
              </Button>
            </div>
            {expanded === s.id && <SurveyResults survey={s} />}
          </Card>
        );
      })}

      <SurveyModal
        survey={answering}
        onClose={() => setAnswering(null)}
        onSubmitted={(s) => {
          setAnswering(null);
          setExpanded(s.id);
          reload();
        }}
      />
    </div>
  );
}
