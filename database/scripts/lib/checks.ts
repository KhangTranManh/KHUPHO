/**
 * Các kiểm tra tính đúng đắn dữ liệu dùng cho `npm run db:check` (và test).
 * Thêm kiểm tra mới: viết một hàm trả về Check / Check[] rồi thêm vào CHECKS.
 * Kết quả chỉ ghi mã hộ / id, không chứa họ tên, CCCD, SĐT.
 */
import { mongoose } from '../../../backend/src/config/database.js';
import { decryptField, isEncrypted } from '../../../backend/src/common/security/fieldEncryption.js';
import { toISODate } from '../../../backend/src/common/utils/date.js';
import { AreaModel } from '../../../backend/src/modules/areas/area.model.js';
import { FundModel } from '../../../backend/src/modules/funds/fund.model.js';
import { FundPaymentModel } from '../../../backend/src/modules/funds/fundPayment.model.js';
import { HouseholdModel } from '../../../backend/src/modules/households/household.model.js';
import { ReportModel } from '../../../backend/src/modules/reports/report.model.js';
import { UserModel } from '../../../backend/src/modules/users/user.model.js';

export interface Check {
  title: string;
  level: 'error' | 'warn';
  /** Danh sách vi phạm (rỗng = đạt). */
  issues: string[];
}

const ids = <T extends { _id: unknown }>(docs: T[]) => new Set(docs.map((d) => String(d._id)));

/** Mọi document hợp lệ với schema hiện tại (bắt lỗi dữ liệu cũ khi đổi enum / trường bắt buộc). */
async function schemaValidity(): Promise<Check> {
  const issues: string[] = [];
  for (const model of Object.values(mongoose.models)) {
    for await (const doc of model.find().cursor()) {
      const err = doc.validateSync();
      if (err) issues.push(`${model.collection.collectionName} ${doc._id}: ${Object.keys(err.errors).join(', ')}`);
    }
  }
  return { title: 'Dữ liệu khớp schema', level: 'error', issues };
}

/** Giải mã thử các trường mã hoá — sai DATA_ENCRYPTION_KEY thì hỏng toàn bộ. */
async function encryptionKey(): Promise<Check> {
  const issues: string[] = [];
  const samples = await HouseholdModel.collection.find({}, { projection: { code: 1, members: 1 } }).limit(50).toArray();
  for (const h of samples) {
    for (const m of (h.members ?? []) as Record<string, unknown>[]) {
      for (const field of ['fullName', 'citizenId', 'phone']) {
        const v = m[field];
        if (v === undefined || v === null) continue;
        if (!isEncrypted(v)) {
          issues.push(`${h.code}: ${field} chưa mã hoá`);
          continue;
        }
        try {
          decryptField(v);
        } catch {
          issues.push(`${h.code}: không giải mã được ${field} (sai DATA_ENCRYPTION_KEY?)`);
        }
      }
    }
  }
  return { title: 'Khoá mã hoá giải mã được dữ liệu', level: 'error', issues };
}

async function householdRules(): Promise<Check[]> {
  const [households, areas] = await Promise.all([
    HouseholdModel.find().select('code areaId areaName members._id members.relation members.citizenIdHash members.residenceStatus members.residenceFrom members.residenceTo').lean(),
    AreaModel.find().select('name').lean(),
  ]);
  const areaById = new Map(areas.map((a) => [String(a._id), a.name]));
  const today = toISODate(new Date());

  const heads: string[] = [];
  const areaRefs: string[] = [];
  const residence: string[] = [];
  const overdue: string[] = [];
  const cccdOwners = new Map<string, string[]>();

  for (const h of households) {
    const count = h.members.filter((m) => m.relation === 'chu_ho').length;
    if (h.members.length > 0 && count !== 1) heads.push(`${h.code}: ${count} chủ hộ`);
    if (h.members.length === 0) heads.push(`${h.code}: hộ không có nhân khẩu`);

    const areaName = areaById.get(String(h.areaId));
    if (!areaName) areaRefs.push(`${h.code}: khu vực ${h.areaId} không tồn tại`);
    else if (areaName !== h.areaName) areaRefs.push(`${h.code}: areaName "${h.areaName}" ≠ "${areaName}"`);

    h.members.forEach((m, i) => {
      if (m.residenceStatus !== 'thuong_tru' && !m.residenceFrom) residence.push(`${h.code} #${i + 1}: ${m.residenceStatus} thiếu ngày bắt đầu`);
      if (m.residenceStatus !== 'thuong_tru' && m.residenceTo && m.residenceTo < today) {
        overdue.push(`${h.code} #${i + 1}: ${m.residenceStatus} hết hạn ${m.residenceTo}`);
      }
      if (m.citizenIdHash) cccdOwners.set(m.citizenIdHash, [...(cccdOwners.get(m.citizenIdHash) ?? []), `${h.code} #${i + 1}`]);
    });
  }

  const duplicateCccd = [...cccdOwners.values()].filter((v) => v.length > 1).map((v) => `CCCD trùng: ${v.join(', ')}`);
  return [
    { title: 'Mỗi hộ có đúng một chủ hộ', level: 'error', issues: heads },
    { title: 'Hộ trỏ đúng khu vực', level: 'error', issues: areaRefs },
    { title: 'Không trùng số CCCD', level: 'error', issues: duplicateCccd },
    { title: 'Tạm trú / tạm vắng có ngày bắt đầu', level: 'warn', issues: residence },
    { title: 'Tạm trú / tạm vắng chưa quá hạn (cần gia hạn hoặc cập nhật)', level: 'warn', issues: overdue },
  ];
}

