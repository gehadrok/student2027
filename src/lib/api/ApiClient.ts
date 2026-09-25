import { ApiError, toApiError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestInit {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, QueryValue | QueryValue[]>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  withAuth?: boolean;
}

export interface ApiClientOptions {
  baseUrl?: string;
  getToken?: () => string | null | undefined;
  onUnauthorized?: (error: ApiError) => void;
  fetchImpl?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null | undefined;
  private readonly onUnauthorized: ((error: ApiError) => void) | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '');
    this.getToken = options.getToken ?? (() => null);
    this.onUnauthorized = options.onUnauthorized;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  buildUrl(path: string, query?: Record<string, QueryValue | QueryValue[]>): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;
    if (!query) return url;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === null || item === undefined) continue;
          params.append(key, String(item));
        }
        continue;
      }
      params.append(key, String(value));
    }

    const serialized = params.toString();
    return serialized ? `${url}?${serialized}` : url;
  }

  async request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const method = init.method ?? 'GET';
    const url = this.buildUrl(path, init.query);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.defaultHeaders,
      ...(init.headers ?? {}),
    };

    if (init.withAuth !== false) {
      const token = this.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let payload: string | undefined;
    if (init.body !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
      payload = JSON.stringify(init.body);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: payload,
        signal: init.signal,
      });
    } catch (cause) {
      const error = new ApiError(0, 'تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى.', {
        method,
        path: url,
        cause,
      });
      throw error;
    }

    const rawBody = await this.readBody(response);

    if (!response.ok) {
      const error = toApiError(response.status, rawBody, { method, path: url });
      if (error.isUnauthorized) {
        this.onUnauthorized?.(error);
      }
      throw error;
    }

    return rawBody as T;
  }

  private async readBody(response: Response): Promise<unknown> {
    let text: string;
    try {
      text = await response.text();
    } catch {
      return null;
    }
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  get<T>(path: string, init: Omit<ApiRequestInit, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, init: Omit<ApiRequestInit, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'POST', body });
  }

  put<T>(path: string, body?: unknown, init: Omit<ApiRequestInit, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'PUT', body });
  }

  patch<T>(path: string, body?: unknown, init: Omit<ApiRequestInit, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'PATCH', body });
  }

  delete<T>(path: string, init: Omit<ApiRequestInit, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'DELETE' });
  }
}
