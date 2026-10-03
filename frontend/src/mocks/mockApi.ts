/**
 * Giả lập các endpoint backend trên dữ liệu `db`.
 * Mỗi hàm ở đây tương ứng một endpoint mà service trong features/* sẽ gọi khi tắt mock.
 */
import type { ChangeQuery } from '@/features/changes/changeService';
import type { DashboardSummary, StatValue } from '@/features/dashboard/types';
import type { HouseholdQuery } from '@/features/households/householdService';
import type { ResidentQuery } from '@/features/residents/residentService';
import type { TemporaryQuery } from '@/features/temporary/temporaryService';
import type { ListQuery, Paged } from '@/types/common';
import { daysBetween, lastMonthLabels } from '@/utils/date';
import type { Officer } from '@/features/account/types';
import { db, OFFICERS } from './db';
import { createRandom } from './random';

const LATENCY_MS = 250;

const respond = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

/** Bỏ dấu tiếng Việt để tìm "nguyen van an" khớp "Nguyễn Văn An". */
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

function matches(search: string | undefined, ...fields: string[]) {
  const q = search?.trim();
  if (!q) return true;
  const needle = normalize(q);
  return fields.some((f) => normalize(f).includes(needle));
}

const passFilter = <F extends string>(filter: F | 'all' | undefined, value: F) =>
  !filter || filter === 'all' || filter === value;

function paginate<T>(items: T[], q: ListQuery): Paged<T> {
  const start = (q.page - 1) * q.pageSize;
  return { items: items.slice(start, start + q.pageSize), total: items.length, page: q.page, pageSize: q.pageSize };
}

/** % thay đổi, làm tròn 1 chữ số. */
const pctChange = (now: number, before: number) =>
  before === 0 ? 0 : Math.round(((now - before) / before) * 1000) / 10;

/** Vị trí tháng của ngày ISO trong cửa sổ 12 tháng (11 = tháng hiện tại), -1 nếu ngoài cửa sổ. */
function monthSlot(iso: string) {
  const d = new Date(iso);
  const diff = (db.today.getFullYear() - d.getFullYear()) * 12 + (db.today.getMonth() - d.getMonth());
  return diff >= 0 && diff < 12 ? 11 - diff : -1;
}

function buildDashboard(): DashboardSummary {
  const r = createRandom(7);
  const monthly = Array<number>(12).fill(0);
  const net = Array<number>(12).fill(0);
  const byType = { nhap_khau: 0, chuyen_di: 0, sinh: 0, tu_vong: 0 };
  const absentByMonth = Array<number>(12).fill(0);

  for (const c of db.changes) {
    const m = monthSlot(c.date);
    if (m < 0) continue;
    monthly[m]++;
    if (c.type === 'tam_vang') absentByMonth[m]++;
    if (c.type in byType) {
      byType[c.type as keyof typeof byType]++;
      net[m] += c.type === 'nhap_khau' || c.type === 'sinh' ? 1 : -1;
    }
  }

  const tempNow = db.residents.filter((p) => p.residenceStatus === 'tam_tru').length;
  const absentNow = db.residents.filter((p) => p.residenceStatus === 'tam_vang').length;
  const permanent = Array<number>(12);
  const temporary = Array<number>(12);
  permanent[11] = db.residents.length - tempNow;
  temporary[11] = tempNow;
  for (let m = 10; m >= 0; m--) {
    permanent[m] = permanent[m + 1] - net[m + 1];
    temporary[m] = Math.max(0, temporary[m + 1] - r.int(-3, 5));
  }

  const newHouseholds = db.households.filter(
    (h) => daysBetween(new Date(h.registeredAt), db.today) <= 30,
  ).length;

  const stat = (value: number, delta: number): StatValue => ({ value, delta });

  return {
    residents: stat(
      db.residents.length,
      pctChange(permanent[11] + temporary[11], permanent[10] + temporary[10]),
    ),
    households: stat(db.households.length, pctChange(db.households.length, db.households.length - newHouseholds)),
    temporaryResidents: stat(tempNow, pctChange(temporary[11], temporary[10])),
    temporaryAbsent: stat(absentNow, pctChange(absentByMonth[11], absentByMonth[10])),
    monthlyChanges: lastMonthLabels(12, db.today).map((label, i) => ({ label, value: monthly[i] })),
    changesByType: byType,
    populationTrend: { labels: lastMonthLabels(12, db.today), permanent, temporary },
    groups: db.groups.map((g) => ({
      id: g.id,
      name: g.name,
      leaderName: g.leaderName,
      officers: db.groupMeta.get(g.id)?.officers ?? [],
      reviewProgress: db.groupMeta.get(g.id)?.reviewProgress ?? 0,
      households: db.households.filter((h) => h.groupId === g.id).length,
      residents: db.residents.filter((p) => p.groupName === g.name).length,
    })),
    recentChanges: db.changes.slice(0, 6),
  };
}

export const mockApi = {
  residents: (q: ResidentQuery) =>
    respond(
      paginate(
        db.residents.filter(
          (p) =>
            passFilter(q.filter, p.residenceStatus) &&
            matches(q.search, p.fullName, p.citizenId, p.householdCode),
        ),
        q,
      ),
    ),

  households: (q: HouseholdQuery) =>
    respond(
      paginate(
        db.households.filter(
          (h) => passFilter(q.filter, h.groupId) && matches(q.search, h.code, h.headName, h.address),
        ),
        q,
      ),
    ),

  groups: () => respond(db.groups),

  temporaryRecords: (q: TemporaryQuery) =>
    respond(
      paginate(
        db.temporaryRecords.filter(
          (t) => passFilter(q.filter, t.kind) && matches(q.search, t.fullName, t.citizenId, t.place),
        ),
        q,
      ),
    ),

  changes: (q: ChangeQuery) =>
    respond(
      paginate(
        db.changes.filter(
          (c) =>
            passFilter(q.filter, c.type) &&
            matches(q.search, c.residentName, c.householdCode, c.officer),
        ),
        q,
      ),
    ),

  dashboard: () => respond(buildDashboard()),

  currentOfficer: () =>
    respond<Officer>({
      id: 'o1',
      fullName: OFFICERS[0],
      position: 'Cán bộ quản lý cư trú',
      unit: 'Công an phường – Khu phố số',
      phone: '0900 000 000',
      email: 'canbo@khupho.local',
      groupIds: ['g1', 'g2', 'g3'],
      bio: 'Phụ trách tiếp nhận hồ sơ cư trú, cập nhật biến động dân cư và theo dõi tạm trú, tạm vắng tại các tổ được phân công.',
    }),
};
