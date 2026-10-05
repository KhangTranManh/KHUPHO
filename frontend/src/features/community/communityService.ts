import { appConfig } from '@/config/app';
import { apiGet, apiPost, toQueryString } from '@/services/api';
import type { ListQuery, Paged } from '@/types/common';
import type { Activity, CulturalFamily, CulturalResult, Survey } from './types';

export type CulturalFamilyQuery = ListQuery<CulturalResult> & { year?: number };

const mock = () => import('@/mocks/mockApi').then((m) => m.mockApi);

export async function getSurveys(): Promise<Survey[]> {
  if (appConfig.useMock) return (await mock()).surveys();
  return apiGet('/surveys');
}

/** `answers[i]` = chỉ số phương án được chọn ở câu i. Mỗi tài khoản trả lời một lần. */
export async function submitSurvey(surveyId: string, answers: number[]): Promise<Survey> {
  if (appConfig.useMock) return (await mock()).submitSurvey(surveyId, answers);
  return apiPost(`/surveys/${surveyId}/responses`, { answers });
}

/** Lịch sinh hoạt, sắp xếp theo ngày. */
export async function getActivities(): Promise<Activity[]> {
  if (appConfig.useMock) return (await mock()).activities();
  return apiGet('/activities');
}

export async function getCulturalFamilies(query: CulturalFamilyQuery): Promise<Paged<CulturalFamily>> {
  if (appConfig.useMock) return (await mock()).culturalFamilies(query);
  return apiGet(`/cultural-families${toQueryString(query)}`);
}
