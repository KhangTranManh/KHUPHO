/**
 * Thêm một tài khoản CHƯA KÍCH HOẠT theo SĐT — người dùng tự kích hoạt khi đăng nhập lần đầu
 * (OTP Firebase hoặc mật khẩu tạm) rồi đặt mật khẩu mới.
 *   npm run add-user -- <SĐT> <vai trò> "<Họ tên>" [--household HK-1002]
 *   VD: npm run add-user -- 0987654321 cu_dan "Nguyễn Văn B" --household HK-1002
 *       npm run add-user -- 0912345678 truong_kp "Lê Văn C"
 * Vai trò: truong_kp / cong_an_kv / cu_dan.
 * Cư dân: tự liên kết với nhân khẩu có cùng SĐT; hoặc chỉ định --household để liên kết với CHỦ HỘ của hộ đó.
 * SĐT đã có tài khoản → chỉ in thông tin, không sửa gì.
 */
import { blindIndex } from '../../backend/src/common/security/fieldEncryption.js';
import { HouseholdModel } from '../../backend/src/modules/households/household.model.js';
import { UserModel } from '../../backend/src/modules/users/user.model.js';
import { createUser } from '../../backend/src/modules/users/user.service.js';
import { getOption, positionalArgs, runScript } from './lib/run.js';
import { firstLoginAccounts, linkResidentAccounts } from './seeds/users.js';

runScript(async () => {
  const [phone, role, ...nameParts] = positionalArgs(['household']);
  if (!phone || !role) {
    throw new Error('Cách dùng: npm run add-user -- <SĐT> <truong_kp|cong_an_kv|cu_dan> "<Họ tên>" [--household HK-1002]');
  }
  const [account] = firstLoginAccounts(`${phone}:${role}:${nameParts.join(' ')}`); // kiểm tra SĐT + vai trò
  const householdCode = getOption('household')?.toUpperCase();
  if (householdCode && account.role !== 'cu_dan') throw new Error('--household chỉ dùng cho vai trò cu_dan');

  const existing = await UserModel.findOne({ phoneHash: blindIndex('phone', account.phone) }).select('+passwordHash');
  if (existing) {
    console.log(
      `• ${account.phone} đã có tài khoản: ${existing.get('fullName')} — ${existing.role}` +
        `${existing.passwordHash ? ', đã kích hoạt' : ', chưa kích hoạt'}${existing.residentRef ? ', đã liên kết hộ' : ''}. Không thay đổi.`,
    );
    return;
  }

  // Kiểm tra hộ trước khi tạo tài khoản để không tạo dở dang.
  let link: { householdId: unknown; memberId: unknown } | undefined;
  if (householdCode) {
    const household = await HouseholdModel.findOne({ code: householdCode }).select('code members._id members.relation');
    if (!household) throw new Error(`Không có hộ ${householdCode}`);
    const head = household.members.find((m) => m.relation === 'chu_ho');
    if (!head) throw new Error(`Hộ ${householdCode} chưa có chủ hộ`);
    if (await UserModel.exists({ 'residentRef.memberId': head._id })) throw new Error(`Chủ hộ ${householdCode} đã có tài khoản khác`);
    link = { householdId: household._id, memberId: head._id };
  }

  const created = await createUser(account);
  if (link) await UserModel.updateOne({ _id: created.id }, { $set: { residentRef: link } });
  else if (account.role === 'cu_dan') await linkResidentAccounts();

  const user = await UserModel.findById(created.id);
  console.log(`✓ Đã tạo tài khoản ${account.phone} — ${account.fullName} (${account.role}), CHƯA KÍCH HOẠT.`);
  if (account.role === 'cu_dan') {
    console.log(
      user?.residentRef
        ? `  Liên kết hộ: ${householdCode ?? 'theo SĐT nhân khẩu'}`
        : '  Chưa liên kết hộ (không nhân khẩu nào có SĐT này) — chạy lại với --household HK-xxxx nếu cần.',
    );
  }
  console.log('  Người dùng vào trang đăng nhập → "Xác minh qua SMS" → nhập SĐT → đặt mật khẩu mới.');
});
