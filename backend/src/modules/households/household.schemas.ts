import type { z } from 'zod';
import { listQueryWithFilter } from '../../common/http/listQuery.js';
import { HOUSING_TYPES } from './household.constants.js';

/** GET /households?search=&filter=thap_tang|cao_tang|all&page=&pageSize= */
export const householdListQuerySchema = listQueryWithFilter(HOUSING_TYPES);
export type HouseholdListQuery = z.output<typeof householdListQuerySchema>;
