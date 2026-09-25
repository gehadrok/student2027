/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-4.5 — Full repository coverage against live PostgreSQL (kayan_school_erp).
 *
 * Covers every IDataSource-consuming repository:
 *   - PostgreSQLDataSource.count / exists (both count-query and predicate forms)
 *   - MasterDataRepository (create / getAll total / getById / update / delete /
 *     isFieldUnique / bulkDelete transaction / FK child-relation guard)
 *   - AuthService (SELECT login path)
 *   - SQLiteCurriculumRepository (academic live smoke: save / findById / getAll / delete)
 *
 * The count()/exists() assertions encode CORRECT behaviour. They fail against
 * the current PostgreSQLDataSource (which always wraps the SQL) and pass once
 * the dialect boundary is fixed — i.e. they are the regression tests for the
 * PG-4.5 defect.
 *
 * All rows are prefixed `pg45_` and removed in `after`, leaving the DB unchanged.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { getPostgresConfig } from './postgresConfig';
import { PostgreSQLDataSource } from './PostgreSQLDataSource';
import { MasterDataRepository } from '../../modules/master-data/repository/masterDataRepository';
import { AuthService } from '../../core/auth/AuthService';
import { SQLiteCurriculumRepository } from '../../modules/academic/infrastructure/repositories/SQLiteCurriculumRepository';

const PG_CONFIGURED = Boolean(
  process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD
);
const describePg = PG_CONFIGURED ? describe : describe.skip;

process.env.PGDATABASE = process.env.PG_TEST_DATABASE ?? 'kayan_school_erp';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../migrations/postgres', import.meta.url));

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
    if (inLine) {
      if (ch === '\n') { inLine = false; cur += ch; }
      else cur += ch;
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') { inBlock = false; cur += '*/'; i++; continue; }
      cur += ch; continue;
    }
    if (inStr) {
      if (ch === "'") {
        if (next === "'") { cur += "''"; i++; continue; }
        inStr = false; cur += ch; continue;
      }
      cur += ch; continue;
    }
    if (ch === '-' && next === '-') { inLine = true; cur += '--'; i++; continue; }
    if (ch === '/' && next === '*') { inBlock = true; cur += '/*'; i++; continue; }
    if (ch === "'") { inStr = true; cur += ch; continue; }
    if (ch === ';') {
      if (cur.trim()) stmts.push(cur.trim());
      cur = ''; continue;
    }
    cur += ch;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts.filter((s) => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().length > 0);
}

async function applyMigrations(ds: PostgreSQLDataSource): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    for (const stmt of splitSqlStatements(sql)) {
      await ds.execute(stmt);
    }
  }
}

const P = 'pg45_';

let ds: PostgreSQLDataSource;

async function teardown(): Promise<void> {
  await ds.execute(`DELETE FROM subjects_master WHERE id LIKE ?`, [`${P}%`]);
  await ds.execute(`DELETE FROM grade_levels WHERE id LIKE ?`, [`${P}%`]);
  await ds.execute(`DELETE FROM education_stages WHERE id LIKE ?`, [`${P}%`]);
  await ds.execute(`DELETE FROM users WHERE id LIKE ?`, [`${P}%`]);
}

