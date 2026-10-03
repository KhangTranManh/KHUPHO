import type { z } from 'zod';
import { Errors } from '../errors/AppError.js';

/**
 * Kiểm tra dữ liệu đầu vào bằng zod schema, trả về dữ liệu đã chuẩn hoá và có kiểu.
 * Dùng trong controller: `const input = parseInput(loginSchema, req.body);`
 */
export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw Errors.validation(
      result.error.issues.map((i) => ({ field: i.path.join('.') || '(body)', message: i.message })),
    );
  }
  return result.data;
}
