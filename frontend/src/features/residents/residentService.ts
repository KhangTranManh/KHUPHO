import { appConfig } from '@/config/app';
import { apiGet, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { Resident, ResidenceStatus, ResidentCategory } from './types';

/** `filter` = tình trạng cư trú; `category` = lọc thêm theo nhóm đối tượng. */
export type ResidentQuery = ListQuery<ResidenceStatus> & { category?: ResidentCategory };

export async function getResidents(query: ResidentQuery): Promise<Paged<Resident>> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.residents(query);
  }
  return apiGet(`/residents${toQueryString(query)}`);
}