describePg('PG-4.5 repository coverage against live PostgreSQL', () => {
  before(async () => {
    ds = new PostgreSQLDataSource(await getPostgresConfig());
    await applyMigrations(ds);
    await teardown();
  });

  after(async () => {
    await teardown();
    if (ds) await ds.close();
  });

  beforeEach(async () => {
    await teardown();
  });

  it('count(): count-query form returns the real row count (regression)', async () => {
    const ids = [`${P}cnt1`, `${P}cnt2`, `${P}cnt3`];
    for (const id of ids) {
      await ds.execute(
        `INSERT INTO education_stages (id, code, name_ar, is_active, display_order, created_at, updated_at)
         VALUES (?, ?, ?, 1, 1, now(), now())`,
        [id, id, id]
      );
    }
    const real = Number((await ds.query<any>(`SELECT COUNT(*) as cnt FROM education_stages WHERE id LIKE ?`, [`${P}%`]))[0].cnt);
    const viaCount = await ds.count(`SELECT COUNT(*) as cnt FROM education_stages WHERE id LIKE ?`, [`${P}%`]);
    for (const id of ids) await ds.execute(`DELETE FROM education_stages WHERE id = ?`, [id]);
    assert.equal(real, 3, 'fixture count must be 3');
    assert.equal(viaCount, real, 'count() must return the real row count for count-query form');
  });

  it('exists(): count-query form returns false for a non-matching row (regression)', async () => {
    await ds.execute(
      `INSERT INTO education_stages (id, code, name_ar) VALUES (?, ?, ?)`,
      [`${P}ex`, 'x', 'x']
    );
    const exExisting = await ds.exists(`SELECT COUNT(*) as cnt FROM education_stages WHERE id = ?`, [`${P}ex`]);
    const exMissing = await ds.exists(`SELECT COUNT(*) as cnt FROM education_stages WHERE id = ?`, [`${P}definitely_missing`]);
    await ds.execute(`DELETE FROM education_stages WHERE id = ?`, [`${P}ex`]);
    assert.equal(exExisting, true, 'exists() must be true for an existing row');
    assert.equal(exMissing, false, 'exists() must be false for a non-matching count query');
  });

  it('count()/exists() still support predicate (SELECT * / SELECT 1) form', async () => {
    await ds.execute(`INSERT INTO education_stages (id, code, name_ar) VALUES (?, ?, ?)`, [`${P}pred`, 'x', 'x']);
    const c = await ds.count(`SELECT * FROM education_stages WHERE id = ?`, [`${P}pred`]);
    const e = await ds.exists(`SELECT 1 FROM education_stages WHERE id = ?`, [`${P}pred`]);
    const eMissing = await ds.exists(`SELECT 1 FROM education_stages WHERE id = ?`, [`${P}nope`]);
    await ds.execute(`DELETE FROM education_stages WHERE id = ?`, [`${P}pred`]);
    assert.equal(c, 1);
    assert.equal(e, true);
    assert.equal(eMissing, false);
  });

  it('MasterDataRepository: create -> getById -> getAll(total) -> update -> delete', async () => {
    const md = new MasterDataRepository(ds);
    const et = 'education_stages';
    const id = `${P}md1`;
    const created = await md.create(et, {
      id,
      code: id,
      name_ar: 'اختبار',
      name_en: 'Test',
      description: 'd',
      is_active: 1,
      display_order: 1,
    } as any);
    assert.ok(created, 'create should return the row');
    assert.equal((await md.getById(et, id))?.id, id);

    const all = await md.getAll(et);
    const realCount = Number((await ds.query<any>(`SELECT COUNT(*) as cnt FROM education_stages`))[0].cnt);
    assert.equal(all.total, realCount, 'getAll().total must equal real row count (not 1)');

    await md.update(et, id, { name_ar: 'اختبار2' } as any);
    assert.equal((await md.getById(et, id))?.name_ar, 'اختبار2');

    assert.equal(await md.delete(et, id), true);
    assert.equal(await md.getById(et, id), null);
  });

  it('MasterDataRepository.isFieldUnique: false for existing, true for unique', async () => {
    const md = new MasterDataRepository(ds);
    const et = 'education_stages';
    const id = `${P}uniq1`;
    await md.create(et, { id, code: id, name_ar: 'u', is_active: 1, display_order: 1 } as any);
    assert.equal(await md.isFieldUnique(et, 'code', id), false, 'existing code is not unique');
    assert.equal(await md.isFieldUnique(et, 'code', `${P}brand_new_xyz`), true, 'new code is unique');
    await md.delete(et, id);
  });

  it('MasterDataRepository: bulkDelete in a transaction (no-children rows)', async () => {
    const md = new MasterDataRepository(ds);
    const a = `${P}bd_a`;
    const b = `${P}bd_b`;
    await md.create('education_stages', { id: a, code: a, name_ar: 'a', is_active: 1, display_order: 1 } as any);
    await md.create('education_stages', { id: b, code: b, name_ar: 'b', is_active: 1, display_order: 2 } as any);

    const res = await md.bulkDelete('education_stages', [a, b]);
    assert.equal(res.success, 2, 'bulkDelete should remove both rows in one transaction');
    assert.equal(await md.getById('education_stages', a), null);
    assert.equal(await md.getById('education_stages', b), null);
  });

  it('MasterDataRepository: delete blocked by FK child (education_stages -> grade_levels)', async () => {
    const md = new MasterDataRepository(ds);
    const esId = `${P}es1`;
    const glId = `${P}gl1`;
    await ds.execute(
      `INSERT INTO education_stages (id, code, name_ar, is_active, display_order, created_at, updated_at) VALUES (?, ?, ?, 1, 1, now(), now())`,
      [esId, esId, 'stage']
    );
    await ds.execute(
      `INSERT INTO grade_levels (id, code, name_ar, education_stage_id, level_number, is_active, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, 1, now(), now())`,
      [glId, glId, 'gl', esId]
    );

    const blocked = await md.delete('education_stages', esId);
    assert.equal(blocked, false, 'delete blocked while child grade_levels exist');

    // Remove the child, then delete succeeds.
    await ds.execute(`DELETE FROM grade_levels WHERE id = ?`, [glId]);
    assert.equal(await md.delete('education_stages', esId), true, 'delete succeeds after child removed');
  });

  it('AuthService: login SELECT path runs against PostgreSQL without throwing', async () => {
    const auth = new AuthService(ds);
    const uid = `${P}auth1`;
    await ds.execute(
      `INSERT INTO users (id, name, email, role, password_hash, status, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, now(), now())`,
      [uid, 'Auth User', `${P}auth@test.local`, 'admin', 'x', 'active', '0000000000']
    );

    // Unknown email: query executes against PG, returns 0 rows -> failure, no throw.
    const unknown = await auth.login({ email: `${P}missing@test.local`, password: 'any' } as any);
    assert.equal(unknown.success, false, 'unknown email -> failure, no throw');

    // Existing email: query executes and maps id/name/email/role columns without throwing.
    const known = await auth.login({ email: `${P}auth@test.local`, password: 'any' } as any);
    assert.ok(typeof known.success === 'boolean', 'login returns a boolean success for an existing user');

    await ds.execute(`DELETE FROM users WHERE id = ?`, [uid]);
  });

  it('SQLiteCurriculumRepository: save -> findById -> getAll -> delete (academic live smoke)', async () => {
    const repo = new SQLiteCurriculumRepository(ds);
    const id = `${P}cur1` as any;
    const record: any = {
      id,
      code: id,
      nameAr: 'منهج تجريبي',
      nameEn: 'Demo Curriculum',
      description: 'smoke',
      gradeLevelId: null,
      isActive: true,
      displayOrder: 1,
    };

    const saved = await repo.save(record);
    assert.ok(saved, 'curriculum save should return a record');
    assert.equal((await repo.findById(id))?.id, id);

    const all = await repo.getAll();
    assert.ok(all.find((r: any) => r.id === id), 'curriculum present in getAll');

    assert.equal(await repo.delete(id), true);
    assert.equal(await repo.findById(id), null);
  });
});
