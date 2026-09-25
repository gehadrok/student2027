/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-6 — Authentication & RBAC live tests (live PostgreSQL).
 *
 * Covers the 14 required scenarios. The RBAC test data is seeded in `before()`
 * via `seedRbacTestData` and removed in `after()` — production is never seeded
 * (the production role/permission matrix is DESIGN_REQUIRED).
 */
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'pg6-test-secret-do-not-use-in-prod';
process.env.PGDATABASE = process.env.PG_TEST_DATABASE ?? 'kayan_school_erp';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { getPostgresConfig } from '../datasource/postgresConfig';
import { PostgreSQLDataSource } from '../datasource/PostgreSQLDataSource';
import { DataSourceFactory } from '../datasource/DataSourceFactory';
import { createAuthRouter } from './authRoutes';
import { createMasterDataRouter } from '../../modules/master-data/api/masterDataRoutes';
import {
  seedRbacTestData,
  clearRbacTestData,
  TEST_PASSWORD,
  TEST_ADMIN_EMAIL,
  TEST_TEACHER_EMAIL,
} from './rbacTestSeed';

const PG_CONFIGURED = Boolean(process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD);
const describePg = PG_CONFIGURED ? describe : describe.skip;

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../migrations/postgres', import.meta.url));

function splitSqlStatements(sql: string): string[] {
  const stmts: string[] = [];
  let cur = '';
  let inLine = false, inBlock = false, inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i], next = i + 1 < sql.length ? sql[i + 1] : '';
    if (inLine) { if (ch === '\n') { inLine = false; cur += ch; } else cur += ch; continue; }
    if (inBlock) { if (ch === '*' && next === '/') { inBlock = false; cur += '*/'; i++; } else cur += ch; continue; }
    if (inStr) { if (ch === "'") { if (next === "'") { cur += "''"; i++; } else { inStr = false; cur += ch; } } else cur += ch; continue; }
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

const P = 'pg6_';
let ds: PostgreSQLDataSource;
let server: any;
let base = '';
let adminToken = '';
let teacherToken = '';

async function teardownData(): Promise<void> {
  await ds.execute(`DELETE FROM education_stages WHERE id LIKE ?`, [`${P}%`]);
}

async function api(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* 204 */ }
  return { status: res.status, json };
}

async function login(email: string, password: string) {
  return api('POST', '/api/auth/login', { email, password });
}

