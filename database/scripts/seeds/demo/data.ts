/**
 * Danh mục cố định cho dữ liệu mẫu: tên người, địa bàn, nội dung phản ánh / bài đăng / khảo sát…
 * Sửa dữ liệu mẫu → sửa ở đây; logic sinh dữ liệu nằm ở population.ts và community.ts.
 */

export const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
export const MIDDLE = {
  nam: ['Văn', 'Minh', 'Quốc', 'Đức', 'Hữu', 'Thanh', 'Gia', 'Công'],
  nu: ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Kim', 'Mai', 'Bích', 'Hồng'],
} as const;
export const GIVEN = {
  nam: ['An', 'Bảo', 'Cường', 'Dũng', 'Hải', 'Hoàng', 'Khang', 'Long', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Tài', 'Thắng', 'Trung', 'Vinh', 'Tuấn', 'Hiếu'],
  nu: ['Anh', 'Châu', 'Diệp', 'Giang', 'Hà', 'Hạnh', 'Hương', 'Lan', 'Linh', 'My', 'Ngân', 'Nhung', 'Phương', 'Quyên', 'Thảo', 'Trang', 'Vy', 'Yến'],
} as const;
export const PHONE_PREFIXES = ['090', '091', '093', '094', '096', '097', '098', '086', '088', '070', '077', '079', '081'];
export const WORKPLACES = ['Công ty may Việt Tiến', 'Bệnh viện quận', 'Trường THCS Lê Lợi', 'Chợ Bến Thành', 'KCN Tân Bình'];
export const STAY_NOTES = ['Thuê trọ đi làm', 'Thuê trọ đi học', 'Ở nhờ nhà người thân'];
export const ABSENCE_NOTES = ['Đi làm ăn xa – TP. Hồ Chí Minh', 'Đi học – Hà Nội', 'Điều trị bệnh – Đà Nẵng'];

/** Toạ độ trung tâm khu phố mẫu — rải toạ độ các hộ quanh điểm này. */
export const CENTER = { lat: 10.7769, lng: 106.7009 };

/** Tuổi phân nhóm đối tượng. */
export const CHILD_AGE = 16;
export const ELDERLY_AGE = 60;

/** Địa bàn: tổ dân phố (thấp tầng) và toà chung cư (cao tầng). */
export const LOW_RISE_AREAS = [
  { name: 'Tổ 1', streets: ['Lê Lợi', 'Nguyễn Du'] },
  { name: 'Tổ 2', streets: ['Trần Hưng Đạo'] },
  { name: 'Tổ 3', streets: ['Nguyễn Trãi', 'Hai Bà Trưng'] },
  { name: 'Tổ 4', streets: ['Lý Thường Kiệt', 'Quang Trung'] },
];
export const HIGH_RISE_AREAS = [
  { name: 'Chung cư Hoà Bình – Block A', building: 'Chung cư Hoà Bình', block: 'A', floors: 20, group: 'Tổ 5' },
  { name: 'Chung cư Hoà Bình – Block B', building: 'Chung cư Hoà Bình', block: 'B', floors: 20, group: 'Tổ 5' },
  { name: 'Chung cư An Phú', building: 'Chung cư An Phú', block: 'AP', floors: 15, group: 'Tổ 6' },
];
export const HOUSEHOLDS_PER_AREA = 10;

/**
 * Hộ của tài khoản cư dân mẫu (0900000004) — luôn là hộ đầu tiên, để tài khoản tự liên kết theo SĐT.
 */
export const RESIDENT_HOUSEHOLD = {
  headName: 'Nguyễn Văn An',
  headPhone: '0900000004',
  headCitizenId: '079060000001',
};

export const REPORTS = [
  { category: 'trom_cap', title: 'Mất trộm xe máy trước nhà', description: 'Xe Wave màu đỏ bị lấy lúc khoảng 2 giờ sáng.' },
  { category: 'lua_dao', title: 'Cuộc gọi giả danh công an yêu cầu chuyển tiền', description: 'Người gọi xưng cán bộ điều tra, đòi chuyển khoản để "xác minh".' },
  { category: 'doi_tuong_tinh_nghi', title: 'Nhóm thanh niên lạ tụ tập khuya', description: 'Thường tụ tập đầu hẻm sau 23 giờ, gây ồn.' },
  { category: 'ngap_nuoc', title: 'Ngập sâu sau mưa lớn', description: 'Nước ngập tới đầu gối, xe chết máy nhiều.' },
  { category: 'lan_chiem', title: 'Lấn chiếm vỉa hè bán hàng', description: 'Quán lấn hết vỉa hè, người đi bộ phải xuống lòng đường.' },
  { category: 'mat_an_toan_khac', title: 'Dây điện võng thấp', description: 'Dây điện sát mái tôn, nguy cơ chập cháy.' },
  { category: 'hu_hong_dan_sinh', title: 'Đèn đường hỏng', description: 'Ba bóng đèn liên tiếp không sáng, hẻm tối.' },
  { category: 'hu_hong_dan_sinh', title: 'Nắp cống bị vỡ', description: 'Nắp cống giữa hẻm vỡ, dễ sụp bánh xe.' },
  { category: 'trom_cap', title: 'Trộm cây cảnh, chậu kiểng', description: 'Mất 2 chậu mai trước cửa trong đêm.' },
  { category: 'ngap_nuoc', title: 'Cống thoát nước bị nghẹt', description: 'Rác làm tắc miệng cống, nước không rút.' },
  { category: 'hu_hong_dan_sinh', title: 'Thang máy Block B dừng đột ngột', description: 'Thang số 2 kẹt giữa tầng 7 và 8.' },
  { category: 'lua_dao', title: 'Tin nhắn trúng thưởng giả mạo', description: 'Nhiều hộ nhận tin nhắn yêu cầu nộp phí nhận quà.' },
] as const;

export const SOS_ALERTS = [
  { title: 'SOS – Người cao tuổi ngã, bất tỉnh', description: 'Cần hỗ trợ đưa đi cấp cứu.' },
  { title: 'SOS – Cháy nhỏ tại bếp', description: 'Khói nhiều, đã ngắt điện.' },
  { title: 'SOS – Có người lạ đột nhập', description: 'Nghe tiếng phá khoá cửa sau.' },
];

export const POSTS = [
  { kind: 'thong_bao_nhanh', category: 'cup_dien', title: 'Lịch cúp điện bảo trì lưới', content: 'Điện lực cắt điện từ 7h30 đến 16h để bảo trì trạm biến áp. Bà con chủ động sắp xếp sinh hoạt.', pinned: true, days: -1 },
  { kind: 'thong_bao_nhanh', category: 'rac', title: 'Thay đổi giờ thu gom rác', content: 'Từ tuần sau, xe rác thu gom lúc 18h–19h hằng ngày. Đề nghị các hộ phân loại rác tại nguồn.', days: -3 },
  { kind: 'tuyen_truyen', category: 'pccc', title: 'Hướng dẫn thoát nạn khi cháy chung cư', content: 'Không dùng thang máy; dùng khăn ướt che mũi miệng; đi theo biển chỉ dẫn lối thoát hiểm.', days: -6 },
  { kind: 'su_kien', category: 'tiem_chung', title: 'Tiêm chủng mở rộng cho trẻ dưới 5 tuổi', content: 'Phụ huynh mang sổ tiêm chủng tới trạm y tế phường.', eventIn: 7, eventTime: '7h30 – 11h00', location: 'Trạm y tế phường', days: -2 },
  { kind: 'su_kien', category: 'kham_suc_khoe', title: 'Khám sức khoẻ miễn phí cho người cao tuổi', content: 'Đo huyết áp, đường huyết, tư vấn dinh dưỡng.', eventIn: 12, eventTime: '8h00 – 11h00', location: 'Nhà văn hoá khu phố', audienceGroup: 'nguoi_cao_tuoi', days: -4 },
  { kind: 'tuyen_truyen', category: 'chinh_sach', title: 'Chính sách hỗ trợ hộ cận nghèo năm nay', content: 'Hộ cận nghèo được hỗ trợ 70% mệnh giá thẻ BHYT. Liên hệ trưởng khu phố để được hướng dẫn.', days: -10 },
  { kind: 'thong_bao_nhanh', category: 'van_dong_quy', title: 'Vận động đóng góp quỹ Khuyến học', content: 'Mức đóng 20.000 đ/hộ, quét mã QR trong mục Quỹ dân sinh.', days: -8 },
  { kind: 'su_kien', category: 'le_hoi', title: 'Đêm hội Trăng rằm cho thiếu nhi', content: 'Văn nghệ, rước đèn và phát quà Trung thu cho các cháu.', eventIn: 20, eventTime: '18h30', location: 'Sân chung cư Hoà Bình', days: -1 },
] as const;

export const SURVEYS = [
  {
    title: 'Khảo sát giờ thu gom rác',
    description: 'Lấy ý kiến bà con về khung giờ thu gom rác mới.',
    questions: [
      { text: 'Khung giờ nào phù hợp với gia đình?', options: ['17h–18h', '18h–19h', '19h–20h'] },
      { text: 'Gia đình đã phân loại rác tại nguồn chưa?', options: ['Đã phân loại', 'Đôi khi', 'Chưa'] },
    ],
    startIn: -10,
    endIn: 10,
  },
  {
    title: 'Ý kiến về lắp camera an ninh các hẻm',
    description: 'Dự kiến lắp 12 camera tại các đầu hẻm, kinh phí xã hội hoá.',
    questions: [{ text: 'Gia đình có đồng ý đóng góp lắp camera?', options: ['Đồng ý', 'Không đồng ý', 'Cần thêm thông tin'] }],
    startIn: -5,
    endIn: 20,
  },
  {
    title: 'Đánh giá buổi sinh hoạt khu phố quý trước',
    questions: [{ text: 'Mức độ hài lòng của bà con?', options: ['Rất hài lòng', 'Hài lòng', 'Chưa hài lòng'] }],
    startIn: -60,
    endIn: -30,
  },
];

export const ACTIVITIES = [
  { kind: 'hop_khu_pho', title: 'Họp khu phố định kỳ', in: 6, startTime: '19:00', endTime: '21:00', location: 'Nhà văn hoá khu phố', content: 'Tổng kết quý, triển khai kế hoạch PCCC mùa khô.' },
  { kind: 'tinh_nguyen', title: 'Ngày Chủ nhật xanh', in: 9, startTime: '06:30', endTime: '09:00', location: 'Các tuyến hẻm Tổ 1–4', content: 'Tổng vệ sinh, khơi thông cống rãnh.' },
  { kind: 'tap_huan', title: 'Tập huấn PCCC cho cư dân chung cư', in: 15, startTime: '08:00', endTime: '11:00', location: 'Sảnh Block A', organizer: 'Cảnh sát PCCC quận' },
  { kind: 'the_thao', title: 'Giải cầu lông khu phố', in: 25, startTime: '07:00', location: 'Sân trường THCS Lê Lợi', organizer: 'Đoàn thanh niên' },
  { kind: 'hop_khu_pho', title: 'Họp khu phố quý trước', in: -40, startTime: '19:00', endTime: '21:00', location: 'Nhà văn hoá khu phố', minutes: 'Có mặt 52/60 hộ. Thống nhất lịch thu gom rác mới; giao Tổ 3 rà soát đèn đường hỏng.' },
  { kind: 'van_nghe', title: 'Văn nghệ mừng Quốc khánh', in: -33, startTime: '19:30', location: 'Sân chung cư Hoà Bình', minutes: 'Khoảng 200 cư dân tham dự, 9 tiết mục.' },
] as const;
