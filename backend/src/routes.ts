import { Router } from 'express';
import { areasRouter } from './modules/areas/area.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { changesRouter } from './modules/changes/change.routes.js';
import { activitiesRouter, culturalFamiliesRouter, surveysRouter } from './modules/community/community.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { directoryRouter } from './modules/directory/directory.routes.js';
import { fundsRouter, paymentsRouter } from './modules/funds/fund.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { householdsRouter } from './modules/households/household.routes.js';
import { notificationsRouter } from './modules/notifications/notification.routes.js';
import { postsRouter } from './modules/posts/post.routes.js';
import { reportsRouter, sosRouter } from './modules/reports/report.routes.js';
import { residentsRouter } from './modules/residents/resident.routes.js';
import { welfareRouter } from './modules/welfare/welfare.routes.js';

/**
 * Bảng định tuyến gốc dưới /api, nhóm theo các phần dữ liệu của hệ thống.
 * Thêm module mới: tạo modules/<tên>/<tên>.routes.ts rồi mount ở đây.
 * Đường dẫn phải khớp các service ở frontend/src/features/*\/…Service.ts.
 */
export function buildApiRouter() {
  const api = Router();
  api.use('/health', healthRouter);
  api.use('/auth', authRouter);
  api.use('/dashboard', dashboardRouter);
  api.use('/notifications', notificationsRouter);

  // 1. Lõi: khu vực, hộ, nhân khẩu
  api.use('/areas', areasRouter);
  api.use('/households', householdsRouter);
  api.use('/residents', residentsRouter);
  api.use('/changes', changesRouter);

  // 3. An ninh & khẩn cấp (phản ánh và SOS cùng collection `reports`)
  api.use('/reports', reportsRouter);
  api.use('/sos', sosRouter);

  // 4. Thông báo & tuyên truyền, sổ tay phường
  api.use('/posts', postsRouter);
  api.use('/directory', directoryRouter);

  // 5. Thu quỹ
  api.use('/funds', fundsRouter);
  api.use('/payments', paymentsRouter);

  // 6. Cộng đồng
  api.use('/surveys', surveysRouter);
  api.use('/activities', activitiesRouter);
  api.use('/cultural-families', culturalFamiliesRouter);

  // An sinh: hộ chính sách / khó khăn (suy ra từ households.householdType)
  api.use('/welfare-households', welfareRouter);

  return api;
}
