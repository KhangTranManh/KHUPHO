/** Khảo sát & sinh hoạt cộng đồng. Giữ đồng bộ với frontend/src/features/community. */

export const SURVEY_STATUSES = ['dang_mo', 'da_dong'] as const;

export const ACTIVITY_KINDS = ['hop_khu_pho', 'van_nghe', 'the_thao', 'tinh_nguyen', 'le_hoi', 'tap_huan'] as const;

export { CULTURAL_RESULTS } from '../households/household.constants.js';
export const SURVEY_SCOPES = ['all', 'area'] as const;
