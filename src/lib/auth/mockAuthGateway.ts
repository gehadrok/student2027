import { getRealmDB, getCurrentUser, setCurrentUser } from '../../lib/db';
import type { UserRole } from '../../types';
import {
  AuthGatewayError,
  toAuthSession,
  toAuthUser,
  type AuthFailure,
  type AuthGateway,
  type AuthSession,
  type LoginCredentials,
} from './contract';

export const MOCK_DEMO_PASSWORD = '123456';

const MOCK_LATENCY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowStamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 16);
}

function fail(failure: AuthFailure): never {
  throw new AuthGatewayError(failure);
}

function findMockUser(email: string) {
  return getRealmDB().users.find(
    (user) => user.email.toLowerCase() === email.toLowerCase().trim(),
  );
}

function sessionForMockUser(user: ReturnType<typeof findMockUser>): AuthSession {
  const authUser = toAuthUser(user);
  if (!authUser) {
    fail({ reason: 'unsupported_role', message: 'هذا الحساب غير مرتبط بدور معتمد في النظام.' });
  }
  return toAuthSession(authUser, { mode: 'mock', token: null });
}

export async function loginAsMockRole(role: UserRole): Promise<AuthSession> {
  const user = getRealmDB().users.find((candidate) => candidate.role === role);
  if (!user) {
    fail({ reason: 'account_not_found', message: 'لا يوجد حساب نموذجي لهذا الدور.' });
  }
  user.lastLogin = nowStamp();
  setCurrentUser(user);
  return sessionForMockUser(user);
}

export function restoreMockSession(): AuthSession | null {
  const user = getCurrentUser();
  if (!user) return null;
  return sessionForMockUser(user);
}

export const mockAuthGateway: AuthGateway = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    await delay(MOCK_LATENCY_MS);

    const user = findMockUser(credentials.email);
    if (!user) {
      fail({ reason: 'account_not_found', message: 'البريد الإلكتروني أو الحساب غير موجود في النظام.' });
    }

    if (user.passwordHash !== `hash_${credentials.password}` && credentials.password !== MOCK_DEMO_PASSWORD) {
      fail({
        reason: 'invalid_credentials',
        message: `كلمة المرور غير صحيحة. (استخدم ${MOCK_DEMO_PASSWORD} للتجربة)`,
      });
    }

    if (user.status === 'suspended') {
      fail({ reason: 'account_suspended', message: 'هذا الحساب موقوف حالياً من قبل الإدارة.' });
    }

    user.lastLogin = nowStamp();
    setCurrentUser(user);
    return sessionForMockUser(user);
  },

  async logout(): Promise<void> {
    setCurrentUser(null);
  },
};
