import { appConfig } from '@/config/app';
import { apiGet } from '@/services/api';
import type { Officer } from './types';

export async function getCurrentOfficer(): Promise<Officer> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.currentOfficer();
  }
  return apiGet('/me');
}
