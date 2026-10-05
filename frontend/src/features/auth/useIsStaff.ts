import { useAuth } from './AuthContext';
import { LEADER_ROLES, STAFF_ROLES } from './constants';

/** Trưởng khu phố hoặc công an khu vực — hiện nút xử lý phản ánh / SOS. */
export function useIsStaff() {
  const { user } = useAuth();
  return !!user && STAFF_ROLES.includes(user.role);
}

/** Trưởng khu phố — hiện nút quản lý (đăng bài, thu quỹ…). */
export function useIsLeader() {
  const { user } = useAuth();
  return !!user && LEADER_ROLES.includes(user.role);
}
