import { z } from 'zod';
import { listQueryWithFilter } from '../../common/http/listQuery.js';
import { PAYMENT_METHODS } from './fundPayment.model.js';

/** GET /funds/:id/households?search=&filter=da_dong|chua_dong|all&page=&pageSize= */
export const fundHouseholdQuerySchema = listQueryWithFilter(['da_dong', 'chua_dong'] as const);
export type FundHouseholdQuery = z.output<typeof fundHouseholdQuerySchema>;

/** POST /funds/:id/payments — cán bộ đánh dấu hộ đã đóng. Bỏ trống amount = mức mặc định. */
export const markPaidSchema = z.object({
  householdId: z.string().regex(/^[a-f\d]{24}$/i, 'Mã hộ không hợp lệ'),
  amount: z.number().int().min(1000, 'Số tiền tối thiểu 1.000 đ').max(100_000_000).optional(),
  method: z.enum(PAYMENT_METHODS),
  transactionCode: z.string().trim().max(60).optional().transform((v) => v || undefined),
});
export type MarkPaidInput = z.output<typeof markPaidSchema>;
