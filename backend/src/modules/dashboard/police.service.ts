import { decryptMaybe } from '../../common/security/fieldEncryption.js';
import { listAreas } from '../areas/area.service.js';
import { HouseholdModel } from '../households/household.model.js';
import { ReportModel } from '../reports/report.model.js';
import type { AreaOverview, PoliceDashboard, TemporaryResidentItem } from './dashboard.types.js';

const LIST_LIMIT = 6;

/** Thứ tự ưu tiên: giao cho công an trước, khẩn trước. */
const rank = (r: { get(path: string): unknown }) =>
  (r.get('assignedRole') === 'cong_an_kv' ? 0 : 2) + (r.get('severity') === 'khan' ? 0 : 1);
const TEMPORARY_LIMIT = 8;

/**
 * Dashboard công an khu vực: việc cần xử lý (SOS, phản ánh) + theo dõi tạm trú / tạm vắng.
 * Chỉ giải mã họ tên của vài nhân khẩu trong danh sách tạm trú gần đây.
 */
export async function getPoliceDashboard(): Promise<PoliceDashboard> {
  const [households, areas, openByTypeRows, byStatusRows, openSos, openReports, pendingReportCount] = await Promise.all([
    HouseholdModel.find(
      {},
      'code areaId areaName members._id members.fullName members.residenceStatus members.residenceFrom members.residenceTo members.residenceHistory',
    ).lean(),
    listAreas(),
    ReportModel.aggregate<{ _id: string; n: number }>([{ $match: { status: { $ne: 'da_xong' } } }, { $group: { _id: '$type', n: { $sum: 1 } } }]),
    ReportModel.aggregate<{ _id: string; n: number }>([
      { $match: { type: { $ne: 'sos' } } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    ReportModel.find({ status: { $ne: 'da_xong' }, type: 'sos' }).sort({ createdAt: -1 }).limit(LIST_LIMIT),
    ReportModel.find({ status: { $ne: 'da_xong' }, type: { $ne: 'sos' } }).sort({ createdAt: -1 }),
    ReportModel.countDocuments({ status: { $ne: 'da_xong' }, type: { $ne: 'sos' } }),
  ]);

  const count = (rows: { _id: string; n: number }[], key: string) => rows.find((r) => r._id === key)?.n ?? 0;

  // Tạm trú / tạm vắng: tổng số, theo khu vực, và danh sách mới nhất.
  const temporary: (TemporaryResidentItem & { _rawName: unknown })[] = [];
  const perArea = new Map<string, { households: number; residents: number; tam_tru: number; tam_vang: number }>();
  for (const h of households) {
    const key = String(h.areaId);
    const area = perArea.get(key) ?? { households: 0, residents: 0, tam_tru: 0, tam_vang: 0 };
    area.households++;
    for (const m of h.members) {
      area.residents++;
      if (m.residenceStatus === 'tam_tru' || m.residenceStatus === 'tam_vang') {
        area[m.residenceStatus]++;
        temporary.push({
          residentId: String(m._id),
          fullName: '',
          _rawName: m.fullName,
          householdId: String(h._id),
          householdCode: h.code,
          areaName: h.areaName,
          residenceStatus: m.residenceStatus,
          residenceFrom: m.residenceFrom ?? undefined,
          residenceTo: m.residenceTo ?? undefined,
          note: m.residenceHistory?.at(-1)?.note ?? undefined,
        });
      }
    }
    perArea.set(key, area);
  }

  const recentTemporary = temporary
    .sort((a, b) => (b.residenceFrom ?? '').localeCompare(a.residenceFrom ?? ''))
    .slice(0, TEMPORARY_LIMIT)
    .map(({ _rawName, ...item }) => ({ ...item, fullName: decryptMaybe(_rawName) ?? '' }));

  const areaOverviews: AreaOverview[] = areas.map((a) => {
    const s = perArea.get(a.id) ?? { households: 0, residents: 0, tam_tru: 0, tam_vang: 0 };
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
  });

  return {
    openSosCount: count(openByTypeRows, 'sos'),
    newReportCount: count(byStatusRows, 'moi'),
    temporaryResidents: temporary.filter((t) => t.residenceStatus === 'tam_tru').length,
    temporaryAbsent: temporary.filter((t) => t.residenceStatus === 'tam_vang').length,
    openByType: {
      an_ninh: count(openByTypeRows, 'an_ninh'),
      mat_an_toan: count(openByTypeRows, 'mat_an_toan'),
      hu_hong_dan_sinh: count(openByTypeRows, 'hu_hong_dan_sinh'),
      sos: count(openByTypeRows, 'sos'),
    },
    byStatus: { moi: count(byStatusRows, 'moi'), dang_xu_ly: count(byStatusRows, 'dang_xu_ly'), da_xong: count(byStatusRows, 'da_xong') },
    openSos,
    // Giao cho công an trước, khẩn trước, rồi mới nhất trước (sort ổn định giữ thứ tự thời gian).
    pendingReports: openReports
      .sort((x, y) => rank(x) - rank(y))
      .slice(0, LIST_LIMIT),
    pendingReportCount,
    recentTemporary,
    areas: areaOverviews,
  };
}
