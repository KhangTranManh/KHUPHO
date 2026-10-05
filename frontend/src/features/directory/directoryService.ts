import { appConfig } from '@/config/app';
import { apiGet } from '@/services/api';
import type { DirectoryEntry } from './types';

export async function getDirectory(): Promise<DirectoryEntry[]> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.directory();
  }
  return apiGet('/directory');
}
