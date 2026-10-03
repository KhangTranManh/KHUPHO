import { appConfig } from '@/config/app';
import { apiGet, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { ChangeType, ResidentChange } from './types';

export type ChangeQuery = ListQuery<ChangeType>;

export async function getChanges(query: ChangeQuery): Promise<Paged<ResidentChange>> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.changes(query);
  }
  return apiGet(`/changes${toQueryString(query)}`);
}
