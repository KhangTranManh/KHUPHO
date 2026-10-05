/** Nhân hộ khẩu + dashboard cán bộ. */
import type { ChangeQuery } from '@/features/changes/changeService';
import type { ChangeType } from '@/features/changes/types';
import type { AgeGenderBucket, OfficerDashboard, StatValue } from '@/features/dashboard/types';
import type { HouseholdQuery } from '@/features/households/householdService';
import type { HousingType } from '@/features/households/types';
import { RESIDENT_CATEGORIES } from '@/features/residents/constants';
import type { ResidentQuery } from '@/features/residents/residentService';
import type { ResidenceStatus, ResidentCategory } from '@/features/residents/types';
import { ageFrom, daysBetween } from '@/utils/date';
import { reports } from '../communityDb';
import { db } from '../db';
import { matches, paginate, passFilter, respond } from '../helpers';

const PENDING_LIMIT = 5;

/** % thay đổi, làm tròn 1 chữ số. */
const pctChange = (now: number, before: number) =>
  before === 0 ? 0 : Math.round(((now - before) / before) * 1000) / 10;

/** Số biến động thuộc `types` trong khoảng (fromDaysAgo, toDaysAgo] ngày trước. */
function countChanges(types: ChangeType[], fromDaysAgo: number, toDaysAgo: number) {
  return db.changes.filter((c) => {
    const ago = daysBetween(new Date(c.date), db.today);
    return types.includes(c.type) && ago < fromDaysAgo && ago >= toDaysAgo;
  }).length;
}

const AGE_BUCKETS = [
  { label: '0–5', min: 0, max: 5 },
  { label: '6–15', min: 6, max: 15 },
  { label: '16–29', min: 16, max: 29 },
  { label: '30–44', min: 30, max: 44 },
  { label: '45–59', min: 45, max: 59 },
  { label: '60–74', min: 60, max: 74 },
  { label: '75+', min: 75, max: Infinity },
];

const emptyStatus = (): Record<ResidenceStatus, number> => ({ thuong_tru: 0, tam_tru: 0, tam_vang: 0 });

function buildOfficerDashboard(): OfficerDashboard {
  const { residents, households, areas, today } = db;

  const byHousingType: OfficerDashboard['byHousingType'] = {
    thap_tang: { households: 0, residents: 0, byStatus: emptyStatus() },
    cao_tang: { households: 0, residents: 0, byStatus: emptyStatus() },
  };
  const byCategory = Object.fromEntries(RESIDENT_CATEGORIES.map((c) => [c, 0])) as Record<ResidentCategory, number>;
  const byAgeGender: AgeGenderBucket[] = AGE_BUCKETS.map((b) => ({ label: b.label, nam: 0, nu: 0 }));
  const statusTotals = emptyStatus();

  for (const h of households) byHousingType[h.housingType].households++;
  for (const p of residents) {
    const group = byHousingType[p.housingType];
    group.residents++;
    group.byStatus[p.residenceStatus]++;
    statusTotals[p.residenceStatus]++;
    for (const c of p.categories) byCategory[c]++;
    const age = ageFrom(p.dateOfBirth, today);
    const bucket = AGE_BUCKETS.findIndex((b) => age >= b.min && age <= b.max);
    if (bucket >= 0) byAgeGender[bucket][p.gender]++;
  }

  const newHouseholds = households.filter((h) => daysBetween(new Date(h.registeredAt), today) <= 30).length;
  const netResidents = countChanges(['nhap_khau', 'sinh'], 30, 0) - countChanges(['chuyen_di', 'tu_vong'], 30, 0);
  const stat = (value: number, delta: number): StatValue => ({ value, delta });
  const countIn = (areaName: string, status?: ResidenceStatus) =>
    residents.filter((p) => p.areaName === areaName && (!status || p.residenceStatus === status)).length;

  const pending = reports.filter((rp) => rp.type !== 'sos' && rp.status !== 'da_xong');
  const openSos = reports.filter((rp) => rp.type === 'sos' && rp.status !== 'da_xong');

  return {
    households: stat(households.length, pctChange(households.length, households.length - newHouseholds)),
    residents: stat(residents.length, pctChange(residents.length, residents.length - netResidents)),
    temporaryResidents: stat(statusTotals.tam_tru, pctChange(countChanges(['tam_tru'], 30, 0), countChanges(['tam_tru'], 60, 30))),
    temporaryAbsent: stat(statusTotals.tam_vang, pctChange(countChanges(['tam_vang'], 30, 0), countChanges(['tam_vang'], 60, 30))),
    byHousingType,
    byCategory,
    byAgeGender,
    areas: areas.map((a) => ({
      id: a.id,
      name: a.name,
      housingType: a.housingType,
      managerName: a.managerName,
      households: households.filter((h) => h.areaId === a.id).length,
      residents: countIn(a.name),
      temporaryResidents: countIn(a.name, 'tam_tru'),
      temporaryAbsent: countIn(a.name, 'tam_vang'),
    })),
    pendingReports: pending.slice(0, PENDING_LIMIT),
    pendingReportCount: pending.length,
    openSos: openSos.slice(0, PENDING_LIMIT),
    openSosCount: openSos.length,
    recentChanges: db.changes.slice(0, 6),
  };
}

export const populationHandlers = {
  residents: (q: ResidentQuery) =>
    respond(
      paginate(
        db.residents.filter(
          (p) =>
            passFilter(q.filter, p.residenceStatus) &&
            (!q.category || p.categories.includes(q.category)) &&
            matches(q.search, p.fullName, p.citizenId, p.householdCode, p.phone),
        ),
        q,
      ),
    ),

  households: (q: HouseholdQuery) =>
    respond(
      paginate(
        db.households.filter(
          (h) =>
            passFilter<HousingType>(q.filter, h.housingType) &&
            matches(q.search, h.code, h.headName, h.address, h.areaName, h.headPhone),
        ),
        q,
      ),
    ),

  areas: () => respond(db.areas),

  changes: (q: ChangeQuery) =>
    respond(
      paginate(
        db.changes.filter(
          (c) => passFilter(q.filter, c.type) && matches(q.search, c.residentName, c.householdCode, c.officer),
        ),
        q,
      ),
    ),

  officerDashboard: () => respond(buildOfficerDashboard()),
};
