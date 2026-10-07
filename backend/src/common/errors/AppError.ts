/**
 * Lỗi nghiệp vụ có chủ đích. Mọi lỗi trả về client đều đi qua đây để có dạng thống nhất:
 *   { "error": { "code": "INVALID_CREDENTIALS", "message": "...", "details": ... } }
 * `code` ổn định để frontend xử lý; `message` tiếng Việt để hiển thị.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface FieldIssue {
  field: string;
  message: string;
}

/** Các lỗi hay dùng — tạo qua đây thay vì `new AppError(...)` rải rác. */
export const Errors = {
  validation: (details: FieldIssue[]) =>
    new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ', details),

  badRequest: (message = 'Yêu cầu không hợp lệ') => new AppError(400, 'BAD_REQUEST', message),

  unauthorized: (message = 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn') =>
    new AppError(401, 'UNAUTHORIZED', message),

  invalidCredentials: () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng'),

  forbidden: (message = 'Bạn không có quyền thực hiện thao tác này') =>
    new AppError(403, 'FORBIDDEN', message),

  accountDisabled: () =>
    new AppError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị vô hiệu hoá, vui lòng liên hệ quản trị viên'),

  notFound: (message = 'Không tìm thấy tài nguyên') => new AppError(404, 'NOT_FOUND', message),

  conflict: (message = 'Dữ liệu đã tồn tại') => new AppError(409, 'CONFLICT', message),

  accountLocked: (lockedUntil: Date) =>
    new AppError(
      423,
      'ACCOUNT_LOCKED',
      'Tài khoản tạm khoá do đăng nhập sai nhiều lần, vui lòng thử lại sau',
      { lockedUntil: lockedUntil.toISOString() },
    ),

  passwordChangeRequired: () =>
    new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn cần đổi mật khẩu trước khi tiếp tục'),

  tooManyRequests: () =>
    new AppError(429, 'TOO_MANY_REQUESTS', 'Thao tác quá nhiều lần, vui lòng thử lại sau ít phút'),
};
