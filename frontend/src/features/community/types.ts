/** Khảo sát & sinh hoạt cộng đồng. Giữ đồng bộ với backend/src/modules/community. */

export type SurveyStatus = 'dang_mo' | 'da_dong';

/** Câu hỏi chọn một phương án. */
export interface SurveyQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: SurveyStatus;
  startDate: string;
  endDate: string; // thời hạn
  /** Phạm vi: toàn khu phố hoặc một số khu vực. */
  scope: { type: 'all' | 'area'; areaIds?: string[] };
  questions: SurveyQuestion[];
  responseCount: number;
  /** results[i][j] = số lượt chọn phương án j của câu i. */
  results: number[][];
  /** Người đang đăng nhập đã trả lời chưa. */
  hasResponded: boolean;
}

export type ActivityKind = 'hop_khu_pho' | 'van_nghe' | 'the_thao' | 'tinh_nguyen' | 'le_hoi' | 'tap_huan';

/** Lịch sinh hoạt khu phố. */
export interface Activity {
  id: string;
  title: string;
  kind: ActivityKind;
  date: string; // yyyy-mm-dd
  startTime: string; // "19:30"
  endTime?: string;
  location: string;
  content?: string; // nội dung
  organizer?: string;
  /** Biên bản / ghi chú sau buổi sinh hoạt. */
  minutes?: string;
}

export type { CulturalResult } from '@/features/households/types';
import type { CulturalResult } from '@/features/households/types';

/** Bình xét gia đình văn hoá theo năm (lấy từ households.culturalTitles). */
export interface CulturalFamily {
  id: string;
  householdId: string;
  householdCode: string;
  headName: string;
  areaName: string;
  year: number;
  result: CulturalResult;
  /** Số năm liên tiếp đạt. */
  consecutiveYears: number;
  note?: string;
}
