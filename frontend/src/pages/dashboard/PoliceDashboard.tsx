import { PageState } from '@/components/ui/PageState';
import { StatCard } from '@/components/ui/StatCard';
import { getPoliceDashboard } from '@/features/dashboard/dashboardService';
import { useAsync } from '@/hooks/useAsync';
import { AreasTableCard } from './components/AreasTableCard';
import { AttentionCard } from './components/AttentionCard';
import { ReportBreakdownCard } from './components/ReportBreakdownCard';
import { TemporaryListCard } from './components/TemporaryListCard';
import styles from './DashboardPage.module.css';

/** Dashboard công an khu vực: SOS & phản ánh cần xử lý, theo dõi tạm trú / tạm vắng theo địa bàn. */
export function PoliceDashboard() {
  const { data, error } = useAsync(getPoliceDashboard, []);

  if (!data) return <PageState error={error} />;

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        <StatCard label="SOS chưa xử lý" icon="siren" tone="danger" value={data.openSosCount} />
        <StatCard label="Phản ánh mới" icon="shield" tone="warning" value={data.newReportCount} />
        <StatCard label="Đang tạm trú" icon="mapPin" tone="info" value={data.temporaryResidents} />
        <StatCard label="Đang tạm vắng" icon="send" tone="flag" value={data.temporaryAbsent} />
      </div>

      <div className={`${styles.row} ${styles.wideLeft}`}>
        <AttentionCard
          sos={data.openSos}
          sosCount={data.openSosCount}
          reports={data.pendingReports}
          reportCount={data.pendingReportCount}
        />
        <ReportBreakdownCard openByType={data.openByType} byStatus={data.byStatus} />
      </div>

      <div className={`${styles.row} ${styles.wideLeft}`}>
        <AreasTableCard areas={data.areas} />
        <TemporaryListCard items={data.recentTemporary} />
      </div>
    </div>
  );
}
