import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../api/ApiClient';
import { MemoryTokenStore } from '../api';
import { ApiError, isForbiddenError, isUnauthorizedError } from '../api/errors';
import { describeAuthFailure } from './contract';
import { createRealAuthGateway, KAYAN_AUTH_BASE_PATH, type RealAuthClient } from './realAuthGateway';

interface RecordedCall {
  method: string;
  url: string;
  body: unknown;
  hasAuthHeader: boolean;
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(payload === undefined ? null : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createHarness(
  handler: (call: RecordedCall) => Response | Promise<Response>,
  options: { token?: string | null } = {},
) {
  const calls: RecordedCall[] = [];
  const store = new MemoryTokenStore();
  store.set(options.token ?? null);

  const client = new ApiClient({
    fetchImpl: async (input, init) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const call: RecordedCall = {
        method: init?.method ?? 'GET',
        url: String(input),
        body: init?.body,
        hasAuthHeader: Boolean(headers.Authorization),
      };
      calls.push(call);
      return handler(call);
    },
    getToken: () => store.get(),
  });

  return { gateway: createRealAuthGateway({ client: client as RealAuthClient, store }), store, calls };
}

const LOGIN_OK = { token: 'opaque-token-1', user: { id: 'u1', name: 'Admin', email: 'a@b.c', role: 'admin' } };
const PROFILE_OK = { id: 'u1', name: 'Admin', email: 'a@b.c', role: 'admin', status: 'active', permissions: ['master_data:read'] };

test('login posts credentials to the documented login path, then hydrates the profile', async () => {
  const { gateway, store, calls } = createHarness((call) =>
    call.url.endsWith('/login') ? jsonResponse(200, LOGIN_OK) : jsonResponse(200, PROFILE_OK),
  );

  const session = await gateway.login({ email: '  admin@kayan.test  ', password: 'secret' });

  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].url, `${KAYAN_AUTH_BASE_PATH}/login`);
  assert.deepEqual(JSON.parse(String(calls[0].body)), { email: 'admin@kayan.test', password: 'secret' });
  assert.equal(calls[0].hasAuthHeader, false);

  assert.equal(calls[1].method, 'GET');
  assert.equal(calls[1].url, `${KAYAN_AUTH_BASE_PATH}/profile`);
  assert.equal(calls[1].hasAuthHeader, true);

  assert.equal(session.mode, 'live');
  assert.equal(session.token, 'opaque-token-1');
  assert.equal(session.user.id, 'u1');
  assert.equal(session.user.role, 'admin');
  assert.deepEqual(session.permissions, ['master_data:read']);
  assert.equal(store.get(), 'opaque-token-1');
});

test('the mapped live session never carries password material', async () => {
  const { gateway } = createHarness((call) =>
    call.url.endsWith('/login')
      ? jsonResponse(200, LOGIN_OK)
      : jsonResponse(200, {
          id: 'u1',
          name: 'Admin',
          email: 'a@b.c',
          role: 'admin',
          status: 'active',
          permissions: ['master_data:read'],
          password_hash: 'super-secret-hash',
          password: 'plain',
        }),
  );

  const session = await gateway.login({ email: 'admin@kayan.test', password: 'secret' });

  assert.equal('password_hash' in session.user, false);
  assert.equal('password' in session.user, false);
  assert.equal(JSON.stringify(session).toLowerCase().includes('super-secret-hash'), false);
  assert.equal(JSON.stringify(session).toLowerCase().includes('password'), false);
});

test('no refresh call is invented during login', async () => {
  const { gateway, calls } = createHarness((call) =>
    call.url.endsWith('/login') ? jsonResponse(200, LOGIN_OK) : jsonResponse(200, PROFILE_OK),
  );

  await gateway.login({ email: 'admin@kayan.test', password: 'secret' });

  assert.equal(calls.some((call) => call.url.includes('refresh')), false);
  assert.equal(calls.length, 2);
});

