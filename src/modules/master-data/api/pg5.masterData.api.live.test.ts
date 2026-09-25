/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-5 — Master Data REST API integration tests (live PostgreSQL).
 *
 * Builds a real Express app mounting `createMasterDataRouter`, drives it over
 * HTTP (global fetch) against the live `kayan_school_erp` database, and proves
 * the full path:  POST -> REST API -> MasterDataRepository -> PostgreSQL,
 * and the reverse GET -> Repository -> PostgreSQL.
 *
 * All rows are `pg45api_`-prefixed and removed in `after`/explicit deletes.
 * Runs serially (own process); never fabricates results.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { getPostgresConfig } from '../../../core/datasource/postgresConfig';
import { PostgreSQLDataSource } from '../../../core/datasource/PostgreSQLDataSource';
import { DataSourceFactory } from '../../../core/datasource/DataSourceFactory';
import { createMasterDataRouter } from './masterDataRoutes';
import { createAuthRouter } from '../../../core/auth/authRoutes';
import { seedRbacTestData, clearRbacTestData, TEST_ADMIN_EMAIL, TEST_PASSWORD } from '../../../core/auth/rbacTestSeed';

const PG_CONFIGURED = Boolean(process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD);
const describePg = PG_CONFIGURED ? describe : describe.skip;

process.env.PGDATABASE = process.env.PG_TEST_DATABASE ?? 'kayan_school_erp';
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'pg5-test-secret-do-not-use-in-prod';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../../migrations/postgres', import.meta.url));

function splitSqlStatements(sql: string): string[] {
  const stmts: string[] = [];
  let cur = '';
  let inLine = false;
  let inBlock = false;
  let inStr = false;
  const n = sql.length;
  for (let i = 0; i < n; i++) {
    const ch = sql[i];
    const next = i + 1 < n ? sql[i + 1] : '';
    if (inLine) { if (ch === '\n') { inLine = false; cur += ch; } else cur += ch; continue; }
    if (inBlock) { if (ch === '*' && next === '/') { inBlock = false; cur += '*/'; i++; continue; } cur += ch; continue; }
    if (inStr) { if (ch === "'") { if (next === "'") { cur += "''"; i++; continue; } inStr = false; cur += ch; continue; } cur += ch; continue; }
    if (ch === '-' && next === '-') { inLine = true; cur += '--'; i++; continue; }
    if (ch === '/' && next === '*') { inBlock = true; cur += '/*'; i++; continue; }
    if (ch === "'") { inStr = true; cur += ch; continue; }
    if (ch === ';') { if (cur.trim()) stmts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts.filter((s) => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().length > 0);
}

async function applyMigrations(ds: PostgreSQLDataSource): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    for (const stmt of splitSqlStatements(sql)) await ds.execute(stmt);
  }
}

const P = 'pg45api_';
let ds: PostgreSQLDataSource;
let server: any;
let base: string;
let host = '';
let authToken = '';

async function teardown(): Promise<void> {
  await ds.execute(`DELETE FROM grade_levels WHERE id LIKE ?`, [`${P}%`]);
  await ds.execute(`DELETE FROM education_stages WHERE id LIKE ?`, [`${P}%`]);
}

async function api(method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* 204 no body */ }
  return { status: res.status, json };
}

