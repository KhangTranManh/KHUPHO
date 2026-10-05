/**
 * "Cơ sở dữ liệu" mẫu sinh tự động, có seed cố định → giống nhau mỗi lần tải.
 * Chỉ dùng khi appConfig.useMock = true. Xoá thư mục mocks/ khi có backend thật.
 */
import type { ChangeType, ResidentChange } from '@/features/changes/types';
import type { Area, Household } from '@/features/households/types';
import { CHILD_AGE, ELDERLY_AGE } from '@/features/residents/constants';
import type {
  Gender,
  HouseholdRole,
  Relation,
  Resident,
  ResidenceStatus,
  ResidentCategory,
} from '@/features/residents/types';
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
const STAY_NOTES = ['Thuê trọ đi làm', 'Thuê trọ đi học', 'Ở nhờ nhà người thân'];
const ABSENCE_NOTES = ['Đi làm ăn xa – TP. Hồ Chí Minh', 'Đi học – Hà Nội', 'Điều trị bệnh – Đà Nẵng'];
/** Toạ độ trung tâm khu phố mẫu (dùng rải toạ độ các hộ cho sơ đồ). */
const CENTER = { lat: 10.7769, lng: 106.7009 };
const PHONE_PREFIXES = ['090', '091', '093', '094', '096', '097', '098', '086', '088', '070', '077', '079', '081'];
const WORKPLACES = ['Công ty may Việt Tiến', 'Bệnh viện quận', 'Trường THCS Lê Lợi', 'Chợ Bến Thành', 'KCN Tân Bình'];
const CHANGE_NOTES: Partial<Record<ChangeType, string[]>> = {
  nhap_khau: ['Chuyển đến từ phường khác', 'Kết hôn, nhập hộ chồng / vợ'],
  chuyen_di: ['Chuyển hộ khẩu đi tỉnh khác', 'Mua nhà nơi khác'],
  tam_tru: ['Sinh viên thuê trọ', 'Thuê căn hộ chung cư'],
  tam_vang: ['Đi làm xa trên 1 tháng'],
};
/** Trọng số loại biến động (lặp lại = xuất hiện nhiều hơn). */
const CHANGE_TYPES: ChangeType[] = ['nhap_khau', 'nhap_khau', 'chuyen_di', 'sinh', 'sinh', 'tu_vong', 'tam_tru', 'tam_tru', 'tam_tru', 'tam_vang', 'tam_vang'];
export const OFFICERS = ['Trần Quốc Huy', 'Lê Thị Mai', 'Phạm Đức Thành', 'Ngô Thị Lan'];

/** Địa bàn: tổ dân phố (thấp tầng) và toà chung cư (cao tầng). */
const LOW_RISE_AREAS = [
  { name: 'Tổ 1', streets: ['Lê Lợi', 'Nguyễn Du'] },
  { name: 'Tổ 2', streets: ['Trần Hưng Đạo'] },
  { name: 'Tổ 3', streets: ['Nguyễn Trãi', 'Hai Bà Trưng'] },
  { name: 'Tổ 4', streets: ['Lý Thường Kiệt', 'Quang Trung'] },
];
const HIGH_RISE_AREAS = [
  { name: 'Chung cư Hoà Bình – Block A', short: 'A', floors: 20 },
  { name: 'Chung cư Hoà Bình – Block B', short: 'B', floors: 20 },
  { name: 'Chung cư An Phú', short: 'AP', floors: 15 },
];
const HOUSEHOLDS_PER_LOW_RISE_AREA = 26;
const HOUSEHOLDS_PER_HIGH_RISE_AREA = 24;
const TENANT_COUNT = 40; // người thuê nhà đăng ký tạm trú
const CHANGE_COUNT = 220;

const otherGender = (g: Gender): Gender => (g === 'nam' ? 'nu' : 'nam');
const randomGender = (r: Random): Gender => (r.chance(0.5) ? 'nam' : 'nu');

export function personName(r: Random, gender: Gender, surname = r.pick(SURNAMES)) {
  return `${surname} ${r.pick(MIDDLE[gender])} ${r.pick(GIVEN[gender])}`;
}

export const phoneNumber = (r: Random) => `${r.pick(PHONE_PREFIXES)}${String(r.int(0, 9_999_999)).padStart(7, '0')}`;

/** Số định danh 12 chữ số: mã tỉnh (3) + thế kỷ/giới tính (1) + năm sinh (2) + ngẫu nhiên (6). */
function citizenId(r: Random, gender: Gender, dob: Date) {
  const year = dob.getFullYear();
  const centuryGender = (year >= 2000 ? 2 : 0) + (gender === 'nu' ? 1 : 0);
  const province = String(r.int(1, 96)).padStart(3, '0');
  return `${province}${centuryGender}${String(year % 100).padStart(2, '0')}${String(r.int(0, 999999)).padStart(6, '0')}`;
}

