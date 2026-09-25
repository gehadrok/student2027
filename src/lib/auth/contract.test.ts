import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../api/errors';
import {
  DATA_SCOPE_EXPECTATIONS,
  expectationForRole,
  isClientSideScopingPermitted,
} from '../api/dataScope';
import {
  AuthGatewayError,
  USER_ROLES,
  describeAuthFailure,
  isUserRole,
  toAuthSession,
  toAuthUser,
  toMockAuthSession,
} from './contract';
import type { User } from '../../types';

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    name: 'أ. عبدالله الغامدي',
    role: 'admin',
    email: 'admin@kayan.test',
    passwordHash: 'hash_admin123',
    phone: '770000000',
    status: 'active',
    ...overrides,
  };
}

test('the four evidenced roles are preserved', () => {
  assert.deepEqual([...USER_ROLES], ['admin', 'teacher', 'student', 'parent']);
  assert.equal(isUserRole('admin'), true);
  assert.equal(isUserRole('parent'), true);
  assert.equal(isUserRole('superadmin'), false);
  assert.equal(isUserRole(null), false);
  assert.equal(isUserRole(1), false);
});

test('toAuthUser strips every credential field from the session contract', () => {
  const user = toAuthUser(mockUser());

  assert.ok(user);
  assert.equal(user.id, 'u1');
  assert.equal(user.role, 'admin');
  assert.equal('passwordHash' in (user as object), false);
  assert.equal('password_hash' in (user as object), false);
  assert.equal('password' in (user as object), false);
  assert.equal(JSON.stringify(user).toLowerCase().includes('password'), false);
});

test('toAuthUser drops unknown keys instead of forwarding them', () => {
  const user = toAuthUser({
    id: 'u2',
    name: 'معلم',
    email: 'teacher@kayan.test',
    role: 'teacher',
    password_hash: 'secret-hash',
    password: 'plain',
    internalNotes: 'do not ship',
    authSecret: 'do not ship',
  });

  assert.ok(user);
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'name', 'role']);
});

test('toAuthUser fails closed for unsupported roles and missing identities', () => {
  assert.equal(toAuthUser({ id: 'u3', name: 'x', email: 'x', role: 'superadmin' }), null);
  assert.equal(toAuthUser({ name: 'x', email: 'x', role: 'admin' }), null);
  assert.equal(toAuthUser(null), null);
  assert.equal(toAuthUser('admin'), null);
});

test('a mock session never carries credential material', () => {
  const session = toMockAuthSession(mockUser());

  assert.ok(session);
  assert.equal(session.mode, 'mock');
  assert.equal(session.token, null);
  assert.deepEqual(session.permissions, []);
  const serialized = JSON.stringify(session).toLowerCase();
  assert.equal(serialized.includes('password'), false);
  assert.equal(serialized.includes('123456'), false);
});

test('live sessions keep the token separate from the user projection', () => {
  const user = toAuthUser(mockUser());
  assert.ok(user);
  const session = toAuthSession(user, { mode: 'live', token: 'opaque-token', permissions: ['master_data:read'] });

  assert.equal(session.token, 'opaque-token');
  assert.deepEqual(session.permissions, ['master_data:read']);
  assert.equal(JSON.stringify(session).includes('opaque-token'), true);
  assert.equal('passwordHash' in session.user, false);
});

test('auth failures distinguish authentication from authorization', () => {
  const unauthorized = describeAuthFailure(new ApiError(401, 'جلسة منتهية'));
  assert.equal(unauthorized.reason, 'unauthorized');
  assert.equal(unauthorized.status, 401);

  const forbidden = describeAuthFailure(new ApiError(403, 'صلاحية غير كافية'));
  assert.equal(forbidden.reason, 'forbidden');
  assert.equal(forbidden.status, 403);

  const network = describeAuthFailure(new ApiError(0, 'تعذر الاتصال بالخادم'));
  assert.equal(network.reason, 'network');

  const server = describeAuthFailure(new ApiError(503, 'غير متاح'));
  assert.equal(server.reason, 'server');

  const gateway = describeAuthFailure(
    new AuthGatewayError({ reason: 'account_suspended', message: 'الحساب موقوف' }),
  );
  assert.equal(gateway.reason, 'account_suspended');
  assert.equal(gateway.message, 'الحساب موقوف');

  const unknown = describeAuthFailure(new Error('boom'));
  assert.equal(unknown.reason, 'unknown');
  assert.equal(unknown.message, 'boom');
});

test('data scope expectations are declarative, server enforced, and scoped per role', () => {
  assert.equal(DATA_SCOPE_EXPECTATIONS.length, USER_ROLES.length);

  for (const entry of DATA_SCOPE_EXPECTATIONS) {
    assert.equal(entry.enforcement, 'server');
    assert.equal(entry.clientSideFiltering, 'forbidden');
    assert.equal(entry.requestParameter, null);
    assert.ok(entry.openQuestions.length > 0);
  }

  assert.equal(expectationForRole('student').expectedScope, 'own');
  assert.equal(expectationForRole('parent').expectedScope, 'children');
  assert.equal(expectationForRole('teacher').expectedScope, 'assigned');
  assert.equal(expectationForRole('admin').expectedScope, 'school');
  assert.equal(expectationForRole('superadmin').expectedScope, 'unknown');
  assert.equal(expectationForRole('superadmin').scopeSubject, 'undetermined');
  assert.equal(isClientSideScopingPermitted(), false);
});
