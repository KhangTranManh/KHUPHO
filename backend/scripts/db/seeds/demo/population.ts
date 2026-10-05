/**
 * Dữ liệu mẫu — lõi dân cư: khu vực, hộ gia đình (nhúng nhân khẩu, lịch sử cư trú, danh hiệu văn hoá),
 * nhật ký biến động. Hộ đầu tiên là hộ của tài khoản cư dân mẫu.
 */
import { addDays, toISODate } from '../../../../src/common/utils/date.js';
import { AreaModel } from '../../../../src/modules/areas/area.model.js';
import { ResidentChangeModel, type ChangeType } from '../../../../src/modules/changes/residentChange.model.js';
import type { HouseholdType } from '../../../../src/modules/households/household.constants.js';
import { HouseholdModel } from '../../../../src/modules/households/household.model.js';
import type { Relation, ResidenceStatus, ResidentCategory } from '../../../../src/modules/residents/resident.constants.js';
import type { Random } from '../../lib/random.js';
import { createEach } from '../../lib/run.js';
import {
  ABSENCE_NOTES,
  CENTER,
  CHILD_AGE,
  ELDERLY_AGE,
  GIVEN,
  HIGH_RISE_AREAS,
  HOUSEHOLDS_PER_AREA,
  LOW_RISE_AREAS,
  MIDDLE,
  PHONE_PREFIXES,
  RESIDENT_HOUSEHOLD,
  STAY_NOTES,
  SURNAMES,
  WORKPLACES,
} from './data.js';

type Gender = 'nam' | 'nu';

interface MemberSeed {
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  citizenId?: string;
  phone?: string;
  relation: Relation;
  otherContact?: string;
  residenceStatus: ResidenceStatus;
  residenceFrom?: string;
  residenceTo?: string;
  residenceHistory: { status: ResidenceStatus; from: string; to?: string; note?: string; recordedBy?: string }[];
  categories: ResidentCategory[];
  registeredAt: string;
}

const iso = (d: Date) => toISODate(d);

export function createPeople(r: Random, today: Date, officer: string) {
  const name = (gender: Gender, surname = r.pick(SURNAMES)) => `${surname} ${r.pick(MIDDLE[gender])} ${r.pick(GIVEN[gender])}`;
  const phone = () => `${r.pick(PHONE_PREFIXES)}${String(r.int(0, 9_999_999)).padStart(7, '0')}`;

  /** CCCD 12 số: mã tỉnh (3) + thế kỷ/giới tính (1) + năm sinh (2) + ngẫu nhiên (6). */
  const citizenId = (gender: Gender, dob: Date) => {
    const year = dob.getFullYear();
    const centuryGender = (year >= 2000 ? 2 : 0) + (gender === 'nu' ? 1 : 0);
    return `079${centuryGender}${String(year % 100).padStart(2, '0')}${String(r.int(0, 999_999)).padStart(6, '0')}`;
  };

  const categorize = (age: number): ResidentCategory[] => {
    const out: ResidentCategory[] = [];
    if (age < CHILD_AGE) {
      out.push('tre_em');
      if (age >= 6) out.push('hoc_sinh_sinh_vien');
    } else if (age <= 22) out.push(r.chance(0.7) ? 'hoc_sinh_sinh_vien' : 'nguoi_di_lam');
    else if (age < ELDERLY_AGE) out.push(r.chance(0.86) ? 'nguoi_di_lam' : 'that_nghiep');
    else out.push('nguoi_cao_tuoi');
    if (r.chance(age >= ELDERLY_AGE ? 0.08 : 0.025)) out.push('nguoi_khuyet_tat');
    if (age >= 65 && r.chance(0.2)) out.push('cuu_chien_binh');
    return out;
  };

  /** Một nhân khẩu; tạm trú / tạm vắng có thời hạn + một dòng lịch sử cư trú. */
  const member = (opts: {
    relation: Relation;
    gender: Gender;
    age: number;
    surname?: string;
    fullName?: string;
    status?: ResidenceStatus;
    householdSince: string;
  }): MemberSeed => {
    const status = opts.status ?? 'thuong_tru';
    const dob = new Date(today.getFullYear() - opts.age, r.int(0, 11), r.int(1, 28));
    const dateOfBirth = iso(dob);
    const registeredAt = opts.householdSince > dateOfBirth ? opts.householdSince : dateOfBirth;
    const history: MemberSeed['residenceHistory'] = [{ status: 'thuong_tru', from: registeredAt, recordedBy: officer }];
    let residenceFrom: string | undefined;
    let residenceTo: string | undefined;

    if (status !== 'thuong_tru') {
      residenceFrom = iso(addDays(today, -r.int(10, 300)));
      residenceTo = iso(addDays(today, r.int(30, 400)));
      const note = r.pick(status === 'tam_tru' ? STAY_NOTES : ABSENCE_NOTES);
      if (status === 'tam_tru') history.length = 0; // người thuê: chỉ có giai đoạn tạm trú
      else history[0].to = residenceFrom;
      history.push({ status, from: residenceFrom, to: residenceTo, note, recordedBy: officer });
    }

    const adult = opts.age >= 14;
    return {
      fullName: opts.fullName ?? name(opts.gender, opts.surname),
      gender: opts.gender,
      dateOfBirth,
      citizenId: adult ? citizenId(opts.gender, dob) : undefined,
      phone: opts.age >= 16 && r.chance(0.85) ? phone() : undefined,
      relation: opts.relation,
      otherContact: adult && r.chance(0.3) ? `Nơi làm việc: ${r.pick(WORKPLACES)}` : undefined,
      residenceStatus: status,
      residenceFrom,
      residenceTo,
      residenceHistory: history,
      categories: categorize(opts.age),
      registeredAt: status === 'tam_tru' ? residenceFrom! : registeredAt,
    };
  };

  return { name, phone, member };
}

