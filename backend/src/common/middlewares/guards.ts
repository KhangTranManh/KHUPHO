import { authenticate } from './authenticate.js';
import { authorize } from './authorize.js';

/**
 * Bộ middleware dùng lại cho router. VD: `router.use(...requireStaff)`.
 *
 *   requireLogin    mọi tài khoản (cả cư dân)
 *   requireStaff    trưởng khu phố + công an khu vực — dân cư, xử lý phản ánh / SOS
 *   requireLeader   chỉ trưởng khu phố — thông báo, quỹ, cộng đồng, an sinh, tài khoản
 *   requireResident chỉ cư dân — dashboard cư dân
 */
export const requireLogin = [authenticate] as const;

export const requireStaff = [authenticate, authorize('truong_kp', 'cong_an_kv')] as const;

export const requireLeader = [authenticate, authorize('truong_kp')] as const;

export const requireResident = [authenticate, authorize('cu_dan')] as const;
