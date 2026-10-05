/**
 * Dữ liệu mẫu cho các phần ngoài lõi hộ / nhân khẩu: phản ánh + SOS, bài đăng, sổ tay phường,
 * quỹ, khảo sát, lịch sinh hoạt. Hộ chính sách và danh hiệu văn hoá nằm luôn trong `db.households`.
 * Sinh từ chính hộ / nhân khẩu trong `db`, seed cố định.
 */
import type { Activity, Survey } from '@/features/community/types';
import type { DirectoryEntry } from '@/features/directory/types';
import type { Fund, FundPayment, PaymentMethod } from '@/features/funds/types';
import type { HouseholdType } from '@/features/households/types';
import type { Post } from '@/features/posts/types';
import { REPORT_CATEGORIES, REPORT_CATEGORY_TYPE, defaultHandlerFor } from '@/features/reports/constants';
import type { Report, ReportCategory, ReportHistoryEntry, ReportStatus } from '@/features/reports/types';
import { addDays, ageFrom, toISODate } from '@/utils/date';
import { OFFICERS, db, personName, phoneNumber } from './db';
import { createRandom } from './random';

const r = createRandom(20261006);
const { today, households, residents, areas } = db;
const year = today.getFullYear();
const HOUR_MS = 3_600_000;

/** Thời điểm `days` ngày (+ vài giờ ngẫu nhiên) trước, dạng ISO datetime. */
const isoAgo = (days: number) => new Date(today.getTime() - days * 24 * HOUR_MS - r.int(0, 10) * HOUR_MS).toISOString();
const isoDate = (days: number) => toISODate(addDays(today, days));
const pad = (n: number, len = 4) => String(n).padStart(len, '0');

/* ---------- An sinh: gán loại hộ cho một số hộ (dữ liệu nằm trong households) ---------- */

for (const h of households) {
  const members = residents.filter((p) => p.householdId === h.id);
  const head = members.find((p) => p.householdRole === 'chu_ho');
  const elderlyAlone = members.length === 1 && head && ageFrom(head.dateOfBirth, today) >= 70;
  const roll = r.next();
  const type: HouseholdType = elderlyAlone
    ? 'kho_khan'
    : roll < 0.04
      ? 'ngheo'
      : roll < 0.08
        ? 'can_ngheo'
        : roll < 0.11
          ? 'chinh_sach'
          : 'thuong';
  h.householdType = type;
}

/* ---------- Phản ánh + SOS (cùng một danh sách) ---------- */

const REPORT_TEMPLATES: Record<Exclude<ReportCategory, 'sos'>, { title: string; description: string }[]> = {
  trom_cap: [
    { title: 'Mất trộm xe máy trước nhà', description: 'Khoảng 2h sáng, xe máy dựng trước cửa bị lấy mất. Camera nhà bên có ghi hình.' },
    { title: 'Trộm đồ trong bãi xe chung cư', description: 'Nhiều xe trong hầm bị mất gương, mũ bảo hiểm trong tuần này.' },
  ],
  lua_dao: [
    { title: 'Giả danh nhân viên điện lực thu tiền', description: 'Có người đến từng nhà yêu cầu đóng tiền "kiểm tra đồng hồ điện", không có giấy tờ.' },
    { title: 'Cuộc gọi lừa đảo giả công an', description: 'Người cao tuổi trong hẻm nhận cuộc gọi yêu cầu chuyển tiền để "xác minh tài khoản".' },
  ],
  doi_tuong_tinh_nghi: [
    { title: 'Người lạ thường xuyên đứng quan sát đầu hẻm', description: 'Hai thanh niên đi xe không biển số, đứng quan sát các nhà vào buổi tối.' },
  ],
  ngap_nuoc: [{ title: 'Ngập sâu sau mưa lớn', description: 'Nước ngập ngang gối, cống thoát nước bị nghẹt rác.' }],
  lan_chiem: [
    { title: 'Buôn bán lấn chiếm vỉa hè', description: 'Xe đẩy bán hàng chiếm hết lối đi, người đi bộ phải xuống lòng đường.' },
    { title: 'Đậu ô tô chắn lối thoát hiểm', description: 'Ô tô đậu thường xuyên chắn lối thoát hiểm phía sau toà nhà.' },
  ],
  mat_an_toan_khac: [
    { title: 'Dây điện võng thấp, có nguy cơ chập cháy', description: 'Dây điện và cáp viễn thông võng sát đầu người, có tia lửa khi trời mưa.' },
  ],
  hu_hong_dan_sinh: [
    { title: 'Đèn đường hỏng nhiều ngày', description: 'Đoạn hẻm tối hoàn toàn vào ban đêm, đã một tuần chưa sửa.' },
    { title: 'Thang máy chung cư hư', description: 'Thang máy số 2 dừng hoạt động, người cao tuổi đi lại khó khăn.' },
    { title: 'Nắp cống vỡ giữa đường', description: 'Nắp cống bị vỡ, có người đi xe máy suýt té.' },
  ],
};