/** Phân loại đối tượng theo tuổi (có yếu tố ngẫu nhiên cho nghề nghiệp, khuyết tật). */
function categorize(r: Random, age: number): ResidentCategory[] {
  const out: ResidentCategory[] = [];
  if (age < CHILD_AGE) {
    out.push('tre_em');
    if (age >= 6) out.push('hoc_sinh_sinh_vien');
  } else if (age <= 22) {
    out.push(r.chance(0.7) ? 'hoc_sinh_sinh_vien' : r.chance(0.7) ? 'nguoi_di_lam' : 'that_nghiep');
  } else if (age < ELDERLY_AGE) {
    out.push(r.chance(0.86) ? 'nguoi_di_lam' : 'that_nghiep');
  } else {
    out.push('nguoi_cao_tuoi');
    if (age < 70 && r.chance(0.25)) out.push('nguoi_di_lam');
  }
  if (r.chance(age >= ELDERLY_AGE ? 0.08 : 0.025)) out.push('nguoi_khuyet_tat');
  if (age >= 65 && r.chance(0.2)) out.push('cuu_chien_binh');
  return out;
}

function buildDb(today = new Date()) {
  const r = createRandom(20261005);

  const areas: Area[] = [
    ...LOW_RISE_AREAS.map((a, i): Area => ({
      id: `a${i + 1}`,
      name: a.name,
      housingType: 'thap_tang',
      residentialGroup: a.name,
      streets: a.streets,
      managerName: personName(r, r.chance(0.6) ? 'nam' : 'nu'),
      managerPhone: phoneNumber(r),
    })),
    ...HIGH_RISE_AREAS.map((a, i): Area => ({
      id: `b${i + 1}`,
      name: a.name,
      housingType: 'cao_tang',
      residentialGroup: `Tổ ${5 + i}`,
      building: { name: a.name.split(' – ')[0], block: a.short, floors: a.floors },
      managerName: personName(r, r.chance(0.6) ? 'nam' : 'nu'),
      managerPhone: phoneNumber(r),
    })),
  ];

  const households: Household[] = [];
  const residents: Resident[] = [];

  const addResident = (
    h: Household,
    opts: {
      role: HouseholdRole;
      relation?: Relation;
      gender: Gender;
      age: number;
      surname?: string;
      status?: ResidenceStatus;
      otherContact?: string;
    },
  ) => {
    const status = opts.status ?? 'thuong_tru';
    const dob = new Date(today.getFullYear() - opts.age, r.int(0, 11), r.int(1, 28));
    const householdReg = new Date(h.registeredAt);
    // Tạm trú / tạm vắng: có thời hạn + một dòng lịch sử cư trú.
    const periodFrom = status === 'thuong_tru' ? undefined : addDays(today, -r.int(10, 300));
    const periodTo = periodFrom ? addDays(periodFrom, r.int(90, 400)) : undefined;
    const resident: Resident = {
      id: `r${residents.length + 1}`,
      fullName: personName(r, opts.gender, opts.surname),
      gender: opts.gender,
      dateOfBirth: toISODate(dob),
      citizenId: citizenId(r, opts.gender, dob),
      phone: opts.age >= CHILD_AGE && r.chance(0.9) ? phoneNumber(r) : undefined,
      householdId: h.id,
      householdCode: h.code,
      housingType: h.housingType,
      areaName: h.areaName,
      householdRole: opts.role,
      relationToHead: opts.relation,
      otherContact:
        opts.otherContact ??
        (opts.age >= 23 && r.chance(0.12) ? `Nơi làm việc: ${r.pick(WORKPLACES)}` : undefined),
      residenceStatus: status,
      residenceFrom: periodFrom && toISODate(periodFrom),
      residenceTo: periodTo && toISODate(periodTo),
      residenceHistory: periodFrom
        ? [{ status, from: toISODate(periodFrom), to: toISODate(periodTo!), note: r.pick(status === 'tam_tru' ? STAY_NOTES : ABSENCE_NOTES) }]
        : [],
      categories: categorize(r, opts.age),
      registeredAt:
        periodFrom && status === 'tam_tru' ? toISODate(periodFrom) : toISODate(dob > householdReg ? dob : householdReg),
    };
    residents.push(resident);
    h.memberCount++;
    return resident;
  };

  /** Loại hộ (mặc định thường — an sinh gán sau), toạ độ quanh khu vực, danh hiệu văn hoá các năm trước. */
  const householdExtras = (areaIndex: number): Pick<Household, 'householdType' | 'location' | 'culturalTitles'> => ({
    householdType: 'thuong',
    location: {
      lat: +(CENTER.lat + (areaIndex % 4) * 0.002 + r.next() * 0.0015).toFixed(6),
      lng: +(CENTER.lng + Math.floor(areaIndex / 4) * 0.003 + r.next() * 0.0015).toFixed(6),
    },
    culturalTitles: [1, 2, 3]
      .map((back) => ({ year: today.getFullYear() - back, result: r.chance(0.82) ? ('dat' as const) : ('chua_dat' as const) }))
      .reverse(),
  });

  /** Thêm chủ hộ + các thành viên điển hình cho một hộ. */
  const populate = (h: Household) => {
    const headGender: Gender = r.chance(0.7) ? 'nam' : 'nu';
    const headAge = r.int(26, 82);
    const livesAlone = headAge >= 70 && r.chance(0.35);
    const head = addResident(h, {
      role: 'chu_ho',
      gender: headGender,
      age: headAge,
      // Người cao tuổi sống một mình: lưu liên hệ của người thân.
      otherContact: livesAlone
        ? `Con: ${personName(r, randomGender(r))} – ${phoneNumber(r)}`
        : undefined,
    });
    h.headName = head.fullName;
    h.headPhone = head.phone;
    if (livesAlone) return;

    const surname = head.fullName.split(' ')[0];
    if (headAge < 75 && r.chance(0.75)) {
      addResident(h, {
        role: 'thanh_vien',
        relation: 'vo_chong',
        gender: otherGender(headGender),
        age: Math.max(20, headAge + r.int(-6, 4)),
      });
    }
    const kids = headAge < 60 ? r.int(0, 3) : r.int(0, 1);
    for (let k = 0; k < kids; k++) {
      const age = r.int(0, Math.max(0, headAge - 22));
      addResident(h, {
        role: 'thanh_vien',
        relation: 'con',
        gender: randomGender(r),
        age,
        surname,
        status: age >= 18 && r.chance(0.15) ? 'tam_vang' : 'thuong_tru',
      });
    }
    if (headAge >= 58 && r.chance(0.3)) {
      addResident(h, { role: 'thanh_vien', relation: 'chau', gender: randomGender(r), age: r.int(1, 14), surname });
    }
    if (headAge < 50 && r.chance(0.18)) {
      addResident(h, {
        role: 'thanh_vien',
        relation: 'cha_me',
        gender: randomGender(r),
        age: headAge + r.int(24, 32),
        surname,
      });
    }
  };

  // Thấp tầng: nhà mặt phố hoặc trong hẻm.
  areas
    .filter((a) => a.housingType === 'thap_tang')
    .forEach((area, ai) => {
      for (let i = 0; i < HOUSEHOLDS_PER_LOW_RISE_AREA; i++) {
        const street = r.pick(LOW_RISE_AREAS[ai].streets);
        const inAlley = r.chance(0.45);
        const houseNumber = inAlley ? `${r.int(1, 60)}/${r.int(1, 30)}` : String(r.int(1, 300));
        const alley = inAlley ? `Hẻm ${r.int(10, 250)}` : undefined;
        const h: Household = {
          id: `h${households.length + 1}`,
          code: `HK-${String(1001 + households.length).padStart(4, '0')}`,
          housingType: 'thap_tang',
          areaId: area.id,
          areaName: area.name,
          houseNumber,
          alley,
          street,
          address: alley ? `${houseNumber}, ${alley} ${street}` : `${houseNumber} ${street}`,
          headName: '',
          memberCount: 0,
          registeredAt: toISODate(addDays(today, -r.int(60, 365 * 30))),
          ...householdExtras(ai),
        };
        populate(h);
        households.push(h);
      }
    });

  // Cao tầng: căn hộ chung cư.
  areas
    .filter((a) => a.housingType === 'cao_tang')
    .forEach((area, ai) => {
      const spec = HIGH_RISE_AREAS[ai];
      const used = new Set<string>();
      for (let i = 0; i < HOUSEHOLDS_PER_HIGH_RISE_AREA; i++) {
        let floor: number;
        let apartment: string;
        do {
          floor = r.int(2, spec.floors);
          apartment = `${spec.short}-${floor}${String(r.int(1, 12)).padStart(2, '0')}`;
        } while (used.has(apartment));
        used.add(apartment);
        const h: Household = {
          id: `h${households.length + 1}`,
          code: `HK-${String(1001 + households.length).padStart(4, '0')}`,
          housingType: 'cao_tang',
          areaId: area.id,
          areaName: area.name,
          building: area.name,
          floor,
          apartment,
          address: `Căn ${apartment}, ${area.name}`,
          headName: '',
          memberCount: 0,
          registeredAt: toISODate(addDays(today, -r.int(60, 365 * 12))),
          ...householdExtras(LOW_RISE_AREAS.length + ai),
        };
        populate(h);
        households.push(h);
      }
    });

  // Người thuê nhà / thuê căn hộ đăng ký tạm trú.
  for (let i = 0; i < TENANT_COUNT; i++) {
    addResident(r.pick(households), {
      role: 'thanh_vien',
      relation: 'nguoi_thue',
      gender: randomGender(r),
      age: r.int(18, 45),
      status: 'tam_tru',
    });
  }

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

  return { today, areas, households, residents, changes };
}

export const db = buildDb();
