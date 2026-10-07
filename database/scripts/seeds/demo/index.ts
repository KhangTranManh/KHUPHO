/**
 * Bước 5 (tuỳ chọn) — dữ liệu mẫu cho toàn bộ hệ thống, sinh có seed cố định (giống nhau mỗi lần).
 *   npm run db:setup -- --demo
 * Chỉ chạy khi DB chưa có hộ nào — không trộn dữ liệu mẫu vào dữ liệu thật.
 * Cần tài khoản trưởng KP + công an KV (bước users) để làm tác giả / người xử lý.
 */
import { HouseholdModel } from '../../../../backend/src/modules/households/household.model.js';
import { UserModel } from '../../../../backend/src/modules/users/user.model.js';
import { createRandom } from '../../lib/random.js';
import { step } from '../../lib/run.js';
import { firstLoginAccounts, linkResidentAccounts } from '../users.js';
import { seedActivities, seedFundPayments, seedPosts, seedReports, seedSurveys, type Actor } from './community.js';
import { seedPopulation } from './population.js';

const SEED = 20261005;

async function actor(filter: Record<string, unknown>): Promise<Actor | undefined> {
  const user = await UserModel.findOne(filter).sort({ createdAt: 1 });
  return user ? { _id: user._id, name: user.get('fullName') as string } : undefined;
}

export async function seedDemo() {
  if (await HouseholdModel.exists({})) {
    step('Dữ liệu mẫu', 'bỏ qua — DB đã có hộ gia đình');
    return;
  }
  const leader = await actor({ role: 'truong_kp' });
  const police = await actor({ role: 'cong_an_kv' });
  if (!leader || !police) throw new Error('Cần tài khoản trưởng KP và công an KV trước khi tạo dữ liệu mẫu');

  const r = createRandom(SEED);
  const today = new Date();

  const residentPhones = firstLoginAccounts()
    .filter((a) => a.role === 'cu_dan')
    .map((a) => a.phone);
  const { areas, households, changeCount } = await seedPopulation(r, today, leader.name, residentPhones);
  const memberCount = households.reduce((n, h) => n + h.members.length, 0);
  step('Khu vực', areas.length);
  step('Hộ gia đình / nhân khẩu', `${households.length} hộ, ${memberCount} người`);
  step('Biến động dân cư', changeCount);

  await linkResidentAccounts();
  const resident = await actor({ role: 'cu_dan', 'residentRef.householdId': households[0]._id });

  const ctx = { r, today, households, leader, police, resident };
  step('Phản ánh & SOS', await seedReports(ctx));
  step('Bài đăng', await seedPosts(ctx));
  const fund = await seedFundPayments(ctx);
  step('Khoản đóng quỹ', `${fund.payments} khoản / ${fund.funds} quỹ`);
  const survey = await seedSurveys(ctx);
  step('Khảo sát', `${survey.surveys} khảo sát, ${survey.responses} trả lời`);
  step('Lịch sinh hoạt', await seedActivities(ctx));
}
