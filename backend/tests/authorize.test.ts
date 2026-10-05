import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/common/errors/AppError.js';
import { authorize } from '../src/common/middlewares/authorize.js';
import type { AuthContext } from '../src/modules/auth/auth.types.js';

const run = (auth: AuthContext | undefined, ...roles: Parameters<typeof authorize>) => {
  const next = vi.fn() as unknown as NextFunction;
  const req = { auth } as Request;
  try {
    authorize(...roles)(req, {} as Response, next);
    return { next, error: undefined };
  } catch (error) {
    return { next, error: error as AppError };
  }
};

const ctx = (role: AuthContext['role']): AuthContext => ({ userId: 'u', sessionId: 's', role });

describe('authorize()', () => {
  it('cho qua khi vai trò nằm trong danh sách', () => {
    const { next, error } = run(ctx('cong_an_kv'), 'truong_kp', 'cong_an_kv');
    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('chặn 403 khi sai vai trò', () => {
    const { next, error } = run(ctx('cu_dan'), 'truong_kp', 'cong_an_kv');
    expect(error?.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('chặn 401 khi chưa xác thực', () => {
    const { error } = run(undefined, 'truong_kp');
    expect(error?.status).toBe(401);
  });
});
