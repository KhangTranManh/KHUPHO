/**
 * "Cơ sở dữ liệu" mẫu sinh tự động, có seed cố định → giống nhau mỗi lần tải.
 * Chỉ dùng khi appConfig.useMock = true. Xoá thư mục mocks/ khi có backend thật.
 */
import type { ChangeType, ResidentChange } from '@/features/changes/types';
import type { Household, ResidentialGroup } from '@/features/households/types';
import type { Gender, Relation, Resident, ResidenceStatus } from '@/features/residents/types';
import type { TemporaryRecord } from '@/features/temporary/types';
import { addDays, toISODate } from '@/utils/date';
import { createRandom, type Random } from './random';

const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE: Record<Gender, string[]> = {
  nam: ['Văn', 'Minh', 'Quốc', 'Đức', 'Hữu', 'Thanh', 'Gia', 'Công'],
  nu: ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Kim', 'Mai', 'Bích', 'Hồng'],
};
const GIVEN: Record<Gender, string[]> = {
  nam: ['An', 'Bảo', 'Cường', 'Dũng', 'Hải', 'Hoàng', 'Khang', 'Long', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Tài', 'Thắng', 'Trung', 'Vinh', 'Tuấn', 'Hiếu'],
  nu: ['Anh', 'Châu', 'Diệp', 'Giang', 'Hà', 'Hạnh', 'Hương', 'Lan', 'Linh', 'My', 'Ngân', 'Nhung', 'Phương', 'Quyên', 'Thảo', 'Trang', 'Vy', 'Yến'],
};
const STREETS = ['Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Trãi', 'Hai Bà Trưng', 'Lý Thường Kiệt', 'Phan Đình Phùng', 'Nguyễn Du', 'Quang Trung'];
const DESTINATIONS = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Đồng Nai', 'Cần Thơ', 'Hải Phòng'];
const STAY_REASONS = ['Thuê trọ đi học', 'Thuê trọ đi làm', 'Ở nhờ nhà người thân', 'Công tác dài ngày'];
const ABSENCE_REASONS = ['Đi làm ăn xa', 'Đi học', 'Điều trị bệnh', 'Chăm sóc người thân'];
const CHANGE_NOTES: Partial<Record<ChangeType, string[]>> = {
  nhap_khau: ['Chuyển đến từ phường khác', 'Kết hôn, nhập hộ chồng / vợ'],
  chuyen_di: ['Chuyển hộ khẩu đi tỉnh khác', 'Mua nhà nơi khác'],
  tam_tru: ['Sinh viên thuê trọ', 'Công nhân khu công nghiệp'],
  tam_vang: ['Đi làm xa trên 1 tháng'],
};
/** Trọng số loại biến động (lặp lại = xuất hiện nhiều hơn). */
const CHANGE_TYPES: ChangeType[] = ['nhap_khau', 'nhap_khau', 'chuyen_di', 'sinh', 'sinh', 'tu_vong', 'tam_tru', 'tam_tru', 'tam_tru', 'tam_vang', 'tam_vang'];

const OFFICERS = ['Trần Quốc Huy', 'Lê Thị Mai', 'Phạm Đức Thành', 'Ngô Thị Lan', 'Đỗ Minh Khôi', 'Vũ Thu Hà'];

const GROUP_COUNT = 7;
const HOUSEHOLD_COUNT = 160;
const TEMP_RESIDENT_COUNT = 45;
const CHANGE_COUNT = 220;

const otherGender = (g: Gender): Gender => (g === 'nam' ? 'nu' : 'nam');

function personName(r: Random, gender: Gender, surname = r.pick(SURNAMES)) {
  return `${surname} ${r.pick(MIDDLE[gender])} ${r.pick(GIVEN[gender])}`;
}

/** Số định danh 12 chữ số: mã tỉnh (3) + thế kỷ/giới tính (1) + năm sinh (2) + ngẫu nhiên (6). */
function citizenId(r: Random, gender: Gender, dob: Date) {
  const year = dob.getFullYear();
  const centuryGender = (year >= 2000 ? 2 : 0) + (gender === 'nu' ? 1 : 0);
  const province = String(r.int(1, 96)).padStart(3, '0');
  return `${province}${centuryGender}${String(year % 100).padStart(2, '0')}${String(r.int(0, 999999)).padStart(6, '0')}`;
}

function buildDb(today = new Date()) {
  const r = createRandom(20261004);

  const groups: ResidentialGroup[] = Array.from({ length: GROUP_COUNT }, (_, i) => ({
    id: `g${i + 1}`,
    name: `Tổ ${i + 1}`,
    leaderName: personName(r, r.chance(0.6) ? 'nam' : 'nu'),
  }));

  const households: Household[] = [];
  const residents: Resident[] = [];

  const addResident = (
    h: Household,
    relation: Relation,
    gender: Gender,
    age: number,
    surname?: string,
    status: ResidenceStatus = 'thuong_tru',
  ) => {
    const dob = new Date(today.getFullYear() - age, r.int(0, 11), r.int(1, 28));
    const householdReg = new Date(h.registeredAt);
    const resident: Resident = {
      id: `r${residents.length + 1}`,
      fullName: personName(r, gender, surname),
      gender,
      dateOfBirth: toISODate(dob),
      citizenId: citizenId(r, gender, dob),
      householdId: h.id,
      householdCode: h.code,
      relation,
      groupName: h.groupName,
      residenceStatus: status,
      registeredAt:
        status === 'tam_tru'
          ? toISODate(addDays(today, -r.int(5, 300)))
          : toISODate(dob > householdReg ? dob : householdReg),
    };
    residents.push(resident);
    h.memberCount++;
    return resident;
  };

  for (let i = 0; i < HOUSEHOLD_COUNT; i++) {
    const group = groups[i % GROUP_COUNT];
    const h: Household = {
      id: `h${i + 1}`,
      code: `HK-${String(1001 + i).padStart(4, '0')}`,
      headName: '',
      address: `${r.int(1, 250)} ${r.pick(STREETS)}`,
      groupId: group.id,
      groupName: group.name,
      memberCount: 0,
      registeredAt: toISODate(addDays(today, -r.int(60, 365 * 25))),
    };

    const headGender: Gender = r.chance(0.7) ? 'nam' : 'nu';
    const headAge = r.int(28, 78);
    const head = addResident(h, 'chu_ho', headGender, headAge);
    const surname = head.fullName.split(' ')[0];
    h.headName = head.fullName;

    if (headAge < 72 && r.chance(0.75)) {
      addResident(h, 'vo_chong', otherGender(headGender), Math.max(20, headAge + r.int(-6, 4)));
    }
    const kids = headAge < 60 ? r.int(0, 3) : r.int(0, 1);
    for (let k = 0; k < kids; k++) {
      const childAge = r.int(0, Math.max(0, headAge - 22));
      const status: ResidenceStatus = childAge >= 18 && r.chance(0.15) ? 'tam_vang' : 'thuong_tru';
      addResident(h, 'con', r.chance(0.5) ? 'nam' : 'nu', childAge, surname, status);
    }
    if (headAge < 50 && r.chance(0.15)) {
      addResident(h, 'cha_me', r.chance(0.5) ? 'nam' : 'nu', headAge + r.int(24, 32), surname);
    }
    households.push(h);
  }

  for (let i = 0; i < TEMP_RESIDENT_COUNT; i++) {
    addResident(r.pick(households), 'khac', r.chance(0.5) ? 'nam' : 'nu', r.int(18, 45), undefined, 'tam_tru');
  }

  const addressOf = new Map(households.map((h) => [h.id, h.address]));
  const temporaryRecords: TemporaryRecord[] = residents
    .filter((p) => p.residenceStatus !== 'thuong_tru')
    .map((p, i): TemporaryRecord => {
      const from = addDays(today, -r.int(10, 330));
      const isStay = p.residenceStatus === 'tam_tru';
      return {
        id: `t${i + 1}`,
        kind: isStay ? 'tam_tru' : 'tam_vang',
        fullName: p.fullName,
        citizenId: p.citizenId,
        place: isStay ? (addressOf.get(p.householdId) ?? '') : r.pick(DESTINATIONS),
        fromDate: toISODate(from),
        toDate: toISODate(addDays(from, r.int(90, 400))),
        reason: r.pick(isStay ? STAY_REASONS : ABSENCE_REASONS),
      };
    })
    .sort((a, b) => b.fromDate.localeCompare(a.fromDate));

  const changes: ResidentChange[] = Array.from({ length: CHANGE_COUNT }, (_, i) => {
    const type = r.pick(CHANGE_TYPES);
    const person = r.pick(residents);
    const notes = CHANGE_NOTES[type];
    return {
      id: `c${i + 1}`,
      type,
      residentName: person.fullName,
      householdCode: person.householdCode,
      date: toISODate(addDays(today, -r.int(0, 360))),
      officer: r.pick(OFFICERS),
      note: notes && r.chance(0.6) ? r.pick(notes) : undefined,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  /** Thông tin quản lý theo tổ (cán bộ phụ trách, tiến độ rà soát). */
  const groupMeta = new Map(
    groups.map((g) => {
      const officers = [...new Set([r.pick(OFFICERS), r.pick(OFFICERS), r.pick(OFFICERS)])];
      return [g.id, { officers, reviewProgress: r.int(35, 100) }];
    }),
  );

  return { today, groups, households, residents, temporaryRecords, changes, groupMeta };
}

export const db = buildDb();
