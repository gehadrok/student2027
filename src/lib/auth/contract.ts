import { ApiError } from '../api/errors';
import type { IntegrationMode } from '../runtime/mode';
import type { User, UserRole } from '../../types';

export type { UserRole };

export const USER_ROLES: readonly UserRole[] = ['admin', 'teacher', 'student', 'parent'];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
  phone?: string;
  photo?: string;
  avatarColor?: string;
  linkedStudentIds?: string[];
  linkedTeacherId?: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: AuthUser;
  permissions: readonly string[];
  token: string | null;
  mode: IntegrationMode;
  authenticatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type AuthFailureReason =
  | 'invalid_credentials'
  | 'account_suspended'
  | 'account_not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'network'
  | 'server'
  | 'unsupported_role'
  | 'unknown';

export interface AuthFailure {
  reason: AuthFailureReason;
  status?: number;
  message: string;
}

export interface AuthGateway {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(session: AuthSession | null): Promise<void>;
}

export class AuthGatewayError extends Error {
  readonly failure: AuthFailure;

  constructor(failure: AuthFailure) {
    super(failure.message);
    this.name = 'AuthGatewayError';
    this.failure = failure;
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function asOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length > 0 ? items : undefined;
}

export function toAuthUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;

  const id = asString(source.id);
  const role = source.role;
  if (!id || !isUserRole(role)) return null;

  const user: AuthUser = {
    id,
    name: asString(source.name),
    email: asString(source.email),
    role,
  };

  const status = asOptionalString(source.status);
  if (status) user.status = status;
  const phone = asOptionalString(source.phone);
  if (phone) user.phone = phone;
  const photo = asOptionalString(source.photo);
  if (photo) user.photo = photo;
  const avatarColor = asOptionalString(source.avatarColor);
  if (avatarColor) user.avatarColor = avatarColor;
  const linkedStudentIds = asOptionalStringArray(source.linkedStudentIds);
  if (linkedStudentIds) user.linkedStudentIds = linkedStudentIds;
  const linkedTeacherId = asOptionalString(source.linkedTeacherId);
  if (linkedTeacherId) user.linkedTeacherId = linkedTeacherId;
  const lastLogin = asOptionalString(source.lastLogin);
  if (lastLogin) user.lastLogin = lastLogin;

  return user;
}

export function toAuthSession(
  user: AuthUser,
  options: { permissions?: readonly string[]; token?: string | null; mode: IntegrationMode },
): AuthSession {
  return {
    user,
    permissions: options.permissions ? [...options.permissions] : [],
    token: options.token ?? null,
    mode: options.mode,
    authenticatedAt: new Date().toISOString(),
  };
}

export function toMockAuthSession(user: User | AuthUser): AuthSession | null {
  const authUser = toAuthUser(user as unknown);
  if (!authUser) return null;
  return toAuthSession(authUser, { mode: 'mock', token: null });
}

export function describeAuthFailure(error: unknown): AuthFailure {
  if (error instanceof AuthGatewayError) return error.failure;

  if (error instanceof ApiError) {
    if (error.isUnauthorized) {
      return { reason: 'unauthorized', status: error.status, message: error.message };
    }
    if (error.isForbidden) {
      return { reason: 'forbidden', status: error.status, message: error.message };
    }
    if (error.isNetworkError) {
      return { reason: 'network', status: error.status, message: error.message };
    }
    if (error.status >= 500) {
      return { reason: 'server', status: error.status, message: error.message };
    }
    return { reason: 'invalid_credentials', status: error.status, message: error.message };
  }

  if (error instanceof Error && error.message) {
    return { reason: 'unknown', message: error.message };
  }

  return { reason: 'unknown', message: 'تعذر إتمام تسجيل الدخول.' };
}
