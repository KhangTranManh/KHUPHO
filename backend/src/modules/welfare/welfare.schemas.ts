import { z } from 'zod';
import { HOUSEHOLD_TYPES } from '../households/household.constants.js';

/** PUT /welfare-households — cán bộ đặt loại hộ (và toạ độ cho sơ đồ) của một hộ. */
export const updateWelfareSchema = z.object({
  householdId: z.string().regex(/^[a-f\d]{24}$/i, 'Mã hộ không hợp lệ'),
  householdType: z.enum(HOUSEHOLD_TYPES),
  location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
});
export type UpdateWelfareInput = z.output<typeof updateWelfareSchema>;
