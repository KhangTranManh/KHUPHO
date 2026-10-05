import { appConfig } from '@/config/app';
import { apiGet } from '@/services/api';
import type { WelfareHousehold } from './types';

/** Toàn bộ hộ chính sách / khó khăn (householdType ≠ thường) — dùng vẽ sơ đồ. Chỉ cán bộ. */
export async function getWelfareHouseholds(): Promise<WelfareHousehold[]> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.welfareHouseholds();
  }
  return apiGet('/welfare-households');
}