describePg('PG-6 Authentication & RBAC (live PostgreSQL)', () => {
  before(async () => {
    ds = new PostgreSQLDataSource(await getPostgresConfig());
    await applyMigrations(ds);
    await seedRbacTestData(ds);
    await teardownData();
    DataSourceFactory.setInstance(ds);

    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter());
    app.use('/api/master-data', createMasterDataRouter());
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await teardownData();
    await clearRbacTestData(ds);
    if (server) await new Promise<void>((r) => server.close(() => r()));
    if (ds) await ds.close();
    DataSourceFactory.reset();
  });

  // 1. valid login
  it('valid login returns token and user (no password_hash)', async () => {
    const res = await login(TEST_ADMIN_EMAIL, TEST_PASSWORD);
    assert.equal(res.status, 200, `login status ${res.status}: ${JSON.stringify(res.json)}`);
    assert.ok(res.json.token, 'token must be present');
    assert.equal(res.json.user.email, TEST_ADMIN_EMAIL);
    adminToken = res.json.token;
    const body = JSON.stringify(res.json);
    assert.ok(!body.includes('password_hash'), 'password_hash must not be returned');
    assert.ok(!body.includes('passwordHash'), 'passwordHash must not be returned');
  });

  // 2. invalid password
  it('invalid password -> 401', async () => {
    const res = await login(TEST_ADMIN_EMAIL, 'wrong-password');
    assert.equal(res.status, 401);
  });

  // 3. unknown user
  it('unknown user -> 401', async () => {
    const res = await login('nobody@test.local', TEST_PASSWORD);
    assert.equal(res.status, 401);
  });

  // 4. password_hash exclusion (explicit)
  it('password_hash is never present in any auth response', async () => {
    const res = await login(TEST_ADMIN_EMAIL, TEST_PASSWORD);
    const body = JSON.stringify(res.json);
    assert.ok(!body.includes('password_hash') && !body.includes('passwordHash'));
  });

  // 5. authenticated profile
  it('authenticated profile returns user + permissions (no password_hash)', async () => {
    const res = await api('GET', '/api/auth/profile', undefined, adminToken);
    assert.equal(res.status, 200);
    assert.equal(res.json.email, TEST_ADMIN_EMAIL);
    assert.ok(Array.isArray(res.json.permissions));
    assert.ok(res.json.permissions.includes('master_data:read'));
    assert.ok(!JSON.stringify(res.json).includes('password_hash'));
  });

  // 6. unauthenticated API request
  it('unauthenticated Master Data request -> 401', async () => {
    const res = await api('GET', '/api/master-data/education_stages');
    assert.equal(res.status, 401);
  });

  // 7. authenticated but unauthorized
  it('authenticated teacher POST -> 403 (lacks master_data:create)', async () => {
    const tlogin = await login(TEST_TEACHER_EMAIL, TEST_PASSWORD);
    assert.equal(tlogin.status, 200);
    teacherToken = tlogin.json.token;
    const res = await api('POST', '/api/master-data/education_stages', {
      id: `${P}t1`, code: `${P}t1`, name_ar: 'محاولة', is_active: 1, display_order: 1,
    }, teacherToken);
    assert.equal(res.status, 403, `expected 403, got ${res.status}: ${JSON.stringify(res.json)}`);
  });

  // 8. authorized request
  it('authorized admin POST -> 201', async () => {
    const res = await api('POST', '/api/master-data/education_stages', {
      id: `${P}a1`, code: `${P}a1`, name_ar: 'بواسطة مدير', is_active: 1, display_order: 1,
    }, adminToken);
    assert.equal(res.status, 201, `expected 201, got ${res.status}: ${JSON.stringify(res.json)}`);
  });

  // 9. permission denial (teacher cannot delete)
  it('permission denial: teacher DELETE -> 403', async () => {
    const res = await api('DELETE', `/api/master-data/education_stages/${P}a1`, undefined, teacherToken);
    assert.equal(res.status, 403);
  });

  // 10. role/permission mapping
  it('role/permission mapping: teacher has read-only, admin has full', async () => {
    const tprof = await api('GET', '/api/auth/profile', undefined, teacherToken);
    assert.deepEqual(tprof.json.permissions, ['master_data:read']);
    const aprof = await api('GET', '/api/auth/profile', undefined, adminToken);
    assert.ok(aprof.json.permissions.includes('master_data:create'));
    assert.ok(aprof.json.permissions.includes('master_data:delete'));
  });

  // 11. refresh behavior
  it('refresh issues a new valid token', async () => {
    const res = await api('POST', '/api/auth/refresh', undefined, adminToken);
    assert.equal(res.status, 200);
    assert.ok(res.json.token);
    const profile = await api('GET', '/api/auth/profile', undefined, res.json.token);
    assert.equal(profile.status, 200);
  });

  // 12. logout / revocation (stateless)
  it('logout returns success (stateless revocation deferred)', async () => {
    const res = await api('POST', '/api/auth/logout', undefined, adminToken);
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
  });

  // 13. Master Data API authorization (unauth/forbidden/allowed) — covered 6/7/8
  it('Master Data API authorization matrix verified', async () => {
    assert.equal((await api('GET', '/api/master-data/education_stages')).status, 401);
    assert.equal((await api('POST', '/api/master-data/education_stages', { id: `${P}z`, code: `${P}z`, name_ar: 'x', is_active: 1 }, teacherToken)).status, 403);
    assert.equal((await api('POST', '/api/master-data/education_stages', { id: `${P}z`, code: `${P}z`, name_ar: 'x', is_active: 1 }, adminToken)).status, 201);
  });

  // 14. no credential leakage
  it('no credential leakage: responses contain neither password nor password_hash', async () => {
    const loginRes = await login(TEST_ADMIN_EMAIL, TEST_PASSWORD);
    const s = JSON.stringify(loginRes.json);
    assert.ok(!s.includes(TEST_PASSWORD), 'password must not appear in response');
    assert.ok(!s.includes('password_hash'), 'password_hash must not appear');
    const prof = await api('GET', '/api/auth/profile', undefined, adminToken);
    assert.ok(!JSON.stringify(prof.json).includes('password_hash'));
  });
});
