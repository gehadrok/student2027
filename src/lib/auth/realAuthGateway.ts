import { apiClient, tokenStore, type TokenStore } from '../api';
import type { ApiClient } from '../api/ApiClient';
import { ApiError } from '../api/errors';
import {
  AuthGatewayError,
  toAuthSession,
  toAuthUser,
  type AuthFailure,
  type AuthGateway,
  type AuthSession,
  type AuthUser,
  type LoginCredentials,
} from './contract';

/**
 * Auth endpoints of the existing Kayan School ERP REST API.
 * INTEGRATION REQUIREMENT: these paths must match the deployed backend.
 * If the Kayan deployment exposes a different prefix, change it here only —
 * no screen, repository or gateway contract depends on the literal path.
 */
export const KAYAN_AUTH_BASE_PATH = '/api/auth';

export interface KayanLoginResponse {
  token?: unknown;
  user?: unknown;
}

export interface KayanProfileResponse {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  status?: unknown;
  permissions?: unknown;
}

export type RealAuthClient = Pick<ApiClient, 'get' | 'post'>;

export interface RealAuthGatewayDeps {
  client?: RealAuthClient;
  store?: TokenStore;
}

function fail(failure: AuthFailure): never {
  throw new AuthGatewayError(failure);
}

function toPermissionList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function rethrowAuthError(error: unknown): never {
  if (error instanceof AuthGatewayError) throw error;
  if (error instanceof ApiError && error.isUnauthorized) {
    fail({ reason: 'invalid_credentials', status: error.status, message: error.message });
  }
  throw error;
}

export async function fetchCurrentProfile(
  client: RealAuthClient = apiClient,
): Promise<{ user: AuthUser; permissions: string[] }> {
  const profile = await client.get<KayanProfileResponse>(`${KAYAN_AUTH_BASE_PATH}/profile`);
  const user = toAuthUser(profile);
  if (!user) {
    fail({
      reason: 'unsupported_role',
      message: 'دور الحساب غير مدعوم في عقد الصلاحيات الحالي.',
    });
  }
  return { user, permissions: toPermissionList(profile.permissions) };
}

/**
 * Explicit re-issue only. It is never called automatically: the client has no
 * refresh-token rotation contract, so no refresh loop is invented here.
 */
export async function refreshLiveToken(
  client: RealAuthClient = apiClient,
  store: TokenStore = tokenStore,
): Promise<string | null> {
  const response = await client.post<KayanLoginResponse>(`${KAYAN_AUTH_BASE_PATH}/refresh`);
  const token = typeof response?.token === 'string' ? response.token : null;
  store.set(token);
  return token;
}

export function createRealAuthGateway(deps: RealAuthGatewayDeps = {}): AuthGateway {
  const client = deps.client ?? apiClient;
  const store = deps.store ?? tokenStore;

  return {
    async login(credentials: LoginCredentials): Promise<AuthSession> {
      try {
        const response = await client.post<KayanLoginResponse>(`${KAYAN_AUTH_BASE_PATH}/login`, {
          email: credentials.email.trim(),
          password: credentials.password,
        });

        const token = typeof response?.token === 'string' ? response.token : null;
        if (!token) {
          fail({ reason: 'invalid_credentials', message: 'استجابة الخادم لم تتضمن رمز جلسة صالح.' });
        }

        store.set(token);
        const { user, permissions } = await fetchCurrentProfile(client);
        return toAuthSession(user, { permissions, token, mode: 'live' });
      } catch (error) {
        store.clear();
        rethrowAuthError(error);
      }
    },

    async logout(session: AuthSession | null): Promise<void> {
      try {
        if (session?.token && store.get()) {
          await client.post(`${KAYAN_AUTH_BASE_PATH}/logout`);
        }
      } catch {
        // The token is discarded client-side regardless of the server response.
      } finally {
        store.clear();
      }
    },
  };
}

export const realAuthGateway: AuthGateway = createRealAuthGateway();