describePg('PG-5 Master Data REST API (live PostgreSQL)', () => {
  before(async () => {
    ds = new PostgreSQLDataSource(await getPostgresConfig());
    await applyMigrations(ds);
    await teardown();
    // Point the application DataSource singleton at PostgreSQL so the API
    // (which resolves DataSourceFactory.getInstance()) uses PG.
    DataSourceFactory.setInstance(ds);

    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter());
    app.use('/api/master-data', createMasterDataRouter());
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    host = `http://127.0.0.1:${port}`;
    base = `${host}/api/master-data`;

    // Seed RBAC test data and authenticate as admin (Master Data API is now
    // protected by PG-6 auth/RBAC).
    await seedRbacTestData(ds);
    const loginRes = await fetch(`${host}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: TEST_PASSWORD }),
    });
    const loginJson = await loginRes.json();
    authToken = loginJson.token;
    assert.ok(authToken, 'PG-5 test must authenticate against the PG-6 auth API');
  });

  after(async () => {
    await teardown();
    await clearRbacTestData(ds);
    if (server) await new Promise<void>((r) => server.close(() => r()));
    if (ds) await ds.close();
    DataSourceFactory.reset();
  });

  it('POST creates and GET by id returns it (POST -> API -> repo -> PG -> GET)', async () => {
    const created = await api('POST', '/education_stages', {
      id: `${P}c1`, code: `${P}c1`, name_ar: 'مرحلة تجريبية', is_active: 1, display_order: 1,
    });
    assert.equal(created.status, 201, `create status ${created.status}: ${JSON.stringify(created.json)}`);
    assert.equal(created.json?.id, `${P}c1`);

    const got = await api('GET', `/education_stages/${P}c1`);
    assert.equal(got.status, 200);
    assert.equal(got.json?.code, `${P}c1`);
  });

  it('GET collection returns paginated total via PostgreSQL count', async () => {
    const list = await api('GET', '/education_stages');
    assert.equal(list.status, 200);
    assert.ok(typeof list.json?.total === 'number', 'total should be a number');
    assert.ok(Array.isArray(list.json?.data));
  });

  it('POST duplicate code -> 409 (unique violation)', async () => {
    const first = await api('POST', '/education_stages', {
      id: `${P}dup`, code: `${P}dup`, name_ar: 'مكرر', is_active: 1, display_order: 1,
    });
    assert.equal(first.status, 201);
    const second = await api('POST', '/education_stages', {
      id: `${P}dup2`, code: `${P}dup`, name_ar: 'مكرر 2', is_active: 1, display_order: 2,
    });
    assert.equal(second.status, 409, `expected 409, got ${second.status}: ${JSON.stringify(second.json)}`);
  });

  it('PUT updates and GET reflects change', async () => {
    await api('POST', '/education_stages', { id: `${P}u1`, code: `${P}u1`, name_ar: 'قبل', is_active: 1, display_order: 1 });
    const upd = await api('PUT', `/education_stages/${P}u1`, { name_ar: 'بعد' });
    assert.equal(upd.status, 200);
    assert.equal(upd.json?.name_ar, 'بعد');
    const got = await api('GET', `/education_stages/${P}u1`);
    assert.equal(got.json?.name_ar, 'بعد');
  });

  it('DELETE missing -> 404; DELETE existing -> 204', async () => {
    const missing = await api('DELETE', `/education_stages/${P}does_not_exist`);
    assert.equal(missing.status, 404);

    await api('POST', '/education_stages', { id: `${P}d1`, code: `${P}d1`, name_ar: 'حذف', is_active: 1, display_order: 1 });
    const del = await api('DELETE', `/education_stages/${P}d1`);
    assert.equal(del.status, 204);
    const got = await api('GET', `/education_stages/${P}d1`);
    assert.equal(got.status, 404);
  });

  it('DELETE blocked by FK child -> 409, then succeeds after child removed', async () => {
    await api('POST', '/education_stages', { id: `${P}fk`, code: `${P}fk`, name_ar: 'أب', is_active: 1, display_order: 1 });
    await api('POST', '/grade_levels', {
      id: `${P}child`, code: `${P}child`, name_ar: 'ابن', education_stage_id: `${P}fk`, level_number: 1, is_active: 1, display_order: 1,
    });

    const blocked = await api('DELETE', `/education_stages/${P}fk`);
    assert.equal(blocked.status, 409, `expected 409 FK block, got ${blocked.status}`);

    const childDel = await api('DELETE', `/grade_levels/${P}child`);
    assert.equal(childDel.status, 204);
    const parentDel = await api('DELETE', `/education_stages/${P}fk`);
    assert.equal(parentDel.status, 204);
  });

  it('bulkCreate succeeds (201) and rows are queryable', async () => {
    const res = await api('POST', '/education_stages/bulk', {
      rows: [
        { id: `${P}b1`, code: `${P}b1`, name_ar: 'ب1', is_active: 1, display_order: 1 },
        { id: `${P}b2`, code: `${P}b2`, name_ar: 'ب2', is_active: 1, display_order: 2 },
      ],
    });
    assert.equal(res.status, 201, `bulkCreate status ${res.status}: ${JSON.stringify(res.json)}`);
    assert.equal(res.json?.success, 2);
    const got = await api('GET', `/education_stages/${P}b1`);
    assert.equal(got.status, 200);
  });

  it('bulkCreate with FK violation rolls back the whole batch (409, 0 rows)', async () => {
    const res = await api('POST', '/grade_levels/bulk', {
      rows: [
        { id: `${P}g1`, code: `${P}g1`, name_ar: 'ج1', education_stage_id: `${P}missing_stage`, level_number: 1, is_active: 1, display_order: 1 },
        { id: `${P}g2`, code: `${P}g2`, name_ar: 'ج2', education_stage_id: `${P}missing_stage`, level_number: 2, is_active: 1, display_order: 2 },
      ],
    });
    assert.equal(res.status, 409, `expected 409 rollback, got ${res.status}: ${JSON.stringify(res.json)}`);
    // Rolled back: neither row was inserted.
    const g1 = await api('GET', `/grade_levels/${P}g1`);
    assert.equal(g1.status, 404, 'rolled-back row must not exist');
  });

  it('bulkDelete returns success counts', async () => {
    await api('POST', '/education_stages/bulk', {
      rows: [
        { id: `${P}k1`, code: `${P}k1`, name_ar: 'ك1', is_active: 1, display_order: 1 },
        { id: `${P}k2`, code: `${P}k2`, name_ar: 'ك2', is_active: 1, display_order: 2 },
      ],
    });
    const res = await api('POST', '/education_stages/bulk-delete', { ids: [`${P}k1`, `${P}k2`] });
    assert.equal(res.status, 200);
    assert.equal(res.json?.success, 2);
  });

  it('validation failure -> 400 (missing required code)', async () => {
    const res = await api('POST', '/education_stages', { name_ar: 'بدون كود' });
    assert.equal(res.status, 400, `expected 400, got ${res.status}: ${JSON.stringify(res.json)}`);
    assert.ok(Array.isArray(res.json?.details), 'validation errors should be returned');
  });

  it('unknown entity type -> 400', async () => {
    const res = await api('GET', '/not_a_real_entity');
    assert.equal(res.status, 400);
  });
});
