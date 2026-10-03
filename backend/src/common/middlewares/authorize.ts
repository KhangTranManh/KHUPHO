import type { RequestHandler } from 'express';
import type { Role } from '../../modules/users/user.roles.js';
import { Errors } from '../errors/AppError.js';

/**
 * Chỉ cho các vai trò được liệt kê. Đặt sau `authenticate`.
 *   router.get('/users', authenticate, authorize('admin'), ...)
 *   router.get('/residents', authenticate, authorize('admin', 'can_bo'), ...)
 */
export const authorize =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw Errors.unauthorized();
    if (!allowed.includes(req.auth.role)) throw Errors.forbidden();
    next();
  };
