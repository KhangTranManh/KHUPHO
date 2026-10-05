import { PageState } from '@/components/ui/PageState';
import { StatCard } from '@/components/ui/StatCard';
import { getOfficerDashboard } from '@/features/dashboard/dashboardService';
import { useAsync } from '@/hooks/useAsync';
import { AgeGenderCard } from './components/AgeGenderCard';
import { AreasTableCard } from './components/AreasTableCard';
import { AttentionCard } from './components/AttentionCard';
import { CategoryCard } from './components/CategoryCard';
import { HousingTypeCard } from './components/HousingTypeCard';
import { RecentChangesCard } from './components/RecentChangesCard';
import styles from './DashboardPage.module.css';

/** Dashboard trưởng khu phố: toàn cảnh dân cư (thấp / cao tầng, nhóm đối tượng, độ tuổi), SOS & phản ánh, địa bàn. */
export function LeaderDashboard() {
  const { data, error } = useAsync(getOfficerDashboard, []);

  if (!data) return <PageState error={error} />;

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        <StatCard label="Hộ gia đình" icon="home" tone="primary" {...data.households} />
        <StatCard label="Nhân khẩu" icon="users" tone="dark" {...data.residents} />
        <StatCard label="Đang tạm trú" icon="mapPin" tone="info" {...data.temporaryResidents} />
        <StatCard label="Đang tạm vắng" icon="send" tone="flag" {...data.temporaryAbsent} />
      </div>

      <div className={`${styles.row} ${styles.wideLeft}`}>
        <HousingTypeCard data={data.byHousingType} />
        <CategoryCard byCategory={data.byCategory} totalResidents={data.residents.value} />
      </div>

      <div className={`${styles.row} ${styles.wideRight}`}>
        <AgeGenderCard buckets={data.byAgeGender} />
        <AttentionCard
          sos={data.openSos}
          sosCount={data.openSosCount}
          reports={data.pendingReports}
          reportCount={data.pendingReportCount}
        />
      </div>

      <div className={`${styles.row} ${styles.wideLeft}`}>
        <AreasTableCard areas={data.areas} />
        <RecentChangesCard changes={data.recentChanges} />
      </div>
    </div>
  );
}
