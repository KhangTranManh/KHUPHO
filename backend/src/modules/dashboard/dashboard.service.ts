import { ageFrom, isoDaysFromToday } from '../../common/utils/date.js';
import { listAreas } from '../areas/area.service.js';
import { ResidentChangeModel, type ChangeType } from '../changes/residentChange.model.js';
import { HOUSING_TYPES, type HousingType } from '../households/household.constants.js';
import { HouseholdModel } from '../households/household.model.js';
import {
  RESIDENCE_STATUSES,
  RESIDENT_CATEGORIES,
  type ResidenceStatus,
  type ResidentCategory,
} from '../residents/resident.constants.js';
import { ReportModel } from '../reports/report.model.js';
import type { AgeGenderBucket, HousingTypeStat, OfficerDashboard, StatValue } from './dashboard.types.js';

const PENDING_LIMIT = 5;
const RECENT_CHANGES_LIMIT = 6;

const AGE_BUCKETS = [
  { label: '0–5', min: 0, max: 5 },
  { label: '6–15', min: 6, max: 15 },
  { label: '16–29', min: 16, max: 29 },
  { label: '30–44', min: 30, max: 44 },
  { label: '45–59', min: 45, max: 59 },
  { label: '60–74', min: 60, max: 74 },
  { label: '75+', min: 75, max: Infinity },
];

const zeroBy = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

/** % thay đổi, làm tròn 1 chữ số. */
const pctChange = (now: number, before: number) =>
  before === 0 ? 0 : Math.round(((now - before) / before) * 1000) / 10;

/** Số biến động thuộc `types` trong khoảng (fromDaysAgo, toDaysAgo] ngày trước. */
const countChanges = (types: ChangeType[], fromDaysAgo: number, toDaysAgo: number) =>
  ResidentChangeModel.countDocuments({
    type: { $in: types },
    date: { $gt: isoDaysFromToday(-fromDaysAgo), $lte: isoDaysFromToday(-toDaysAgo) },
  });

/**
 * Tổng hợp cho trang tổng quan của cán bộ.
 * Quy mô khu phố (vài nghìn nhân khẩu) → đọc các trường cần thiết rồi tính trong bộ nhớ cho dễ đọc.
 * Nếu dữ liệu lớn hơn nhiều, chuyển phần đếm sang aggregation pipeline của MongoDB.
 */
export async function getOfficerDashboard(): Promise<OfficerDashboard> {
  const today = new Date();

  const [
    households,
    areas,
    pendingReports,
    pendingReportCount,
    openSos,
    openSosCount,
    recentChanges,
    newHouseholds,
    residentsIn,
    residentsOut,
    stayNow,
    stayBefore,
    absentNow,
    absentBefore,
  ] = await Promise.all([
    // Chỉ lấy trường không mã hoá → không cần giải mã khi thống kê.
    HouseholdModel.find(
      {},
      'housingType areaId registeredAt members.residenceStatus members.categories members.gender members.dateOfBirth',
    ).lean(),
    listAreas(),
    ReportModel.find({ type: { $ne: 'sos' }, status: { $ne: 'da_xong' } }).sort({ createdAt: -1 }).limit(PENDING_LIMIT),
    ReportModel.countDocuments({ type: { $ne: 'sos' }, status: { $ne: 'da_xong' } }),
    ReportModel.find({ type: 'sos', status: { $ne: 'da_xong' } }).sort({ createdAt: -1 }).limit(PENDING_LIMIT),
    ReportModel.countDocuments({ type: 'sos', status: { $ne: 'da_xong' } }),
    ResidentChangeModel.find().sort({ date: -1, _id: -1 }).limit(RECENT_CHANGES_LIMIT),
    HouseholdModel.countDocuments({ registeredAt: { $gte: isoDaysFromToday(-30, today) } }),
    countChanges(['nhap_khau', 'sinh'], 30, 0),
    countChanges(['chuyen_di', 'tu_vong'], 30, 0),
    countChanges(['tam_tru'], 30, 0),
    countChanges(['tam_tru'], 60, 30),
    countChanges(['tam_vang'], 30, 0),
    countChanges(['tam_vang'], 60, 30),
  ]);

  const byHousingType = Object.fromEntries(
    HOUSING_TYPES.map((t) => [t, { households: 0, residents: 0, byStatus: zeroBy(RESIDENCE_STATUSES) }]),
  ) as Record<HousingType, HousingTypeStat>;
  const byCategory = zeroBy<ResidentCategory>(RESIDENT_CATEGORIES);
  const statusTotals = zeroBy<ResidenceStatus>(RESIDENCE_STATUSES);
  const byAgeGender: AgeGenderBucket[] = AGE_BUCKETS.map((b) => ({ label: b.label, nam: 0, nu: 0 }));
  const perArea = new Map<string, { households: number; residents: number; tam_tru: number; tam_vang: number }>();
  const areaStat = (id: unknown) => {
    const key = String(id);
    if (!perArea.has(key)) perArea.set(key, { households: 0, residents: 0, tam_tru: 0, tam_vang: 0 });
    return perArea.get(key)!;
  };

  for (const h of households) {
    byHousingType[h.housingType].households++;
    areaStat(h.areaId).households++;
  }

  const residents = households.flatMap((h) => h.members.map((m) => ({ ...m, housingType: h.housingType, areaId: h.areaId })));
  for (const p of residents) {
    const group = byHousingType[p.housingType];
    group.residents++;
    group.byStatus[p.residenceStatus]++;
    statusTotals[p.residenceStatus]++;
    for (const c of p.categories) byCategory[c as ResidentCategory]++;

    const age = ageFrom(p.dateOfBirth, today);
    const bucket = byAgeGender[AGE_BUCKETS.findIndex((b) => age >= b.min && age <= b.max)];
    if (bucket) bucket[p.gender]++;

    const area = areaStat(p.areaId);
    area.residents++;
    if (p.residenceStatus === 'tam_tru') area.tam_tru++;
    if (p.residenceStatus === 'tam_vang') area.tam_vang++;
  }

  const stat = (value: number, delta: number): StatValue => ({ value, delta });
  const netResidents = residentsIn - residentsOut;

  return {
    households: stat(households.length, pctChange(households.length, households.length - newHouseholds)),
    residents: stat(residents.length, pctChange(residents.length, residents.length - netResidents)),
    temporaryResidents: stat(statusTotals.tam_tru, pctChange(stayNow, stayBefore)),
    temporaryAbsent: stat(statusTotals.tam_vang, pctChange(absentNow, absentBefore)),
    byHousingType,
    byCategory,
    byAgeGender,
    areas: areas.map((a) => {
      const s = areaStat(a._id);
      return {
        id: a.id,
        name: a.name,
        housingType: a.housingType,
        managerName: a.managerName,
        households: s.households,
        residents: s.residents,
        temporaryResidents: s.tam_tru,
        temporaryAbsent: s.tam_vang,
      };
    }),
    pendingReports,
    pendingReportCount,
    openSos,
    openSosCount,
    recentChanges,
  };
}
