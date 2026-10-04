import { appConfig } from '@/config/app';

/**
 * HTTP client dùng chung. Mọi lời gọi backend đi qua đây:
 *  - tự gắn access token (Authorization: Bearer);
 *  - gặp 401 → refresh token một lần rồi gọi lại;
 *  - lỗi trả về luôn là ApiError với `code` + `message` tiếng Việt từ backend.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Phản hồi của /auth/login và /auth/refresh. `user` để feature auth tự định kiểu. */
export interface SessionPayload {
  accessToken: string;
  expiresIn: number;
  user: unknown;
}

// Access token chỉ giữ trong bộ nhớ — không lưu localStorage (tránh bị XSS đọc).
// Tải lại trang sẽ mất, và được khôi phục bằng refresh cookie (httpOnly).
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

let sessionExpiredHandler: (() => void) | undefined;
/** Đăng ký hàm gọi khi refresh thất bại (phiên hết hạn / bị thu hồi). */
export const onSessionExpired = (handler?: () => void) => {
  sessionExpiredHandler = handler;
};

async function send(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ, vui lòng kiểm tra mạng');
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => undefined)) as
    | { error?: { code?: string; message?: string; details?: unknown } }
    | undefined;
  if (body?.error?.message) {
    return new ApiError(res.status, body.error.code ?? 'UNKNOWN', body.error.message, body.error.details);
  }
  return res.status >= 500
    ? new ApiError(res.status, 'SERVER_UNAVAILABLE', 'Máy chủ không phản hồi, vui lòng thử lại sau')
    : new ApiError(res.status, 'UNKNOWN', `Lỗi ${res.status}`);
}

async function request<T>(path: string, init?: RequestInit, canRetry = true): Promise<T> {
  const res = await send(path, init);

  // Access token hết hạn → refresh rồi thử lại đúng một lần (trừ chính các route /auth/*).
  if (res.status === 401 && canRetry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return request<T>(path, init, false);
    sessionExpiredHandler?.();
  }

  if (!res.ok) throw await toApiError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>(path);

export const apiPost = <T = void>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

/** { page: 1, search: 'an', filter: undefined } → "?page=1&search=an" (bỏ giá trị rỗng). */
export function toQueryString(params: object) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/* ---------- Refresh token ---------- */

let refreshInFlight: Promise<SessionPayload | null> | null = null;

/**
 * Lấy access token mới bằng refresh cookie. Trả null nếu phiên không còn.
 * Backend xoay vòng refresh token và coi việc dùng lại token cũ là bị đánh cắp,
 * nên phải đảm bảo chỉ MỘT request refresh tại một thời điểm:
 *  - trong một tab: các lời gọi đồng thời dùng chung một promise;
 *  - giữa các tab: khoá bằng Web Locks API (tab sau chờ tab trước xong, khi đó cookie đã được cập nhật).
 */
export function refreshSession(): Promise<SessionPayload | null> {
  refreshInFlight ??= withCrossTabLock(doRefresh).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<SessionPayload | null> {
  const res = await send('/auth/refresh', { method: 'POST' });
  if (!res.ok) {
    accessToken = null;
    return null;
  }
  const data = (await res.json()) as SessionPayload;
  accessToken = data.accessToken;
  return data;
}

function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('wkp-auth-refresh', fn);
  }
  return fn();
}
