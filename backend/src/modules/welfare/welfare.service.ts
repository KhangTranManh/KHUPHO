import { toHouseholdView } from '../households/household.mapper.js';
import { HouseholdModel } from '../households/household.model.js';
import { findHouseholdOrThrow } from '../households/household.service.js';
import type { UpdateWelfareInput } from './welfare.schemas.js';

type HouseholdRaw = Parameters<typeof toHouseholdView>[0];

/** Hộ chính sách / khó khăn kèm số thành viên cần quan tâm (người cao tuổi, khuyết tật). */
function toWelfareView(h: HouseholdRaw) {
  const members = (h.members ?? []) as { categories?: string[] }[];
  const count = (c: string) => members.filter((m) => m.categories?.includes(c)).length;
  return {
    ...toHouseholdView(h),
    elderlyCount: count('nguoi_cao_tuoi'),
    disabledCount: count('nguoi_khuyet_tat'),
  };
}

/** Mọi hộ khác "thuong" — dùng vẽ sơ đồ theo khu vực / toạ độ. Số lượng nhỏ nên trả hết. */
export async function listWelfareHouseholds() {
  const households = await HouseholdModel.find({ householdType: { $ne: 'thuong' } })
    .sort({ areaName: 1, code: 1 })
    .lean();
  return households.map(toWelfareView);
}

/** Đặt loại hộ (và toạ độ). Đặt "thuong" = đưa hộ ra khỏi danh sách. */
export async function updateWelfareHousehold(input: UpdateWelfareInput) {
  const household = await findHouseholdOrThrow(input.householdId);
  household.householdType = input.householdType;
  if (input.location) household.set('location', { type: 'Point', coordinates: [input.location.lng, input.location.lat] });
  await household.save();
  return toWelfareView(household);
}
