/**
 * Thống kê nhanh dữ liệu: bao nhiêu hộ, bao nhiêu người, phân theo khu vực / cư trú / nhóm đối tượng,
 * tài khoản theo vai trò, phản ánh, quỹ. Chỉ đọc, không giải mã dữ liệu cá nhân.
 *   npm run db:stats
 */
import { ageFrom } from '../../backend/src/common/utils/date.js';
import { AreaModel } from '../../backend/src/modules/areas/area.model.js';
import { FundModel } from '../../backend/src/modules/funds/fund.model.js';
import { FundPaymentModel } from '../../backend/src/modules/funds/fundPayment.model.js';
import { HouseholdModel } from '../../backend/src/modules/households/household.model.js';
import { ReportModel } from '../../backend/src/modules/reports/report.model.js';
import { UserModel } from '../../backend/src/modules/users/user.model.js';
import { runScript } from './lib/run.js';

const countBy = <T>(items: T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

const section = (title: string) => console.log(`\n■ ${title}`);

runScript(async () => {
  const households = await HouseholdModel.find()
    .select('areaId areaName householdType members.residenceStatus members.gender members.dateOfBirth members.categories')
    .lean();
  const members = households.flatMap((h) => h.members);
  const areas = await AreaModel.find().select('name housingType').lean();

  section('Tổng quan dân cư');
  console.table({
    'Khu vực': areas.length,
    'Hộ gia đình': households.length,
    'Nhân khẩu': members.length,
    'Bình quân người / hộ': households.length ? +(members.length / households.length).toFixed(2) : 0,
  });

  section('Theo khu vực');
  console.table(
    areas.map((a) => {
      const inArea = households.filter((h) => h.areaId.toString() === a._id.toString());
      const people = inArea.flatMap((h) => h.members);
      return {
        'Khu vực': a.name,
        Loại: a.housingType === 'cao_tang' ? 'Cao tầng' : 'Thấp tầng',
        Hộ: inArea.length,
        Người: people.length,
        'Tạm trú': people.filter((m) => m.residenceStatus === 'tam_tru').length,
        'Tạm vắng': people.filter((m) => m.residenceStatus === 'tam_vang').length,
      };
    }),
  );

  section('Tình trạng cư trú / giới tính / độ tuổi');
  const ageGroup = (dob: string) => {
    const age = ageFrom(dob);
    return age < 16 ? '0–15' : age < 60 ? '16–59' : '60+';
  };
  console.table({
    'Cư trú': countBy(members, (m) => m.residenceStatus),
    'Giới tính': countBy(members, (m) => m.gender),
    'Độ tuổi': countBy(members, (m) => ageGroup(m.dateOfBirth)),
  });

  section('Nhóm đối tượng (một người có thể thuộc nhiều nhóm) / loại hộ');
  console.table(countBy(members.flatMap((m) => m.categories), (c) => c));
  console.table(countBy(households, (h) => h.householdType));

  section('Tài khoản');
  const users = await UserModel.find().select('+passwordHash role status mustChangePassword residentRef').lean();
  console.table(
    ['truong_kp', 'cong_an_kv', 'cu_dan'].map((role) => {
      const list = users.filter((u) => u.role === role);
      return {
        'Vai trò': role,
        Tổng: list.length,
        'Đã kích hoạt': list.filter((u) => u.passwordHash).length,
        'Chưa kích hoạt': list.filter((u) => !u.passwordHash).length,
        'Phải đổi mật khẩu': list.filter((u) => u.mustChangePassword).length,
        'Bị khoá': list.filter((u) => u.status !== 'active').length,
        'Liên kết hộ': list.filter((u) => u.residentRef).length,
      };
    }),
  );

  section('Phản ánh & SOS');
  const reports = await ReportModel.find().select('type status').lean();
  console.table({
    'Phản ánh': countBy(reports.filter((r) => r.type !== 'sos'), (r) => r.status),
    SOS: countBy(reports.filter((r) => r.type === 'sos'), (r) => r.status),
  });

  section(`Quỹ năm ${new Date().getFullYear()} (số hộ đã đóng / ${households.length} hộ)`);
  const funds = await FundModel.find({ 'period.year': new Date().getFullYear() }).select('code name').lean();
  const paid = await FundPaymentModel.aggregate<{ _id: unknown; households: number; amount: number }>([
    { $match: { status: 'da_dong', fundId: { $in: funds.map((f) => f._id) } } },
    { $group: { _id: '$fundId', households: { $sum: 1 }, amount: { $sum: '$amount' } } },
  ]);
  console.table(
    funds.map((f) => {
      const p = paid.find((x) => String(x._id) === f._id.toString());
      return { Quỹ: f.name, 'Đã đóng (hộ)': p?.households ?? 0, 'Số tiền (đ)': p?.amount ?? 0 };
    }),
  );
});
