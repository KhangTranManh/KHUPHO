/**
 * Tra cứu nhanh một người / một hộ và tài khoản liên quan (dữ liệu được GIẢI MÃ để xem).
 *   npm run db:find -- 0912345678        # theo SĐT (nhân khẩu + tài khoản)
 *   npm run db:find -- 079060000001      # theo CCCD (12 số)
 *   npm run db:find -- HK-1001           # theo mã hộ
 *   npm run db:find -- "nguyen van an"   # theo họ tên (khớp từ đầy đủ, không cần dấu)
 * In thông tin cá nhân ra màn hình → chỉ chạy trên máy của người có quyền.
 */
import { blindIndex, searchTokens } from '../../backend/src/common/security/fieldEncryption.js';
import { HouseholdModel, type HouseholdDocument } from '../../backend/src/modules/households/household.model.js';
import { UserModel } from '../../backend/src/modules/users/user.model.js';
import { runScript } from './lib/run.js';

const MAX_HOUSEHOLDS = 10;

function filterFor(query: string): { filter: Record<string, unknown>; kind: string } {
  const compact = query.replace(/[\s.()-]/g, '');
  if (/^(0|\+84)\d{9}$/.test(compact)) {
    const hash = blindIndex('phone', compact);
    return { kind: 'SĐT', filter: { $or: [{ 'members.phoneHash': hash }] } };
  }
  if (/^\d{12}$/.test(compact)) return { kind: 'CCCD', filter: { 'members.citizenIdHash': blindIndex('cccd', compact) } };
  if (/^HK-/i.test(query)) return { kind: 'mã hộ', filter: { code: query.toUpperCase() } };
  const tokens = searchTokens(query);
  return { kind: 'họ tên', filter: tokens.length ? { 'members.searchTokens': { $all: tokens } } : { _id: null } };
}

async function printAccounts(filter: Record<string, unknown>, label: string) {
  const users = await UserModel.find(filter).select('+passwordHash');
  for (const u of users) {
    console.log(
      `  ${label}: ${u.get('fullName')} — ${u.role}, ${u.status}` +
        `${u.passwordHash ? '' : ', CHƯA KÍCH HOẠT'}${u.mustChangePassword ? ', phải đổi mật khẩu' : ''}` +
        `${u.lastLoginAt ? `, đăng nhập gần nhất ${u.lastLoginAt.toLocaleString('vi-VN')}` : ''}`,
    );
  }
  return users.length;
}

function printHousehold(h: HouseholdDocument, highlight: (m: HouseholdDocument['members'][number]) => boolean) {
  console.log(`\n■ ${h.code} — ${h.address} (${h.areaName}), loại hộ: ${h.householdType}`);
  console.table(
    h.members.map((m) => ({
      '': highlight(m) ? '→' : '',
      'Họ tên': m.get('fullName') as string,
      'Quan hệ': m.relation,
      'Ngày sinh': m.dateOfBirth,
      CCCD: (m.get('citizenId') as string | undefined) ?? '',
      SĐT: (m.get('phone') as string | undefined) ?? '',
      'Cư trú': m.residenceStatus + (m.residenceTo ? ` (đến ${m.residenceTo})` : ''),
    })),
  );
}

runScript(async () => {
  const query = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ').trim();
  if (!query) throw new Error('Cần từ khoá. VD: npm run db:find -- 0912345678');

  const { kind, filter } = filterFor(query);
  console.log(`Tìm theo ${kind}: "${query}"`);

  const households = await HouseholdModel.find(filter).limit(MAX_HOUSEHOLDS);
  const tokens = new Set(searchTokens(query));
  const compact = query.replace(/[\s.()-]/g, '');
  const highlight = (m: HouseholdDocument['members'][number]) =>
    (kind === 'SĐT' && m.phoneHash === blindIndex('phone', compact)) ||
    (kind === 'CCCD' && m.citizenIdHash === blindIndex('cccd', compact)) ||
    (kind === 'họ tên' && [...tokens].every((t) => m.searchTokens.includes(t)));

  for (const h of households) {
    printHousehold(h, highlight);
    const linked = await printAccounts({ 'residentRef.householdId': h._id }, 'Tài khoản cư dân của hộ');
    if (!linked) console.log('  (hộ chưa có tài khoản cư dân nào)');
  }
  if (households.length === MAX_HOUSEHOLDS) console.log(`\n… chỉ hiện ${MAX_HOUSEHOLDS} hộ đầu tiên, hãy tìm cụ thể hơn.`);

  // SĐT có thể là tài khoản cán bộ (không thuộc hộ nào).
  if (kind === 'SĐT') {
    console.log('\nTài khoản đăng nhập bằng SĐT này:');
    if (!(await printAccounts({ phoneHash: blindIndex('phone', compact) }, 'Tài khoản'))) console.log('  (không có)');
  }
  if (!households.length && kind !== 'SĐT') console.log('Không tìm thấy hộ / nhân khẩu nào.');
});
