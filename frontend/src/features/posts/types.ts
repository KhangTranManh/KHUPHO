import type { ResidentCategory } from '@/features/residents/types';

/**
 * Bài đăng: thông báo nhanh, tuyên truyền, sự kiện.
 * Giữ đồng bộ với backend/src/modules/posts.
 */
export type PostKind = 'thong_bao_nhanh' | 'tuyen_truyen' | 'su_kien';

export type PostCategory =
  | 'rac'
  | 'cup_dien'
  | 'pccc'
  | 'tiem_chung'
  | 'kham_suc_khoe'
  | 'chinh_sach'
  | 'phong_dich'
  | 'van_dong_quy'
  | 'le_hoi'
  | 'khac';

export interface PostAttachment {
  url: string;
  name: string;
  mimeType?: string;
}

/** Đối tượng nhận: tất cả / một số khu vực / một số nhóm đối tượng. */
export interface PostAudience {
  scope: 'all' | 'area' | 'group';
  areaIds?: string[];
  categories?: ResidentCategory[];
}

export interface Post {
  id: string;
  kind: PostKind;
  category: PostCategory;
  title: string;
  content: string;
  attachments: PostAttachment[];
  eventDate?: string; // yyyy-mm-dd
  eventTime?: string;
  location?: string;
  audience: PostAudience;
  pinned: boolean;
  publishedAt: string;
  author: { name: string };
  /** Số tài khoản đã đọc. */
  readCount: number;
  /** Người đang đăng nhập đã đọc chưa. */
  isRead: boolean;
}

export interface CreatePostInput {
  kind: PostKind;
  category: PostCategory;
  title: string;
  content: string;
  attachments?: PostAttachment[];
  eventDate?: string;
  eventTime?: string;
  location?: string;
  audience?: PostAudience;
  pinned?: boolean;
}
