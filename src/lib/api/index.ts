import { ApiClient } from './ApiClient';
import type { ApiError } from './errors';
import { KAYAN_API_BASE_URL } from '../runtime/mode';

export interface TokenStore {
  readonly kind: 'memory' | 'web-storage';
  get(): string | null;
  set(token: string | null): void;
  clear(): void;
}

export class MemoryTokenStore implements TokenStore {
  readonly kind = 'memory' as const;
  private token: string | null = null;

  get(): string | null {
    return this.token;
  }

  set(token: string | null): void {
    this.token = token;
  }

  clear(): void {
    this.token = null;
  }
}

export const tokenStore: TokenStore = new MemoryTokenStore();

let unauthorizedHandler: ((error: ApiError) => void) | null = null;

export function setUnauthorizedHandler(handler: ((error: ApiError) => void) | null): void {
  unauthorizedHandler = handler;
}

export function clearUnauthorizedHandler(): void {
  unauthorizedHandler = null;
}

export const apiClient = new ApiClient({
  baseUrl: KAYAN_API_BASE_URL,
  getToken: () => tokenStore.get(),
  onUnauthorized: (error) => {
    unauthorizedHandler?.(error);
  },
});

export { ApiClient } from './ApiClient';
export type { ApiClientOptions, ApiRequestInit, HttpMethod, QueryValue } from './ApiClient';
export { ApiError, isApiError, isForbiddenError, isUnauthorizedError, toApiError } from './errors';
export type { ApiErrorEnvelope, ApiErrorKind } from './errors';
export {
  DATA_SCOPE_EXPECTATIONS,
  expectationForRole,
  isClientSideScopingPermitted,
  type DataScopeExpectation,
  type DataScopeKind,
  type ScopeSubject,
} from './dataScope';
