import { z } from 'zod';
import { DIRECTORY_GROUPS } from './directory.model.js';

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

/** POST /directory — cán bộ thêm số vào sổ tay. */
export const createDirectorySchema = z.object({
  group: z.enum(DIRECTORY_GROUPS),
  unit: z.string().trim().min(2).max(150),
  personInCharge: optionalText(120),
  phone: z.string().trim().regex(/^[0-9 +().-]{3,20}$/, 'Số điện thoại không hợp lệ'),
  note: optionalText(255),
  order: z.number().int().min(0).optional(),
});
export type CreateDirectoryInput = z.output<typeof createDirectorySchema>;
