import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../../../lib/api/ApiClient';
import { MemoryTokenStore } from '../../../lib/api';
import { ApiError } from '../../../lib/api/errors';
import {
  KAYAN_MASTER_DATA_PATH,
  MasterDataContractError,
  MasterDataRestRepository,
  MasterDataRestUnsupportedError,
  type MasterDataRestClient,
} from './masterDataRestRepository';

interface RecordedCall {
  method: string;
  url: string;
  body: unknown;
  hasAuthHeader: boolean;
}

function jsonResponse(status: number, payload?: unknown): Response {
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

  return { repo: new MasterDataRestRepository(client as MasterDataRestClient), store, calls };
}

const PAGE = { data: [{ id: 'r1', code: 'A', name_ar: 'أ' }], total: 1, page: 1, pageSize: 25, totalPages: 1 };

test('list uses the documented collection path and maps the client filter to query params', async () => {
  const { repo, calls } = createHarness(() => jsonResponse(200, PAGE), { token: 'opaque' });

  const result = await repo.getAll('education_stages', {
    page: 2,
    pageSize: 10,
    searchQuery: 'ابتدائي',
    is_active: 1,
    sortBy: 'name_ar',
    sortOrder: 'desc',
  });

  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url.startsWith(`${KAYAN_MASTER_DATA_PATH}/education_stages?`), true);
  const query = new URL(calls[0].url, 'http://x').searchParams;
  assert.equal(query.get('page'), '2');
  assert.equal(query.get('pageSize'), '10');
  assert.equal(query.get('searchQuery'), 'ابتدائي');
  assert.equal(query.get('is_active'), '1');
  assert.equal(query.get('sortBy'), 'name_ar');
  assert.equal(query.get('sortOrder'), 'desc');
  assert.equal(calls[0].hasAuthHeader, true);
  assert.deepEqual(result, PAGE);
});

test('list rejects a response that does not match the documented shape', async () => {
  const { repo } = createHarness(() => jsonResponse(200, { unexpected: true }));

  await assert.rejects(() => repo.getAll('education_stages'), MasterDataContractError);
});

test('list uses the backend defaults when no filter is supplied', async () => {
  const { repo, calls } = createHarness(() => jsonResponse(200, PAGE));

  await repo.getAll('grade_levels');

  const query = new URL(calls[0].url, 'http://x').searchParams;
  assert.equal(query.get('page'), '1');
  assert.equal(query.get('pageSize'), '25');
  assert.equal(query.get('sortBy'), 'display_order');
  assert.equal(query.get('sortOrder'), 'asc');
  assert.equal(query.has('is_active'), false);
});

test('getAllFlat pages through the collection until the backend total is collected', async () => {
  const { repo, calls } = createHarness((call) => {
    const page = Number(new URL(call.url, 'http://x').searchParams.get('page'));
    if (page === 1) return jsonResponse(200, { data: [{ id: 'a' }, { id: 'b' }], total: 3, page: 1, pageSize: 100, totalPages: 1 });
    return jsonResponse(200, { data: [{ id: 'c' }], total: 3, page: 2, pageSize: 100, totalPages: 1 });
  });

  const rows = await repo.getAllFlat('nationalities', true);

  assert.equal(calls.length, 2);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'c']);
  const query = new URL(calls[0].url, 'http://x').searchParams;
  assert.equal(query.get('is_active'), '1');
});

test('getById returns the record and maps 404 to null', async () => {
  const found = createHarness(() => jsonResponse(200, { id: 'r1', code: 'A' }));
  const record = await found.repo.getById('education_stages', 'r1');
  assert.equal(record.id, 'r1');
  assert.equal(found.calls[0].url, `${KAYAN_MASTER_DATA_PATH}/education_stages/r1`);

  const missing = createHarness(() => jsonResponse(404, { error: 'السجل غير موجود' }));
  assert.equal(await missing.repo.getById('education_stages', 'nope'), null);
});

test('create posts the record and returns the created row', async () => {
  const { repo, calls } = createHarness(() => jsonResponse(201, { id: 'r2', code: 'B' }));

  const created = await repo.create('education_stages', { id: 'r2', code: 'B', name_ar: 'ب' });

  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].url, `${KAYAN_MASTER_DATA_PATH}/education_stages`);
  assert.deepEqual(JSON.parse(String(calls[0].body)), { id: 'r2', code: 'B', name_ar: 'ب' });
  assert.equal(created.id, 'r2');
});

test('create surfaces a backend conflict (409) as an ApiError', async () => {
  const { repo } = createHarness(() => jsonResponse(409, { error: 'الكود أو الاسم موجود مسبقاً' }));

  await assert.rejects(
    () => repo.create('education_stages', { code: 'A' }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 409);
      assert.equal(error.message, 'الكود أو الاسم موجود مسبقاً');
      return true;
    },
  );
});

