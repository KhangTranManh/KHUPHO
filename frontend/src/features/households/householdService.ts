import { appConfig } from '@/config/app';
import { apiGet, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { Household, ResidentialGroup } from './types';

/** `filter` = id tổ dân phố. */
export type HouseholdQuery = ListQuery<string>;

export async function getHouseholds(query: HouseholdQuery): Promise<Paged<Household>> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.households(query);
  }
  return apiGet(`/households${toQueryString(query)}`);
}

export async function getGroups(): Promise<ResidentialGroup[]> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.groups();
  }
  return apiGet('/groups');
}
