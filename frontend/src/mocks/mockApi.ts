/**
 * Giả lập toàn bộ API backend khi VITE_USE_MOCK=true.
 * Mỗi nhóm nghiệp vụ một file trong handlers/; mỗi hàm tương ứng một endpoint mà service
 * trong features/* gọi khi tắt mock. Dữ liệu tạo mới chỉ tồn tại tới khi tải lại trang.
 */
import { accountHandlers } from './handlers/accounts';
import { communityHandlers } from './handlers/community';
import { dashboardHandlers } from './handlers/dashboards';
import { fundHandlers } from './handlers/funds';
import { informationHandlers } from './handlers/information';
import { populationHandlers } from './handlers/population';
import { securityHandlers } from './handlers/security';

export const mockApi = {
  ...populationHandlers,
  ...securityHandlers,
  ...informationHandlers,
  ...fundHandlers,
  ...communityHandlers,
  ...dashboardHandlers,
  ...accountHandlers,
};
