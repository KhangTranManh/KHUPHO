import type { z } from 'zod';
import { listQueryWithFilter } from '../../common/http/listQuery.js';
import { CHANGE_TYPES } from './residentChange.model.js';

/** GET /changes?search=&filter=<loại biến động>|all&page=&pageSize= */
export const changeListQuerySchema = listQueryWithFilter(CHANGE_TYPES);
export type ChangeListQuery = z.output<typeof changeListQuerySchema>;