test('update uses PUT on the item path and maps 404 to null', async () => {
  const ok = createHarness(() => jsonResponse(200, { id: 'r1', code: 'A2' }));
  const updated = await ok.repo.update('education_stages', 'r1', { code: 'A2' });
  assert.equal(ok.calls[0].method, 'PUT');
  assert.equal(ok.calls[0].url, `${KAYAN_MASTER_DATA_PATH}/education_stages/r1`);
  assert.equal(updated.code, 'A2');

  const missing = createHarness(() => jsonResponse(404, { error: 'السجل غير موجود' }));
  assert.equal(await missing.repo.update('education_stages', 'nope', { code: 'X' }), null);
});

test('delete returns true on 204 and false on 404', async () => {
  const deleted = createHarness(() => new Response(null, { status: 204 }));
  assert.equal(await deleted.repo.delete('education_stages', 'r1'), true);
  assert.equal(deleted.calls[0].method, 'DELETE');

  const missing = createHarness(() => jsonResponse(404, { error: 'السجل غير موجود' }));
  assert.equal(await missing.repo.delete('education_stages', 'nope'), false);
});

test('delete surfaces a 409 conflict instead of reporting success', async () => {
  const { repo } = createHarness(() => jsonResponse(409, { error: 'لا يمكن حذف السجل لوجود سجلات مرتبطة به' }));

  await assert.rejects(
    () => repo.delete('education_stages', 'r1'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 409);
      return true;
    },
  );
});

test('bulk-create and bulk-delete use the documented sub-routes and payload keys', async () => {
  const created = createHarness(() => jsonResponse(201, { success: 2, failed: 0, errors: [] }));
  const createResult = await created.repo.bulkCreate('grade_levels', [{ id: 'g1' }, { id: 'g2' }]);
  assert.equal(created.calls[0].url, `${KAYAN_MASTER_DATA_PATH}/grade_levels/bulk`);
  assert.deepEqual(JSON.parse(String(created.calls[0].body)), { rows: [{ id: 'g1' }, { id: 'g2' }] });
  assert.equal(createResult.success, 2);

  const removed = createHarness(() => jsonResponse(200, { success: 1, failed: 1, errors: ['مقيد'] }));
  const deleteResult = await removed.repo.bulkDelete('grade_levels', ['g1', 'g2']);
  assert.equal(removed.calls[0].url, `${KAYAN_MASTER_DATA_PATH}/grade_levels/bulk-delete`);
  assert.deepEqual(JSON.parse(String(removed.calls[0].body)), { ids: ['g1', 'g2'] });
  assert.equal(deleteResult.failed, 1);
});

test('401 is not converted into a mock result and no request is retried silently', async () => {
  const { repo, calls } = createHarness(() => jsonResponse(401, { error: 'غير مصرح' }));

  await assert.rejects(
    () => repo.getAll('education_stages'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 401);
      assert.equal(error.isUnauthorized, true);
      return true;
    },
  );
  assert.equal(calls.length, 1);
});

test('403 is surfaced as an authorization failure', async () => {
  const { repo } = createHarness(() => jsonResponse(403, { error: 'صلاحية غير كافية' }));

  await assert.rejects(
    () => repo.create('education_stages', { code: 'X' }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403);
      assert.equal(error.isForbidden, true);
      return true;
    },
  );
});

test('the bearer token is never sent when the session has none', async () => {
  const { repo, calls } = createHarness(() => jsonResponse(200, PAGE));

  await repo.getAll('education_stages');

  assert.equal(calls[0].hasAuthHeader, false);
});

test('repository methods without a backend endpoint fail closed', async () => {
  const { repo } = createHarness(() => jsonResponse(200, {}));

  await assert.rejects(() => repo.getAuditLogs(), MasterDataRestUnsupportedError);
  await assert.rejects(() => repo.isFieldUnique(), MasterDataRestUnsupportedError);
  await assert.rejects(() => repo.getFieldOptions(), MasterDataRestUnsupportedError);
  await assert.rejects(() => repo.getParentRecords(), MasterDataRestUnsupportedError);
  await assert.rejects(() => repo.generateNextNumber(), MasterDataRestUnsupportedError);
  await assert.rejects(() => repo.getPermission(), MasterDataRestUnsupportedError);
  await assert.rejects(() => repo.logAudit(), MasterDataRestUnsupportedError);
});

test('no credential material is ever sent by the master data client', async () => {
  const { repo, calls } = createHarness(() => jsonResponse(201, { id: 'r3' }), { token: 'opaque' });

  await repo.create('education_stages', { id: 'r3', code: 'C', name_ar: 'ج' });

  const serialized = JSON.stringify(calls[0].body ?? {}).toLowerCase();
  assert.equal(serialized.includes('password'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(serialized.includes('dsn'), false);
});
