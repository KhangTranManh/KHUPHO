import { appConfig } from '@/config/app';
import { apiGet } from '@/services/api';
import type { DashboardSummary } from './types';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.dashboard();
  }
  return apiGet('/dashboard/summary');
}
