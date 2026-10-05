/** Tiện ích dùng chung cho các handler giả lập API trong mocks/handlers/. */
import type { AuthUser } from '@/features/auth/types';
import { ApiError } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import { currentDemoUser } from './demoAuth';

const LATENCY_MS = 250;

/** Trả kết quả sau một khoảng trễ nhỏ để giống gọi mạng thật. */
export const respond = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

/** Bỏ dấu tiếng Việt để tìm "nguyen van an" khớp "Nguyễn Văn An". */
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function matches(search: string | undefined, ...fields: (string | undefined)[]) {
  const q = search?.trim();
  if (!q) return true;
  const needle = normalize(q);
  return fields.some((f) => f !== undefined && normalize(f).includes(needle));
}

export const passFilter = <F extends string>(filter: F | 'all' | undefined, value: F) =>
  !filter || filter === 'all' || filter === value;

export function paginate<T>(items: T[], q: ListQuery): Paged<T> {
  const start = (q.page - 1) * q.pageSize;
  return { items: items.slice(start, start + q.pageSize), total: items.length, page: q.page, pageSize: q.pageSize };
}

export const notFound = (what: string) => new ApiError(404, 'NOT_FOUND', `Không tìm thấy ${what}`);

/**
 * Người dùng hiện tại cho dữ liệu giả lập. Chế độ demo → tài khoản demo đang đăng nhập;
 * đăng nhập thật nhưng dữ liệu mock → coi như cán bộ.
 */
export const mockCurrentUser = (): Pick<AuthUser, 'id' | 'fullName' | 'role' | 'phone' | 'householdId'> =>
  currentDemoUser() ?? { id: 'mock-officer', fullName: 'Cán bộ khu phố', role: 'truong_kp' };

export const isStaff = (u: Pick<AuthUser, 'role'>) => u.role !== 'cu_dan';

let seq = 1000;
/** Sinh id cho bản ghi tạo mới trong phiên. */
export const nextId = (prefix: string) => `${prefix}${++seq}`;
