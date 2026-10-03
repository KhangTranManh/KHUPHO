import { appConfig } from '@/config/app';
import { apiGet, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { TemporaryKind, TemporaryRecord } from './types';

export type TemporaryQuery = ListQuery<TemporaryKind>;

export async function getTemporaryRecords(query: TemporaryQuery): Promise<Paged<TemporaryRecord>> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.temporaryRecords(query);
  }
  return apiGet(`/temporary-records${toQueryString(query)}`);
}
