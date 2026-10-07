import { appConfig } from '@/config/app';
import { apiGet, apiPatch, apiPost, toQueryString } from '@/services/api';
import type { Household } from '@/features/households/types';
import type { Resident } from '@/features/residents/types';
import type { CreateAccountInput, PhoneLookup, UpdateAccountInput, UpdateMemberInput } from './types';

const mock = () => import('@/mocks/mockApi').then((m) => m.mockApi);

/** Tra một SĐT: tài khoản đăng nhập + các nhân khẩu ghi SĐT đó. */
export async function lookupPhone(phone: string): Promise<PhoneLookup> {
  if (appConfig.useMock) return (await mock()).lookupPhone(phone);
  return apiGet(`/accounts/lookup${toQueryString({ phone })}`);
}

/** Tạo tài khoản chưa kích hoạt cho SĐT (người dùng tự đặt mật khẩu khi đăng nhập lần đầu). */
export async function createAccount(input: CreateAccountInput): Promise<PhoneLookup> {
  if (appConfig.useMock) return (await mock()).createAccount(input);
  return apiPost('/accounts', input);
}

/** Sửa tài khoản — trả kết quả tra cứu theo SĐT (mới). Backend tự mã hoá + băm lại SĐT / họ tên. */
export async function updateAccount(id: string, input: UpdateAccountInput): Promise<PhoneLookup> {
  if (appConfig.useMock) return (await mock()).updateAccount(id, input);
  return apiPatch(`/accounts/${id}`, input);
}

/** Sửa một nhân khẩu — backend tự mã hoá + băm lại họ tên / SĐT / CCCD và token tìm kiếm. */
export async function updateMember(householdId: string, memberId: string, input: UpdateMemberInput) {
  if (appConfig.useMock) return (await mock()).updateMember(householdId, memberId, input);
  return apiPatch<{ household: Household; member: Resident }>(`/accounts/members/${householdId}/${memberId}`, input);
}