const STATUSES: ReportStatus[] = ['moi', 'moi', 'dang_xu_ly', 'dang_xu_ly', 'da_xong', 'da_xong', 'da_xong'];
const SOS_MESSAGES = ['Người nhà ngã, bất tỉnh', 'Có người lạ đột nhập', 'Cháy nhỏ trong bếp', 'Người cao tuổi khó thở'];

/** Lịch sử xử lý điển hình theo trạng thái cuối. */
function historyFor(status: ReportStatus, reporterName: string, createdAt: string): ReportHistoryEntry[] {
  const officer = r.pick(OFFICERS);
  const step = (hours: number) => new Date(new Date(createdAt).getTime() + hours * HOUR_MS).toISOString();
  const h: ReportHistoryEntry[] = [{ at: createdAt, byName: reporterName, action: 'tao', toStatus: 'moi' }];
  if (status !== 'moi') h.push({ at: step(2), byName: officer, action: 'cap_nhat_trang_thai', fromStatus: 'moi', toStatus: 'dang_xu_ly', note: 'Đã tiếp nhận, đang xác minh' });
  if (status === 'da_xong') h.push({ at: step(30), byName: officer, action: 'cap_nhat_trang_thai', fromStatus: 'dang_xu_ly', toStatus: 'da_xong', note: 'Đã kiểm tra hiện trường và xử lý xong' });
  return h;
}

function makeReport(i: number, category: ReportCategory): Report {
  const reporter = r.pick(residents.filter((p) => p.phone));
  const household = households.find((h) => h.id === reporter.householdId)!;
  const isSos = category === 'sos';
  const status = isSos ? r.pick<ReportStatus>(['moi', 'dang_xu_ly', 'da_xong', 'da_xong']) : r.pick(STATUSES);
  const createdAt = isSos ? isoAgo(r.int(0, 10)) : isoAgo(r.int(0, 45));
  const template = isSos ? { title: 'SOS khẩn cấp', description: r.pick(SOS_MESSAGES) } : r.pick(REPORT_TEMPLATES[category]);
  const history = historyFor(status, reporter.fullName, createdAt);
  return {
    id: `rp${i + 1}`,
    code: `${isSos ? 'SOS' : 'PA'}-${year}-${pad(i + 1)}`,
    type: REPORT_CATEGORY_TYPE[category],
    category,
    severity: isSos || r.chance(0.2) ? 'khan' : 'thuong',
    title: template.title,
    description: template.description,
    images: [],
    location: {
      address: household.address,
      point: household.location && { type: 'Point', coordinates: [household.location.lng, household.location.lat] },
    },
    reporter: { name: reporter.fullName, phone: reporter.phone, householdCode: household.code },
    status,
    assignedRole: defaultHandlerFor(category),
    assignee: status === 'moi' ? undefined : { name: history[1]?.byName },
    resolvedAt: status === 'da_xong' ? history.at(-1)!.at : undefined,
    history,
    createdAt,
    updatedAt: history.at(-1)!.at,
  };
}

