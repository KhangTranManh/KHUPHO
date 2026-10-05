import { z } from 'zod';
import { listQueryWithFilter } from '../../common/http/listQuery.js';
import { RESIDENCE_STATUSES, RESIDENT_CATEGORIES } from './resident.constants.js';

/**
 * GET /residents?search=&filter=thuong_tru|tam_tru|tam_vang|all&category=nguoi_cao_tuoi&page=&pageSize=
 * `filter` = tình trạng cư trú, `category` = nhóm đối tượng (tuỳ chọn).
 */
export const residentListQuerySchema = listQueryWithFilter(RESIDENCE_STATUSES).extend({
  category: z.enum(RESIDENT_CATEGORIES).optional(),
});
export type ResidentListQuery = z.output<typeof residentListQuerySchema>;
