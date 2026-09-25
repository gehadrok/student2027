export type ApiErrorKind = 'unauthorized' | 'forbidden' | 'client' | 'server' | 'network' | 'unknown';

export interface ApiErrorEnvelope {
  error?: string;
  message?: string;
  details?: unknown;
  code?: string;
}

export interface ApiErrorInit {
  code?: string;
  details?: unknown;
  method?: string;
  path?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;
  readonly method: string | undefined;
  readonly path: string | undefined;

  constructor(status: number, message: string, init: ApiErrorInit = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = init.code;
    this.details = init.details;
    this.method = init.method;
    this.path = init.path;
    if (init.cause !== undefined) {
      (this as { cause?: unknown }).cause = init.cause;
    }
  }

  get kind(): ApiErrorKind {
    if (this.status === 401) return 'unauthorized';
    if (this.status === 403) return 'forbidden';
    if (this.status === 0) return 'network';
    if (this.status >= 500) return 'server';
    if (this.status >= 400) return 'client';
    return 'unknown';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function isUnauthorizedError(value: unknown): boolean {
  return isApiError(value) && value.isUnauthorized;
}

export function isForbiddenError(value: unknown): boolean {
  return isApiError(value) && value.isForbidden;
}

export function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const envelope = body as ApiErrorEnvelope;
    if (typeof envelope.error === 'string' && envelope.error.trim() !== '') return envelope.error;
    if (typeof envelope.message === 'string' && envelope.message.trim() !== '') return envelope.message;
    if (typeof envelope.details === 'string' && envelope.details.trim() !== '') return envelope.details;
  }
  if (status === 401) return 'الجلسة غير صالحة أو منتهية. الرجاء تسجيل الدخول مرة أخرى.';
  if (status === 403) return 'لا تملك صلاحية الوصول إلى هذا الإجراء.';
  return `تعذر إتمام الطلب (رمز ${status}).`;
}

export function toApiError(
  status: number,
  body: unknown,
  init: Omit<ApiErrorInit, 'code' | 'details'> & { code?: string; details?: unknown } = {},
): ApiError {
  const envelope = body && typeof body === 'object' ? (body as ApiErrorEnvelope) : {};
  return new ApiError(status, extractErrorMessage(body, status), {
    code: init.code ?? envelope.code,
    details: init.details ?? envelope.details,
    method: init.method,
    path: init.path,
    cause: init.cause,
  });
}