export const reports: Report[] = [
  ...Array.from({ length: 24 }, (_, i) => makeReport(i, r.pick(REPORT_CATEGORIES))),
  ...Array.from({ length: 6 }, (_, i) => makeReport(24 + i, 'sos')),
].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* ---------- Bài đăng (thông báo nhanh, tuyên truyền, sự kiện) ---------- */

const post = (
  id: number,
  p: Pick<Post, 'kind' | 'category' | 'title' | 'content'> & Partial<Post> & { daysAgo: number },
): Post => ({
  id: `po${id}`,
  attachments: [],
  audience: { scope: 'all' },
  pinned: false,
  author: { name: r.pick(OFFICERS) },
  publishedAt: isoAgo(p.daysAgo),
  readCount: r.int(10, 140),
  isRead: r.chance(0.4),
  ...p,
});

const blockAreaIds = areas.filter((a) => a.housingType === 'cao_tang').map((a) => a.id);

export const posts: Post[] = [
  post(1, { kind: 'thong_bao_nhanh', category: 'cup_dien', title: 'Lịch cúp điện bảo trì lưới điện', content: 'Điện lực thông báo tạm ngưng cấp điện để bảo trì đường dây. Bà con chủ động sắp xếp sinh hoạt.', eventDate: isoDate(3), eventTime: '07:30 – 16:00', location: 'Tổ 1, Tổ 2', pinned: true, daysAgo: 1 }),
  post(2, { kind: 'thong_bao_nhanh', category: 'rac', title: 'Thay đổi giờ thu gom rác', content: 'Từ tuần sau, xe thu gom rác đi qua khu phố lúc 18:00 – 19:30 hằng ngày. Đề nghị bỏ rác đúng giờ, phân loại rác tái chế.', eventTime: '18:00 – 19:30', daysAgo: 2 }),
  post(3, { kind: 'thong_bao_nhanh', category: 'pccc', title: 'Diễn tập phòng cháy chữa cháy chung cư', content: 'Diễn tập PCCC và thoát nạn tại chung cư. Cư dân nghe hiệu lệnh còi và di chuyển theo hướng dẫn.', eventDate: isoDate(7), eventTime: '08:00 – 10:00', location: 'Chung cư Hoà Bình', audience: { scope: 'area', areaIds: blockAreaIds }, pinned: true, daysAgo: 3 }),
  post(4, { kind: 'thong_bao_nhanh', category: 'tiem_chung', title: 'Tiêm chủng mở rộng cho trẻ dưới 5 tuổi', content: 'Trạm y tế phường tổ chức tiêm chủng mở rộng. Phụ huynh mang theo sổ tiêm chủng.', eventDate: isoDate(10), eventTime: '07:30 – 11:00', location: 'Trạm y tế phường', audience: { scope: 'group', categories: ['tre_em'] }, daysAgo: 4 }),
  post(5, { kind: 'thong_bao_nhanh', category: 'kham_suc_khoe', title: 'Khám sức khoẻ định kỳ cho người cao tuổi', content: 'Hội Người cao tuổi phối hợp trạm y tế khám, đo huyết áp, đường huyết miễn phí.', eventDate: isoDate(14), eventTime: '07:00 – 11:00', location: 'Nhà văn hoá khu phố', audience: { scope: 'group', categories: ['nguoi_cao_tuoi'] }, attachments: [{ name: 'Danh sách khám theo tổ.pdf', url: '#' }], daysAgo: 5 }),
  post(6, { kind: 'su_kien', category: 'le_hoi', title: 'Vui Tết Trung thu cho thiếu nhi', content: 'Chương trình văn nghệ, rước đèn, phát quà cho các cháu thiếu nhi trong khu phố.', eventDate: isoDate(20), eventTime: '18:30 – 21:00', location: 'Sân nhà văn hoá', daysAgo: 6 }),
  post(7, { kind: 'su_kien', category: 'le_hoi', title: 'Khai mạc sinh hoạt hè thiếu nhi', content: 'Các lớp năng khiếu, bơi lội, kỹ năng sống trong dịp hè. Đăng ký tại văn phòng khu phố.', location: 'Nhà văn hoá khu phố', daysAgo: 40 }),
  post(8, { kind: 'tuyen_truyen', category: 'chinh_sach', title: 'Luật Cư trú: những điểm cần biết khi đăng ký tạm trú', content: 'Công dân đến ở trên 30 ngày phải đăng ký tạm trú. Có thể đăng ký trực tuyến qua Cổng dịch vụ công hoặc ứng dụng VNeID.', daysAgo: 8 }),
  post(9, { kind: 'tuyen_truyen', category: 'phong_dich', title: 'Phòng chống sốt xuất huyết mùa mưa', content: 'Diệt lăng quăng, đậy kín dụng cụ chứa nước, ngủ màn. Có dấu hiệu sốt cao cần đến cơ sở y tế ngay.', daysAgo: 9 }),
  post(10, { kind: 'tuyen_truyen', category: 'pccc', title: 'An toàn cháy nổ khi sạc xe điện', content: 'Không sạc xe điện qua đêm trong nhà, không để xe gần lối thoát hiểm; trang bị bình chữa cháy.', pinned: true, daysAgo: 12 }),
  post(11, { kind: 'tuyen_truyen', category: 'van_dong_quy', title: 'Vận động ủng hộ Quỹ Khuyến học', content: 'Khu phố vận động đóng góp Quỹ Khuyến học để trao học bổng cho học sinh có hoàn cảnh khó khăn.', daysAgo: 18 }),
  post(12, { kind: 'tuyen_truyen', category: 'chinh_sach', title: 'Hội Cựu chiến binh: lịch sinh hoạt định kỳ', content: 'Hội CCB khu phố sinh hoạt định kỳ ngày 27 hằng tháng tại nhà văn hoá.', audience: { scope: 'group', categories: ['cuu_chien_binh'] }, daysAgo: 20 }),
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

/* ---------- Sổ tay phường ---------- */

let order = 0;
const entry = (group: DirectoryEntry['group'], unit: string, phone: string, personInCharge?: string, note?: string): DirectoryEntry => ({
  id: `dr${++order}`,
  group,
  unit,
  phone,
  personInCharge,
  note,
  order,
});

export const directory: DirectoryEntry[] = [
  entry('khan_cap', 'Công an (cấp cứu an ninh)', '113'),
  entry('khan_cap', 'Cứu hoả – Cảnh sát PCCC', '114'),
  entry('khan_cap', 'Cấp cứu y tế', '115'),
  entry('chinh_quyen', 'UBND phường', phoneNumber(r), undefined, 'Giờ hành chính'),
  entry('chinh_quyen', 'Công an khu vực', phoneNumber(r), personName(r, 'nam')),
  entry('chinh_quyen', 'Trạm y tế phường', phoneNumber(r)),
  entry('khu_pho', 'Trưởng khu phố', phoneNumber(r), personName(r, 'nam')),
  entry('khu_pho', 'Bí thư Chi bộ', phoneNumber(r), personName(r, 'nam')),
  entry('khu_pho', 'Bí thư Chi đoàn', phoneNumber(r), personName(r, 'nu')),
  entry('doan_the', 'Hội Cựu chiến binh', phoneNumber(r), personName(r, 'nam')),
  entry('doan_the', 'Hội Khuyến học', phoneNumber(r), personName(r, 'nu')),
  entry('doan_the', 'Hội Người cao tuổi', phoneNumber(r), personName(r, 'nam')),
  entry('doan_the', 'Hội Liên hiệp Phụ nữ', phoneNumber(r), personName(r, 'nu')),
];

/* ---------- Quỹ ---------- */

/** Bản demo không gắn tài khoản ngân hàng (bank) để tránh tạo QR trỏ tới tài khoản không có thật. */
export const funds: Fund[] = [
  { code: 'PCTT', name: 'Phòng chống thiên tai', defaultAmount: null, unit: 'ho', description: 'Đóng theo quy định, mức tuỳ thu nhập lao động' },
  { code: 'VI-NGUOI-NGHEO', name: 'Vì người nghèo', defaultAmount: 45_000, unit: 'ho' },
  { code: 'BIEN-DAO', name: 'Vì biển đảo quê hương', defaultAmount: 15_000, unit: 'ho' },
  { code: 'TUYEN-DAU', name: 'Vì tuyến đầu Tổ quốc', defaultAmount: 15_000, unit: 'ho' },
  { code: 'KHUYEN-HOC', name: 'Khuyến học', defaultAmount: 20_000, unit: 'ho' },
  { code: 'THIEU-NHI', name: 'Tết Thiếu nhi & Trung thu', defaultAmount: 35_000, unit: 'ho' },
  { code: 'PHONG-DICH', name: 'Phòng chống dịch', defaultAmount: 15_000, unit: 'ho' },
  { code: 'THAM-HOI', name: 'Thăm hỏi người khó khăn, đau bệnh', defaultAmount: 50_000, unit: 'ho' },
].map((f, i): Fund => ({
  id: `fd${i + 1}`,
  ...f,
  unit: f.unit as Fund['unit'],
  period: { type: 'nam', year },
  dueDate: `${year}-12-31`,
  status: 'mo',
}));

const METHODS: PaymentMethod[] = ['qr', 'qr', 'qr', 'tien_mat'];

export const fundPayments: FundPayment[] = funds.flatMap((fund) => {
  const rate = r.next() * 0.45 + 0.3; // 30–75% hộ đã đóng
  return households
    .filter(() => r.next() < rate)
    .map((h, i): FundPayment => {
      const method = r.pick(METHODS);
      return {
        id: `fp-${fund.id}-${i}`,
        fundId: fund.id,
        householdId: h.id,
        householdCode: h.code,
        amount: fund.defaultAmount ?? r.pick([20_000, 50_000, 100_000]),
        status: 'da_dong',
        method,
        transactionCode: method === 'qr' ? `FT${r.int(10_000_000, 99_999_999)}` : undefined,
        paidAt: isoAgo(r.int(1, 120)),
        confirmedBy: { name: r.pick(OFFICERS) },
      };
    });
});

/* ---------- Khảo sát, lịch sinh hoạt ---------- */

const surveyResults = (questions: Survey['questions'], responses: number) =>
  questions.map((q) => {
    const counts = q.options.map(() => 0);
    for (let i = 0; i < responses; i++) counts[r.int(0, q.options.length - 1)]++;
    return counts;
  });

const makeSurvey = (s: Omit<Survey, 'results' | 'hasResponded' | 'responseCount'> & { responses: number }): Survey => ({
  ...s,
  responseCount: s.responses,
  results: surveyResults(s.questions, s.responses),
  hasResponded: false,
});

export const surveys: Survey[] = [
  makeSurvey({
    id: 'sv1',
    title: 'Khảo sát mức độ hài lòng về vệ sinh môi trường',
    description: 'Ý kiến của bà con giúp khu phố cải thiện thu gom rác và vệ sinh hẻm.',
    status: 'dang_mo',
    startDate: isoDate(-10),
    endDate: isoDate(20),
    scope: { type: 'all' },
    responses: 84,
    questions: [
      { id: 'q1', text: 'Bạn đánh giá việc thu gom rác hiện nay thế nào?', options: ['Rất tốt', 'Tốt', 'Bình thường', 'Chưa tốt'] },
      { id: 'q2', text: 'Giờ thu gom rác phù hợp nhất với gia đình bạn?', options: ['Sáng sớm', 'Chiều tối', 'Tối muộn'] },
    ],
  }),
  makeSurvey({
    id: 'sv2',
    title: 'Lấy ý kiến lắp camera an ninh các tuyến hẻm',
    status: 'dang_mo',
    startDate: isoDate(-5),
    endDate: isoDate(25),
    scope: { type: 'area', areaIds: areas.filter((a) => a.housingType === 'thap_tang').map((a) => a.id) },
    responses: 61,
    questions: [
      { id: 'q1', text: 'Bạn có đồng ý lắp camera an ninh tại đầu các hẻm?', options: ['Đồng ý', 'Không đồng ý', 'Ý kiến khác'] },
      { id: 'q2', text: 'Bạn sẵn sàng đóng góp kinh phí lắp đặt?', options: ['Có', 'Không', 'Tuỳ mức đóng góp'] },
    ],
  }),
  makeSurvey({
    id: 'sv3',
    title: 'Đăng ký tham gia sinh hoạt hè cho thiếu nhi',
    status: 'da_dong',
    startDate: isoDate(-80),
    endDate: isoDate(-50),
    scope: { type: 'all' },
    responses: 47,
    questions: [{ id: 'q1', text: 'Lớp năng khiếu cháu muốn tham gia?', options: ['Vẽ', 'Bơi lội', 'Võ thuật', 'Kỹ năng sống'] }],
  }),
];

export const activities: Activity[] = (
  [
    { title: 'Họp khu phố định kỳ quý IV', kind: 'hop_khu_pho', days: 5, startTime: '19:30', endTime: '21:00', location: 'Nhà văn hoá khu phố', organizer: 'Ban điều hành khu phố', content: 'Tổng kết quý III, triển khai kế hoạch quý IV, thu quỹ dân sinh.' },
    { title: 'Ngày Chủ nhật xanh – dọn vệ sinh hẻm', kind: 'tinh_nguyen', days: 9, startTime: '06:30', endTime: '09:00', location: 'Các tuyến hẻm Tổ 1 – Tổ 4', organizer: 'Chi đoàn khu phố' },
    { title: 'Tập huấn kỹ năng thoát nạn khi cháy', kind: 'tap_huan', days: 12, startTime: '08:00', endTime: '10:30', location: 'Sảnh Chung cư Hoà Bình', organizer: 'Công an phường' },
    { title: 'Giải bóng chuyền hơi người cao tuổi', kind: 'the_thao', days: 16, startTime: '16:00', location: 'Sân nhà văn hoá', organizer: 'Hội Người cao tuổi' },
    { title: 'Đêm hội Trăng rằm', kind: 'le_hoi', days: 20, startTime: '18:30', endTime: '21:00', location: 'Sân nhà văn hoá', organizer: 'Ban điều hành khu phố' },
    { title: 'Họp bình xét gia đình văn hoá', kind: 'hop_khu_pho', days: -12, startTime: '19:30', location: 'Nhà văn hoá khu phố', organizer: 'Ban điều hành khu phố', minutes: 'Thống nhất danh sách đề nghị công nhận gia đình văn hoá; 3 hộ chưa đạt do vi phạm vệ sinh môi trường.' },
    { title: 'Họp triển khai lắp camera an ninh', kind: 'hop_khu_pho', days: -30, startTime: '19:30', location: 'Nhà văn hoá khu phố', organizer: 'Ban điều hành khu phố', minutes: 'Đa số đồng ý lắp camera đầu hẻm; giao Trưởng KP lấy ý kiến bằng khảo sát.' },
  ] as const
).map((a, i): Activity => ({
  id: `ac${i + 1}`,
  title: a.title,
  kind: a.kind,
  date: isoDate(a.days),
  startTime: a.startTime,
  endTime: 'endTime' in a ? a.endTime : undefined,
  location: a.location,
  organizer: a.organizer,
  content: 'content' in a ? a.content : undefined,
  minutes: 'minutes' in a ? a.minutes : undefined,
}));

/* ---------- Danh hiệu văn hoá năm nay (nằm trong households.culturalTitles) ---------- */

for (const h of households) {
  const roll = r.next();
  h.culturalTitles.push({ year, result: roll < 0.7 ? 'dat' : roll < 0.9 ? 'dang_binh_xet' : 'chua_dat' });
}
