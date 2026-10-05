import { appConfig } from '@/config/app';
import { apiGet, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { Area, Household, HousingType } from './types';

/** `filter` = loại nhà ở (thấp tầng / cao tầng). */
export type HouseholdQuery = ListQuery<HousingType>;

export async function getHouseholds(query: HouseholdQuery): Promise<Paged<Household>> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.households(query);
  }
  return apiGet(`/households${toQueryString(query)}`);
}

export async function getAreas(): Promise<Area[]> {
  if (appConfig.useMock) {
    const { mockApi } = await import('@/mocks/mockApi');
    return mockApi.areas();
  }
  return apiGet('/areas');
}
