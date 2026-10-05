import { useAuth } from '@/features/auth/AuthContext';
import { LeaderDashboard } from './LeaderDashboard';
import { PoliceDashboard } from './PoliceDashboard';
import { ResidentDashboard } from './ResidentDashboard';

/** Trang chủ: mỗi vai trò một dashboard riêng. */
export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'cong_an_kv') return <PoliceDashboard />;
  if (user.role === 'cu_dan') return <ResidentDashboard />;
  return <LeaderDashboard />;
}
