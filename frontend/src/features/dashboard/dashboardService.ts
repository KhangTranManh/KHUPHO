import { appConfig } from '@/config/app';
import { apiGet } from '@/services/api';
import type { OfficerDashboard, PoliceDashboard, ResidentDashboard } from './types';

/** Mỗi vai trò một dashboard: trưởng KP / công an KV / cư dân. */
const mock = () => import('@/mocks/mockApi').then((m) => m.mockApi);

export async function getOfficerDashboard(): Promise<OfficerDashboard> {
  if (appConfig.useMock) return (await mock()).officerDashboard();
  return apiGet('/dashboard/officer');
}

export async function getPoliceDashboard(): Promise<PoliceDashboard> {
  if (appConfig.useMock) return (await mock()).policeDashboard();
  return apiGet('/dashboard/police');
}

export async function getResidentDashboard(): Promise<ResidentDashboard> {
  if (appConfig.useMock) return (await mock()).residentDashboard();
  return apiGet('/dashboard/resident');
}
