import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from './ApiClient';
import { ApiError, isForbiddenError, isUnauthorizedError } from './errors';

interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(payload === undefined ? null : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createFetchStub(
  handler: (call: RecordedCall) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: RecordedCall = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers,
      body: init?.body,
    };
    calls.push(call);
    return handler(call);
  };
  return { fetchImpl, calls };
}

function createClient(
  handler: (call: RecordedCall) => Response | Promise<Response>,
  options: { token?: string | null; onUnauthorized?: (error: ApiError) => void } = {},
) {
  const { fetchImpl, calls } = createFetchStub(handler);
  const client = new ApiClient({
    fetchImpl,
    getToken: () => options.token ?? null,
    onUnauthorized: options.onUnauthorized,
  });
  return { client, calls };
}

test('sends the bearer token when a token is available', async () => {
  const { client, calls } = createClient(() => jsonResponse(200, { ok: true }), { token: 'token-123' });

  await client.get('/api/academic/years');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, 'Bearer token-123');
});

test('omits the authorization header when no token is available', async () => {
  const { client, calls } = createClient(() => jsonResponse(200, {}));

  await client.get('/api/academic/years');

  assert.equal(calls[0].headers.Authorization, undefined);
});

test('omits the authorization header when auth is disabled per request', async () => {
  const { client, calls } = createClient(() => jsonResponse(200, {}), { token: 'token-123' });

  await client.get('/api/health', { withAuth: false });

  assert.equal(calls[0].headers.Authorization, undefined);
});

test('returns the parsed body for a successful response', async () => {
  const { client } = createClient(() => jsonResponse(200, { id: 'year-1' }));

  const result = await client.get<{ id: string }>('/api/academic/years/year-1');

  assert.deepEqual(result, { id: 'year-1' });
});

test('serializes the request body and sets the json content type', async () => {
  const { client, calls } = createClient(() => jsonResponse(200, {}));

  await client.post('/api/academic/years', { code: '2026' });

  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers['Content-Type'], 'application/json');
  assert.equal(calls[0].body, JSON.stringify({ code: '2026' }));
});

test('builds the url with encoded query values and skips nullish values', async () => {
  const { client, calls } = createClient(() => jsonResponse(200, []));

  await client.get('/api/academic/years', { query: { status: 'active', term: null, year: 2026 } });

  assert.equal(calls[0].url, '/api/academic/years?status=active&year=2026');
});

test('401 raises an unauthorized error and notifies the session handler', async () => {
  const seen: ApiError[] = [];
  const { client } = createClient(
    () => jsonResponse(401, { error: 'الجلسة غير صالحة' }),
    { token: 'token-123', onUnauthorized: (error) => seen.push(error) },
  );

  await assert.rejects(
    () => client.get('/api/auth/profile'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 401);
      assert.equal(error.kind, 'unauthorized');
      assert.equal(error.isUnauthorized, true);
      assert.equal(error.message, 'الجلسة غير صالحة');
      assert.ok(isUnauthorizedError(error));
      return true;
    },
  );

  assert.equal(seen.length, 1);
  assert.equal(seen[0].status, 401);
});

test('403 raises a forbidden error without notifying the session handler', async () => {
  const seen: ApiError[] = [];
  const { client } = createClient(
    () => jsonResponse(403, { error: 'صلاحية غير كافية' }),
    { token: 'token-123', onUnauthorized: (error) => seen.push(error) },
  );

  await assert.rejects(
    () => client.get('/api/master-data/entities'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403);
      assert.equal(error.kind, 'forbidden');
      assert.equal(error.isForbidden, true);
      assert.ok(isForbiddenError(error));
      return true;
    },
  );

  assert.equal(seen.length, 0);
});

test('server errors keep the backend error envelope details', async () => {
  const { client } = createClient(() => jsonResponse(500, { error: 'تعذر تحميل الملف الشخصي' }));

  await assert.rejects(
    () => client.get('/api/auth/profile'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 500);
      assert.equal(error.kind, 'server');
      assert.equal(error.message, 'تعذر تحميل الملف الشخصي');
      return true;
    },
  );
});

test('transport failures are normalized to a network error', async () => {
  const { client } = createClient(() => {
    throw new TypeError('Failed to fetch');
  });

  await assert.rejects(
    () => client.get('/api/auth/profile'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 0);
      assert.equal(error.kind, 'network');
      assert.equal(error.isNetworkError, true);
      return true;
    },
  );
});

test('empty response bodies resolve to null', async () => {
  const { client } = createClient(() => new Response(null, { status: 204 }));

  const result = await client.delete('/api/academic/years/year-1');

  assert.equal(result, null);
});

test('non json error bodies are not reflected back to the caller', async () => {
  const { client } = createClient(() => new Response('<html>upstream unavailable</html>', { status: 502 }));

  await assert.rejects(
    () => client.get('/api/academic/years'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 502);
      assert.equal(error.kind, 'server');
      assert.equal(error.message.includes('upstream'), false);
      assert.equal(error.message.includes('<html>'), false);
      return true;
    },
  );
});
