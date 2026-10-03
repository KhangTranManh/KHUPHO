import { PageState } from '@/components/ui/PageState';
import { StatCard } from '@/components/ui/StatCard';
import { getDashboardSummary } from '@/features/dashboard/dashboardService';
import { useAsync } from '@/hooks/useAsync';
import { ChangesChartCard } from './components/ChangesChartCard';
import { GroupsTableCard } from './components/GroupsTableCard';
import { GuideCard } from './components/GuideCard';
import { NoticeCard } from './components/NoticeCard';
import { PopulationTrendCard } from './components/PopulationTrendCard';
import { RecentChangesCard } from './components/RecentChangesCard';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { data, error } = useAsync(getDashboardSummary, []);

  if (!data) return <PageState error={error} />;

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        <StatCard label="Tổng nhân khẩu" icon="users" tone="primary" {...data.residents} />
        <StatCard label="Hộ gia đình" icon="home" tone="dark" {...data.households} />
        <StatCard label="Đang tạm trú" icon="mapPin" tone="info" {...data.temporaryResidents} />
        <StatCard label="Đang tạm vắng" icon="send" tone="flag" {...data.temporaryAbsent} />
      </div>

      <div className={`${styles.row} ${styles.wideLeft}`}>
        <GuideCard />
        <NoticeCard />
      </div>

      <div className={`${styles.row} ${styles.wideRight}`}>
        <ChangesChartCard monthly={data.monthlyChanges} byType={data.changesByType} />
        <PopulationTrendCard trend={data.populationTrend} />
      </div>

      <div className={`${styles.row} ${styles.wideLeft}`}>
        <GroupsTableCard groups={data.groups} />
        <RecentChangesCard changes={data.recentChanges} />
      </div>
    </div>
  );
}
