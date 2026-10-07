/** Quản lý tài khoản theo SĐT (bản giả lập — bản thật: backend/src/modules/accounts). */
import type { AccountView, CreateAccountInput, PhoneLookup, UpdateAccountInput, UpdateMemberInput } from '@/features/accounts/types';
import type { Resident } from '@/features/residents/types';
import { ApiError } from '@/services/api';
import { db } from '../db';
import { DEMO_ACCOUNTS } from '../demoAuth';
import { nextId, notFound, respond } from '../helpers';

const normalize = (p: string) => p.replace(/[\s.()-]/g, '').replace(/^\+84/, '0');

/** Tài khoản giả lập — khởi tạo từ tài khoản demo, sửa / thêm chỉ sống tới khi tải lại trang. */
const accounts: AccountView[] = DEMO_ACCOUNTS.map((a) => ({
  id: a.id,
  fullName: a.fullName,
  phone: a.phone,
  role: a.role,
  status: 'active',
  activated: true,
  mustChangePassword: false,
}));

function lookup(phone: string): PhoneLookup {
  const p = normalize(phone);
  const account = accounts.find((a) => a.phone === p) ?? null;
  const members = db.residents
    .filter((r) => r.phone === p)
    .map((member) => ({ household: db.households.find((h) => h.id === member.householdId)!, member }));
  return { phone: p, account, members };
}

export const accountHandlers = {
  lookupPhone: (phone: string) => respond(lookup(phone)),

  createAccount: (input: CreateAccountInput) => {
    const phone = normalize(input.phone);
    if (accounts.some((a) => a.phone === phone)) return Promise.reject(new ApiError(409, 'CONFLICT', 'Số điện thoại đã được dùng cho tài khoản khác'));
    accounts.push({ id: nextId('u'), fullName: input.fullName, phone, role: input.role, status: 'active', activated: false, mustChangePassword: false });
    return respond(lookup(phone));
  },

  updateAccount: (id: string, input: UpdateAccountInput) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return Promise.reject(notFound('tài khoản'));
    if (input.phone && accounts.some((a) => a.id !== id && a.phone === normalize(input.phone!))) {
      return Promise.reject(new ApiError(409, 'CONFLICT', 'Số điện thoại đã được dùng cho tài khoản khác'));
    }
    Object.assign(account, {
      ...(input.fullName && { fullName: input.fullName }),
      ...(input.phone && { phone: normalize(input.phone) }),
      ...(input.role && { role: input.role }),
      ...(input.status && { status: input.status }),
      ...(input.resetPassword && { activated: false }),
    });
    return respond(lookup(account.phone!));
  },

  updateMember: (householdId: string, memberId: string, input: UpdateMemberInput) => {
    const member = db.residents.find((r) => r.id === memberId && r.householdId === householdId);
    const household = db.households.find((h) => h.id === householdId);
    if (!member || !household) return Promise.reject(notFound('nhân khẩu'));
    const clear = (v?: string) => (v === '' ? undefined : v);
    const patch: Partial<Resident> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || k === 'residenceNote') continue;
      (patch as Record<string, unknown>)[k] = typeof v === 'string' ? clear(v) : v;
    }
    if (patch.residenceStatus === 'thuong_tru') Object.assign(patch, { residenceFrom: undefined, residenceTo: undefined });
    Object.assign(member, patch);
    return respond({ household, member });
  },
};