async function accountRules(): Promise<Check[]> {
  const users = await UserModel.find().select('role residentRef').lean();
  const households = await HouseholdModel.find().select('code members._id').lean();
  const memberIds = new Set(households.flatMap((h) => h.members.map((m) => String(m._id))));
  const householdIds = ids(households);

  const broken = users
    .filter((u) => u.residentRef)
    .filter((u) => !householdIds.has(String(u.residentRef!.householdId)) || !memberIds.has(String(u.residentRef!.memberId)))
    .map((u) => `tài khoản ${u._id}: liên kết tới nhân khẩu không còn tồn tại`);
  const unlinked = users.filter((u) => u.role === 'cu_dan' && !u.residentRef).map((u) => `tài khoản cư dân ${u._id} chưa liên kết hộ`);
  const leaders = users.filter((u) => u.role === 'truong_kp').length;

  return [
    { title: 'Liên kết tài khoản ↔ nhân khẩu hợp lệ', level: 'error', issues: broken },
    { title: 'Có ít nhất một tài khoản trưởng KP', level: 'error', issues: leaders ? [] : ['không có tài khoản truong_kp'] },
    { title: 'Tài khoản cư dân đã liên kết hộ', level: 'warn', issues: unlinked },
  ];
}

async function referenceRules(): Promise<Check[]> {
  const [funds, households, payments, reports] = await Promise.all([
    FundModel.find().select('_id').lean(),
    HouseholdModel.find().select('_id').lean(),
    FundPaymentModel.find().select('fundId householdId householdCode').lean(),
    ReportModel.find().select('code reporter.householdId').lean(),
  ]);
  const fundIds = ids(funds);
  const householdIds = ids(households);

  return [
    {
      title: 'Khoản đóng quỹ trỏ đúng quỹ và hộ',
      level: 'error',
      issues: payments
        .filter((p) => !fundIds.has(String(p.fundId)) || !householdIds.has(String(p.householdId)))
        .map((p) => `khoản đóng ${p._id} (${p.householdCode})`),
    },
    {
      title: 'Phản ánh trỏ đúng hộ của người gửi',
      level: 'warn',
      issues: reports
        .filter((r) => r.reporter.householdId && !householdIds.has(String(r.reporter.householdId)))
        .map((r) => `${r.code}: hộ không còn tồn tại`),
    },
  ];
}

/** Index trong DB khớp khai báo trong model (thiếu → chạy db:sync-indexes). */
async function indexes(): Promise<Check> {
  const issues: string[] = [];
  for (const model of Object.values(mongoose.models)) {
    const diff = await model.diffIndexes();
    if (diff.toCreate.length) issues.push(`${model.collection.collectionName}: thiếu ${diff.toCreate.length} index`);
    if (diff.toDrop.length) issues.push(`${model.collection.collectionName}: thừa index ${diff.toDrop.join(', ')}`);
  }
  return { title: 'Index đầy đủ (sửa: npm run db:sync-indexes)', level: 'warn', issues };
}

const CHECKS: (() => Promise<Check | Check[]>)[] = [encryptionKey, schemaValidity, householdRules, accountRules, referenceRules, indexes];


export async function runChecks(): Promise<Check[]> {
  return (await Promise.all(CHECKS.map((c) => c()))).flat();
}