export async function seedPopulation(r: Random, today: Date, officer: string) {
  const people = createPeople(r, today, officer);

  // ── Khu vực
  const areas = await createEach(AreaModel, [
    ...LOW_RISE_AREAS.map((a) => ({
      name: a.name,
      housingType: 'thap_tang',
      residentialGroup: a.name,
      streets: a.streets,
      managerName: people.name(r.chance(0.6) ? 'nam' : 'nu'),
      managerPhone: people.phone(),
    })),
    ...HIGH_RISE_AREAS.map((a) => ({
      name: a.name,
      housingType: 'cao_tang',
      residentialGroup: a.group,
      building: { name: a.building, block: a.block, floors: a.floors },
      managerName: people.name(r.chance(0.6) ? 'nam' : 'nu'),
      managerPhone: people.phone(),
    })),
  ]);

  // ── Hộ gia đình + nhân khẩu
  const thisYear = today.getFullYear();
  const households = [];
  let seq = 0;

  for (const area of areas) {
    const highRise = HIGH_RISE_AREAS.find((a) => a.name === area.name);
    for (let i = 0; i < HOUSEHOLDS_PER_AREA; i++) {
      const isResidentHousehold = seq === 0;
      seq++;
      const since = iso(new Date(thisYear - r.int(1, 25), r.int(0, 11), r.int(1, 28)));
      const surname = isResidentHousehold ? 'Nguyễn' : r.pick(SURNAMES);
      const headGender: Gender = isResidentHousehold || r.chance(0.65) ? 'nam' : 'nu';
      const headAge = isResidentHousehold ? 66 : r.int(28, 82);

      const head = people.member({
        relation: 'chu_ho',
        gender: headGender,
        age: headAge,
        surname,
        fullName: isResidentHousehold ? RESIDENT_HOUSEHOLD.headName : undefined,
        status: !isResidentHousehold && r.chance(0.05) ? 'tam_vang' : 'thuong_tru',
        householdSince: since,
      });
      if (isResidentHousehold) {
        head.phone = RESIDENT_HOUSEHOLD.headPhone;
        head.citizenId = RESIDENT_HOUSEHOLD.headCitizenId;
        head.categories = ['nguoi_cao_tuoi', 'cuu_chien_binh'];
      }
      const members: MemberSeed[] = [head];

      if (headAge >= 24 && r.chance(0.78)) {
        members.push(people.member({ relation: 'vo_chong', gender: headGender === 'nam' ? 'nu' : 'nam', age: Math.max(20, headAge + r.int(-6, 4)), householdSince: since }));
      }
      const childAgeMax = Math.min(headAge - 20, 40);
      for (let c = r.int(0, 3); c > 0 && childAgeMax > 0; c--) {
        const age = r.int(0, childAgeMax);
        const status: ResidenceStatus = age >= 18 && r.chance(0.12) ? 'tam_vang' : 'thuong_tru';
        members.push(people.member({ relation: 'con', gender: r.chance(0.5) ? 'nam' : 'nu', age, surname, status, householdSince: since }));
      }
      if (headAge < 55 && r.chance(0.15)) {
        members.push(people.member({ relation: 'cha_me', gender: r.chance(0.5) ? 'nam' : 'nu', age: headAge + r.int(22, 30), surname, householdSince: since }));
      }
      if (!highRise && r.chance(0.25)) {
        members.push(people.member({ relation: 'nguoi_thue', gender: r.chance(0.5) ? 'nam' : 'nu', age: r.int(19, 35), status: 'tam_tru', householdSince: since }));
      }

      const householdType: HouseholdType = isResidentHousehold
        ? 'thuong'
        : r.pick(['thuong', 'thuong', 'thuong', 'thuong', 'thuong', 'thuong', 'thuong', 'thuong', 'thuong', 'ngheo', 'can_ngheo', 'chinh_sach', 'kho_khan'] as const);
      const lastYear = r.chance(0.82) ? 'dat' : 'chua_dat';

      const address = highRise
        ? (() => {
            const floor = r.int(2, highRise.floors);
            const apartment = `${highRise.block}-${floor}${String(r.int(1, 12)).padStart(2, '0')}`;
            return { building: highRise.building, block: highRise.block, floor, apartment, address: `Căn ${apartment}, ${highRise.building}` };
          })()
        : (() => {
            const street = r.pick(area.streets ?? ['Lê Lợi']);
            const alley = `Hẻm ${r.int(1, 30) * 10}`;
            const houseNumber = `${r.int(1, 99)}/${r.int(1, 20)}`;
            return { houseNumber, alley, street, address: `${houseNumber}, ${alley} ${street}` };
          })();

      households.push({
        code: `HK-${String(1000 + seq).padStart(4, '0')}`,
        housingType: area.housingType,
        areaId: area._id,
        areaName: area.name,
        ...address,
        contactPhone: head.phone,
        householdType,
        location: {
          type: 'Point' as const,
          coordinates: [CENTER.lng + (r.next() - 0.5) * 0.008, CENTER.lat + (r.next() - 0.5) * 0.008],
        },
        culturalTitles: [
          { year: thisYear - 1, result: lastYear },
          { year: thisYear, result: 'dang_binh_xet' as const },
        ],
        registeredAt: since,
        members,
      });
    }
  }
  const saved = await createEach(HouseholdModel, households);

  // ── Nhật ký biến động: suy ra từ nhân khẩu (tạm trú, tạm vắng, sinh, nhập khẩu) + vài ca đã rời hộ.
  const changes: { type: ChangeType; householdId?: unknown; memberId?: unknown; residentName: string; householdCode: string; date: string; note?: string }[] = [];
  const recent = iso(addDays(today, -365));
  for (const h of saved) {
    for (const m of h.members) {
      const fullName = m.get('fullName') as string;
      const base = { householdId: h._id, memberId: m._id, residentName: fullName, householdCode: h.code };
      if (m.residenceStatus !== 'thuong_tru' && m.residenceFrom) {
        const note = m.residenceHistory.at(-1)?.note ?? undefined;
        changes.push({ ...base, type: m.residenceStatus, date: m.residenceFrom, note });
      } else if (m.dateOfBirth >= recent) {
        changes.push({ ...base, type: 'sinh', date: m.dateOfBirth, note: 'Đăng ký khai sinh' });
      } else if (m.registeredAt >= recent) {
        changes.push({ ...base, type: 'nhap_khau', date: m.registeredAt, note: 'Chuyển đến từ phường khác' });
      }
    }
  }
  for (let i = 0; i < 6; i++) {
    const h = r.pick(saved);
    const type = r.pick(['chuyen_di', 'chuyen_di', 'tu_vong'] as const);
    changes.push({
      type,
      householdId: h._id,
      residentName: people.name(r.chance(0.5) ? 'nam' : 'nu'),
      householdCode: h.code,
      date: iso(addDays(today, -r.int(5, 330))),
      note: type === 'chuyen_di' ? 'Chuyển hộ khẩu đi tỉnh khác' : undefined,
    });
  }
  await createEach(ResidentChangeModel, changes.map((c) => ({ ...c, officer })));

  return { areas, households: saved, changeCount: changes.length };
}
