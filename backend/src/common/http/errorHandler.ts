import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { AppError, Errors } from '../errors/AppError.js';
import { logger } from '../logger.js';

/** Route không tồn tại → 404 cùng định dạng lỗi. */
export const notFoundHandler: RequestHandler = (req) => {
  throw Errors.notFound(`Không có endpoint ${req.method} ${req.originalUrl}`);
};

/** Chuyển mọi lỗi về dạng `{ error: { code, message, details? } }`. Đặt cuối cùng trong app. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = toAppError(err);

  if (appError) {
    res.status(appError.status).json({
      error: { code: appError.code, message: appError.message, details: appError.details },
    });
    return;
  }

  logger.error({ err, method: req.method, url: req.originalUrl }, 'Lỗi không xử lý được');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      // Chỉ lộ chi tiết lỗi khi phát triển.
      details: env.isProduction ? undefined : String(err?.message ?? err),
    },
  });
};

/** Nhận diện các lỗi đã biết từ thư viện và quy về AppError. */
function toAppError(err: unknown): AppError | undefined {
  if (err instanceof AppError) return err;

  // JSON body sai cú pháp (express.json)
  if (isObject(err) && err.type === 'entity.parse.failed') return Errors.badRequest('Body JSON không hợp lệ');
  if (isObject(err) && err.type === 'entity.too.large') return Errors.badRequest('Body quá lớn');

  if (err instanceof mongoose.Error.ValidationError) {
    return Errors.validation(
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    );
  }
  if (err instanceof mongoose.Error.CastError) return Errors.badRequest(`Giá trị không hợp lệ cho "${err.path}"`);

  // Vi phạm unique index
  if (isObject(err) && err.code === 11000) return Errors.conflict();

  return undefined;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
