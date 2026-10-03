import { appConfig } from '@/config/app';
import { apiGet, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { Resident, ResidenceStatus } from './types';

export type ResidentQuery = ListQuery<ResidenceStatus>;

export async function getResidents(query: ResidentQuery): Promise<Paged<Resident>> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.residents(query);
  }
  return apiGet(`/residents${toQueryString(query)}`);
}