test('401 on login is reported as invalid credentials and clears the token', async () => {
  const { gateway, store } = createHarness(() => jsonResponse(401, { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }));

  await assert.rejects(
    () => gateway.login({ email: 'admin@kayan.test', password: 'wrong' }),
    (error: unknown) => {
      const failure = describeAuthFailure(error);
      assert.equal(failure.reason, 'invalid_credentials');
      assert.equal(failure.status, 401);
      assert.equal(failure.message, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
      return true;
    },
  );

  assert.equal(store.get(), null);
});

test('401 on the profile request is reported as invalid credentials and clears the token', async () => {
  const { gateway, store } = createHarness((call) =>
    call.url.endsWith('/login') ? jsonResponse(200, LOGIN_OK) : jsonResponse(401, { error: 'انتهت الجلسة' }),
  );

  await assert.rejects(
    () => gateway.login({ email: 'admin@kayan.test', password: 'secret' }),
    (error: unknown) => {
      assert.equal(describeAuthFailure(error).reason, 'invalid_credentials');
      return true;
    },
  );

  assert.equal(store.get(), null);
});

test('403 is surfaced as an authorization failure, not a credential failure', async () => {
  const { gateway } = createHarness(() => jsonResponse(403, { error: 'صلاحية غير كافية' }));

  await assert.rejects(
    () => gateway.login({ email: 'admin@kayan.test', password: 'secret' }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.ok(isForbiddenError(error));
      assert.equal(error.status, 403);
      const failure = describeAuthFailure(error);
      assert.equal(failure.reason, 'forbidden');
      return true;
    },
  );
});

test('a transport failure is surfaced as a network error with no mock fallback', async () => {
  const { gateway, store } = createHarness(() => {
    throw new TypeError('Failed to fetch');
  });

  await assert.rejects(
    () => gateway.login({ email: 'admin@kayan.test', password: 'secret' }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.isNetworkError, true);
      assert.equal(describeAuthFailure(error).reason, 'network');
      return true;
    },
  );

  assert.equal(store.get(), null);
});

test('a profile with an unsupported role fails closed and clears the token', async () => {
  const { gateway, store } = createHarness((call) =>
    call.url.endsWith('/login')
      ? jsonResponse(200, LOGIN_OK)
      : jsonResponse(200, { id: 'u9', name: 'X', email: 'x@y.z', role: 'superadmin', permissions: [] }),
  );

  await assert.rejects(
    () => gateway.login({ email: 'x@y.z', password: 'secret' }),
    (error: unknown) => {
      assert.equal(describeAuthFailure(error).reason, 'unsupported_role');
      return true;
    },
  );

  assert.equal(store.get(), null);
});

test('a login response without a token is rejected', async () => {
  const { gateway, store } = createHarness(() => jsonResponse(200, { user: LOGIN_OK.user }));

  await assert.rejects(
    () => gateway.login({ email: 'admin@kayan.test', password: 'secret' }),
    (error: unknown) => {
      assert.equal(describeAuthFailure(error).reason, 'invalid_credentials');
      return true;
    },
  );

  assert.equal(store.get(), null);
});

test('logout calls the logout endpoint and clears the token', async () => {
  const { gateway, store, calls } = createHarness((call) =>
    call.url.endsWith('/login') ? jsonResponse(200, LOGIN_OK) : jsonResponse(200, PROFILE_OK),
  );

  const session = await gateway.login({ email: 'admin@kayan.test', password: 'secret' });
  const before = calls.length;
  await gateway.logout(session);

  assert.equal(calls.length, before + 1);
  assert.equal(calls[calls.length - 1].method, 'POST');
  assert.equal(calls[calls.length - 1].url, `${KAYAN_AUTH_BASE_PATH}/logout`);
  assert.equal(calls[calls.length - 1].hasAuthHeader, true);
  assert.equal(store.get(), null);
});

test('logout clears the client session even when the server call fails', async () => {
  const { gateway, store } = createHarness(() => jsonResponse(500, { error: 'خطأ في الخادم' }), { token: 'opaque-token-1' });

  const session = {
    user: { id: 'u1', name: 'Admin', email: 'a@b.c', role: 'admin' as const },
    permissions: [],
    token: 'opaque-token-1',
    mode: 'live' as const,
    authenticatedAt: new Date().toISOString(),
  };

  await gateway.logout(session);

  assert.equal(store.get(), null);
});

test('logout without a session issues no request', async () => {
  const { gateway, store, calls } = createHarness(() => jsonResponse(200, {}));

  await gateway.logout(null);

  assert.equal(calls.length, 0);
  assert.equal(store.get(), null);
});

test('the auth error surface keeps 401 and 403 distinguishable', async () => {
  const unauthorized = new ApiError(401, 'unauthorized');
  const forbidden = new ApiError(403, 'forbidden');
  assert.equal(isUnauthorizedError(unauthorized), true);
  assert.equal(isUnauthorizedError(forbidden), false);
  assert.equal(describeAuthFailure(unauthorized).reason, 'unauthorized');
  assert.equal(describeAuthFailure(forbidden).reason, 'forbidden');
});
