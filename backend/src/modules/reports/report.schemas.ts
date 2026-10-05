import { z } from 'zod';
import { listQueryWithFilter } from '../../common/http/listQuery.js';
import { REPORT_CATEGORIES, REPORT_HANDLER_ROLES, REPORT_SEVERITIES, REPORT_STATUSES } from './report.constants.js';

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

const pointSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

/**
 * GET /reports?search=&filter=<trạng thái>|all&kind=phan_anh|sos&page=&pageSize=
 * `kind` để trống = cả hai.
 */
export const reportListQuerySchema = listQueryWithFilter(REPORT_STATUSES).extend({
  kind: z.enum(['phan_anh', 'sos']).optional(),
});
export type ReportListQuery = z.output<typeof reportListQuerySchema>;

/** POST /reports — phản ánh thường. Người gửi lấy từ tài khoản, không nhận từ body. */
export const createReportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES.filter((c) => c !== 'sos') as [string, ...string[]], {
    error: 'Vui lòng chọn loại phản ánh',
  }),
  severity: z.enum(REPORT_SEVERITIES).default('thuong'),
  title: z.string({ error: 'Vui lòng nhập tiêu đề' }).trim().min(5, 'Tiêu đề quá ngắn').max(150),
  description: z.string({ error: 'Vui lòng mô tả sự việc' }).trim().min(10, 'Mô tả quá ngắn').max(2000),
  address: z.string({ error: 'Vui lòng nhập địa điểm' }).trim().min(3).max(255),
  point: pointSchema.optional(),
  images: z.array(z.url().max(500)).max(5).default([]),
  assignedRole: z.enum(REPORT_HANDLER_ROLES).optional(),
  reporterPhone: optionalText(20),
});
export type CreateReportInput = z.output<typeof createReportSchema>;

/** POST /sos — mọi trường tuỳ chọn để gửi nhanh nhất có thể. */
export const createSosSchema = z.object({
  message: optionalText(500),
  address: optionalText(255),
  point: pointSchema.optional(),
  phone: optionalText(20),
});
export type CreateSosInput = z.output<typeof createSosSchema>;

/** PATCH /reports/:id (và /sos/:id) — cán bộ xử lý; mỗi thay đổi ghi một dòng lịch sử. */
export const updateReportSchema = z
  .object({
    status: z.enum(REPORT_STATUSES).optional(),
    assignedRole: z.enum(REPORT_HANDLER_ROLES).optional(),
    note: optionalText(1000),
  })
  .refine((v) => v.status || v.assignedRole || v.note, { message: 'Không có gì để cập nhật' });
export type UpdateReportInput = z.output<typeof updateReportSchema>;
