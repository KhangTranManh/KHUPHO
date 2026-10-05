/**
 * Đăng ký mọi model với mongoose — dùng cho script đồng bộ index và test.
 * Thêm model mới: import thêm ở đây. Mô tả chi tiết: database/README.md.
 */
// 1. Lõi
import './modules/areas/area.model.js';
import './modules/households/household.model.js'; // nhúng members, culturalTitles
import './modules/changes/residentChange.model.js';
// 2. Người dùng
import './modules/users/user.model.js';
import './modules/auth/session.model.js';
// 3. An ninh & khẩn cấp
import './modules/reports/report.model.js';
// 4. Thông báo & tuyên truyền
import './modules/posts/post.model.js';
import './modules/posts/postRead.model.js';
import './modules/directory/directory.model.js';
import './modules/notifications/notification.model.js';
// 5. Thu quỹ
import './modules/funds/fund.model.js';
import './modules/funds/fundPayment.model.js';
// 6. Cộng đồng
import './modules/community/survey.model.js';
import './modules/community/surveyResponse.model.js';
import './modules/community/activity.model.js';
// Hạ tầng
import './common/db/counter.model.js';
