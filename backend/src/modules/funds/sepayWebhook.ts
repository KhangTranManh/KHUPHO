import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Errors } from '../../common/errors/AppError.js';
import { parseInput } from '../../common/http/validation.js';
import { env } from '../../config/env.js';
import { handleIncomingTransfer } from './bankTransfer.service.js';

/**
 * Webhook SePay (sepay.vn) — SePay theo dõi tài khoản ngân hàng nhận tiền quỹ, mỗi giao dịch gọi:
 *   POST /api/payments/sepay-webhook
 *   Authorization: Apikey <BANK_WEBHOOK_API_KEY>
 * Cấu hình trên SePay: Webhooks → URL trên, kiểu xác thực "API Key", key = BANK_WEBHOOK_API_KEY trong .env.
 * Trả 200 { success: true } để SePay không gửi lại; lỗi xác thực → 401.
 */
const sepayBodySchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  transferType: z.enum(['in', 'out']),
  transferAmount: z.coerce.number().nonnegative(),
  content: z.string().max(500).default(''),
  accountNumber: z.string().optional(),
  referenceCode: z.string().nullish(),
  /** "2026-10-05 14:02:37" — giờ Việt Nam. */
  transactionDate: z.string(),
});

/** So khoá bằng thời gian không đổi (không lộ khoá qua thời gian phản hồi). */
function validApiKey(header: string | undefined) {
  const expected = env.BANK_WEBHOOK_API_KEY;
  const given = header?.replace(/^Apikey\s+/i, '') ?? '';
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "2026-10-05 14:02:37" (giờ VN) → Date. Không đọc được → thời điểm nhận. */
function parseVnDate(value: string) {
  const d = new Date(`${value.trim().replace(' ', 'T')}+07:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function sepayWebhook(req: Request, res: Response) {
  if (env.BANK_WEBHOOK_PROVIDER !== 'sepay') throw Errors.notFound();
  if (!validApiKey(req.get('authorization'))) throw Errors.unauthorized('Sai API key webhook');

  const body = parseInput(sepayBodySchema, req.body);
  if (body.transferType !== 'in') {
    res.json({ success: true, status: 'ignored' }); // tiền ra — không liên quan thu quỹ
    return;
  }

  const result = await handleIncomingTransfer({
    provider: 'sepay',
    providerId: body.id,
    amount: body.transferAmount,
    content: body.content,
    accountNumber: body.accountNumber,
    referenceCode: body.referenceCode ?? undefined,
    transactionAt: parseVnDate(body.transactionDate),
  });
  res.json({ success: true, ...result });
}
