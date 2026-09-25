/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-4.2 live PostgreSQL migration verification.
 *
 * Requires a live PostgreSQL 16 instance via the environment
 * (PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE). The password is read
 * exclusively through getPostgresConfig() and is NEVER logged or printed.
 *
 * Targets the dedicated `kayan_school_erp` database. If the PostgreSQL
 * environment is not configured the suite is skipped (no fake results).
 *
 * Verifies (success criteria A–F):
 *   A. All foundation/master/academic/school tables exist.
 *   B. Fresh-apply is possible (handled by the runner; here we confirm the
 *      schema is fully materialized over the live DB).
 *   C. Idempotency — the migration set is applied twice with stable results.
 *   D. ZERO Al-Salam / Yemen / geographic seed data.
 *   E. Repository-level CRUD (MasterDataRepository) works over PostgreSQL.
 *   F. Full regression is unchanged (covered by the rest of the suite).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { getPostgresConfig } from './postgresConfig';
import { PostgreSQLDataSource } from './PostgreSQLDataSource';
import { MasterDataRepository } from '../../modules/master-data/repository/masterDataRepository';

const PG_CONFIGURED = Boolean(
  process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD
);
const describePg = PG_CONFIGURED ? describe : describe.skip;

// Always target the dedicated PG dev database, not the default env DB.
process.env.PGDATABASE = process.env.PG_TEST_DATABASE ?? 'kayan_school_erp';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../migrations/postgres', import.meta.url));

const MASTER_TABLES = [
  'academic_years', 'academic_terms', 'education_stages', 'grade_levels',
  'sections_master', 'subjects_master', 'exam_types', 'certificate_types',
  'attendance_types', 'leave_types', 'academic_statuses', 'nationalities',
  'countries', 'governorates', 'districts', 'cities', 'identity_types',
  'employee_types', 'qualifications', 'specializations', 'job_titles',
  'departments', 'buildings', 'rooms', 'laboratories', 'libraries',
  'fee_categories', 'payment_methods', 'discount_types', 'currencies',
  'system_numbering', 'school_branches', 'document_types',
];

/**
 * Split a SQL file into individual statements on top-level semicolons,
 * ignoring semicolons inside line/block comments and single-quoted strings.
 * Comment-only / blank chunks are dropped.
 */
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
  // Drop comment-only chunks (no non-comment, non-whitespace content).
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

describePg('PG-4.2 live migration verification', () => {
  let ds: PostgreSQLDataSource;

  before(async () => {
    ds = new PostgreSQLDataSource(getPostgresConfig());
    // Apply once, then again, to prove idempotency (criterion C).
    await applyMigrations(ds);
    await applyMigrations(ds);
  });

  after(async () => {
    if (ds) await ds.close();
  });

  // ---- A. Tables exist ------------------------------------------------
  it('materializes all foundation / master / academic / school tables', async () => {
    const rows = await ds.query<{ tbl: string }>(
      `SELECT table_name AS tbl FROM information_schema.tables WHERE table_schema = ? ORDER BY tbl`,
      ['public']
    );
    const names = new Set(rows.map((r) => r.tbl));
    const required = [
      ...MASTER_TABLES,
      'schools',
      'schedule_periods',
      'master_data_audit_log',
      'master_data_permissions',
      'schema_migrations',
    ];
    for (const t of required) {
      assert.ok(names.has(t), `expected table ${t} in live schema`);
    }
  });

  it('keeps the 7 pilot tables present', async () => {
    const rows = await ds.query<{ tbl: string }>(
      `SELECT table_name AS tbl FROM information_schema.tables WHERE table_schema = ?`,
      ['public']
    );
    const names = new Set(rows.map((r) => r.tbl));
    for (const t of [
      'education_stages', 'grade_levels', 'academic_years', 'academic_terms',
      'subjects_master', 'academic_calendar_days', 'subjects',
    ]) {
      assert.ok(names.has(t), `expected pilot table ${t}`);
    }
  });

  // ---- Generic seed counts --------------------------------------------
  it('seeds the expected generic reference rows (no school-specific data)', async () => {
    const expect: Record<string, number> = {
      education_stages: 3,
      grade_levels: 12,
      exam_types: 5,
      certificate_types: 4,
      attendance_types: 4,
      leave_types: 5,
      academic_statuses: 5,
      identity_types: 4,
      employee_types: 4,
      qualifications: 5,
      specializations: 7,
      job_titles: 5,
      payment_methods: 4,
      discount_types: 4,
      system_numbering: 5,
      document_types: 4,
      currencies: 3,
      master_data_permissions: 33,
      schools: 1,
    };
    for (const [table, count] of Object.entries(expect)) {
      const r = await ds.queryOne<{ c: number }>(
        `SELECT COUNT(*)::int AS c FROM ${table}`
      );
      assert.strictEqual(r?.c, count, `unexpected row count for ${table}`);
    }
  });

  it('seeds a single generic school row and no base currency', async () => {
    const school = await ds.queryOne<{ code: string; currency_code: string | null }>(
      `SELECT code, currency_code FROM schools WHERE id = ?`,
      ['school_kayan']
    );
    assert.ok(school, 'generic school row missing');
    assert.strictEqual(school?.code, 'KAYAN');
    assert.strictEqual(school?.currency_code, null, 'generic seed must not assert a currency');

    const base = await ds.queryOne<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM currencies WHERE is_base = ?`,
      [1]
    );
    assert.strictEqual(base?.c, 0, 'generic seed must not assert a base currency (is_base=1)');
  });

  // ---- D. No Al-Salam / Yemen / geographic seed -----------------------
  it('contains ZERO geographic rows (countries/governorates/districts/cities/nationalities empty)', async () => {
    const geo = await ds.query<{ t: string; c: number }>(
      `SELECT 'nationalities' AS t, COUNT(*)::int AS c FROM nationalities
       UNION ALL SELECT 'countries', COUNT(*)::int FROM countries
       UNION ALL SELECT 'governorates', COUNT(*)::int FROM governorates
       UNION ALL SELECT 'districts', COUNT(*)::int FROM districts
       UNION ALL SELECT 'cities', COUNT(*)::int FROM cities`
    );
    for (const row of geo) {
      assert.strictEqual(row.c, 0, `geographic table ${row.t} must be empty in generic seed`);
    }
  });

  it('contains NO Al-Salam / Yemen-specific names in any master table', async () => {
    let bad = 0;
    for (const t of MASTER_TABLES) {
      const r = await ds.queryOne<{ c: number }>(
        `SELECT COUNT(*)::int AS c FROM ${t} WHERE name_ar LIKE ? OR name_en LIKE ?`,
        ['%الضالع%', '%جحاف%']
      );
      bad += r?.c ?? 0;
    }
    assert.strictEqual(bad, 0, 'found Al-Salam / Dhale / Jahaf references in master data');
  });

  // ---- C. Idempotency (re-apply stable) -------------------------------
  it('stays idempotent: row counts are stable after the second apply', async () => {
    const beforeCount = (await ds.queryOne<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM education_stages`
    ))!.c;
    await applyMigrations(ds);
    const afterCount = (await ds.queryOne<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM education_stages`
    ))!.c;
    assert.strictEqual(afterCount, beforeCount, 'education_stages count changed on re-apply');
  });

  // ---- E. Repository-level CRUD over PostgreSQL -----------------------
  it('MasterDataRepository create -> getById -> delete works on PostgreSQL', async () => {
    const repo = new MasterDataRepository(ds);
    const created = await repo.create('document_types', {
      id: 'pg4_test_doc',
      code: 'PG4-TST',
      name_ar: 'PG4 Test',
      is_active: 1,
    });
    assert.ok(created, 'create returned nothing');
    assert.strictEqual(created?.id, 'pg4_test_doc');

    const found = await repo.getById('document_types', 'pg4_test_doc');
    assert.ok(found, 'row not found after insert');
    assert.strictEqual(found?.code, 'PG4-TST');

    const deleted = await repo.delete('document_types', 'pg4_test_doc');
    assert.strictEqual(deleted, true, 'delete failed');
    const gone = await repo.getById('document_types', 'pg4_test_doc');
    assert.strictEqual(gone, null, 'row still present after delete');
  });

  // ==========================================================================
  // PG-4.3 live verification (success criteria A–E extended)
  // ==========================================================================
  const PG43_TABLES = [
    'users', 'teachers', 'parents', 'school_classes', 'sections', 'students',
    'teacher_subjects', 'teacher_classes', 'parent_students', 'user_linked_students',
    'fee_payments', 'expense_records',
    'attendance_records', 'grade_records', 'certificates', 'library_books',
    'book_borrowings', 'app_notifications', 'saved_reports',
    'school_settings', 'audit_logs', 'roles', 'permissions', 'user_roles', 'role_permissions',
  ];

  it('materializes all 25 PG-4.3 runtime tables', async () => {
    const rows = await ds.query<{ tbl: string }>(
      `SELECT table_name AS tbl FROM information_schema.tables WHERE table_schema = ?`,
      ['public']
    );
    const names = new Set(rows.map((r) => r.tbl));
    for (const t of PG43_TABLES) {
      assert.ok(names.has(t), `expected PG-4.3 table ${t} in live schema`);
    }
  });

  it('keeps all PG-4.3 runtime tables EMPTY except the generic school_settings row', async () => {
    for (const t of PG43_TABLES) {
      const r = await ds.queryOne<{ c: number }>(`SELECT COUNT(*)::int AS c FROM ${t}`);
      const expected = t === 'school_settings' ? 1 : 0;
      assert.strictEqual(r?.c, expected, `unexpected row count for ${t}`);
    }
  });

  it('seeds only the approved generic school_settings row (no Al-Salam values)', async () => {
    const row = await ds.queryOne<{
      school_name: string; name_en: string; address: string; email: string;
      academic_year: string; current_term: string;
    }>(`SELECT school_name, name_en, address, email, academic_year, current_term FROM school_settings WHERE id = ?`, [1]);
    assert.ok(row, 'generic school_settings row missing');
    assert.strictEqual(row?.school_name, 'Kayan School ERP');
    assert.strictEqual(row?.name_en, 'Kayan School ERP');
    assert.strictEqual(row?.address, '');
    assert.strictEqual(row?.email, '');
    assert.strictEqual(row?.academic_year, '');
    assert.strictEqual(row?.current_term, '');
    const bad = await ds.queryOne<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM school_settings WHERE address LIKE ? OR email LIKE ? OR school_name LIKE ?`,
      ['%الضالع%', '%جحاف%', '%السلام%']
    );
    assert.strictEqual(bad?.c, 0, 'school_settings contains Al-Salam / Dhale / Jahaf values');
  });

  it('leaves RBAC base tables EMPTY (seed deferred to PG-6)', async () => {
    for (const t of ['roles', 'permissions', 'user_roles', 'role_permissions']) {
      const r = await ds.queryOne<{ c: number }>(`SELECT COUNT(*)::int AS c FROM ${t}`);
      assert.strictEqual(r?.c, 0, `RBAC table ${t} must be empty in PG-4.3`);
    }
  });

  it('schema-level CRUD works across the people/relationship -> operational chain', async () => {
    // Insert a valid synthetic chain, prove it round-trips, then clean up in
    // reverse FK order so the tables remain EMPTY afterward.
    await ds.execute(
      `INSERT INTO users (id, name, role, email, password_hash, phone, status) VALUES (?, ?, 'teacher', ?, 'x', '+000', 'active')`,
      ['pg43_u', 'PG43 User', 'pg43.user@example.com']
    );
    await ds.execute(
      `INSERT INTO teachers (id, user_id, name, email, phone, specialization, qualification) VALUES (?, ?, 'T', ?, '+000', 'Math', 'BSc')`,
      ['pg43_t', 'pg43_u', 't@example.com']
    );
    await ds.execute(
      `INSERT INTO parents (id, user_id, name, email, phone) VALUES (?, ?, 'P', ?, '+000')`,
      ['pg43_p', 'pg43_u', 'p@example.com']
    );
    await ds.execute(
      `INSERT INTO school_classes (id, name, level) VALUES (?, ?, 1)`,
      ['pg43_c', 'PG43 Class']
    );
    await ds.execute(
      `INSERT INTO sections (id, name, class_id, room_number, capacity) VALUES (?, 'A', ?, 'R1', 30)`,
      ['pg43_s', 'pg43_c']
    );
    await ds.execute(
      `INSERT INTO students (id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name, parent_phone, birth_date, gender, enrollment_date) VALUES (?, ?, 'PG43-2024-001', 'Student', ?, ?, ?, 'Parent', '+000', '2010-01-01', 'male', '2024-01-01')`,
      ['pg43_st', 'pg43_u', 'pg43_c', 'pg43_s', 'pg43_p']
    );
    await ds.execute(
      `INSERT INTO attendance_records (id, student_id, class_id, section_id, date, status, recorded_by) VALUES (?, ?, ?, ?, '2024-01-01', 'present', ?)`,
      ['pg43_a', 'pg43_st', 'pg43_c', 'pg43_s', 'pg43_u']
    );

    const stu = await ds.queryOne<{ name: string }>(
      `SELECT name FROM students WHERE id = ?`, ['pg43_st']
    );
    assert.strictEqual(stu?.name, 'Student', 'student row not retrievable');

    const att = await ds.queryOne<{ status: string }>(
      `SELECT status FROM attendance_records WHERE id = ?`, ['pg43_a']
    );
    assert.strictEqual(att?.status, 'present', 'attendance row not retrievable');

    // Cleanup (reverse FK order) — leaves tables EMPTY.
    await ds.execute(`DELETE FROM attendance_records WHERE id = ?`, ['pg43_a']);
    await ds.execute(`DELETE FROM students WHERE id = ?`, ['pg43_st']);
    await ds.execute(`DELETE FROM sections WHERE id = ?`, ['pg43_s']);
    await ds.execute(`DELETE FROM school_classes WHERE id = ?`, ['pg43_c']);
    await ds.execute(`DELETE FROM parents WHERE id = ?`, ['pg43_p']);
    await ds.execute(`DELETE FROM teachers WHERE id = ?`, ['pg43_t']);
    await ds.execute(`DELETE FROM users WHERE id = ?`, ['pg43_u']);

    const after = await ds.queryOne<{ c: number }>(`SELECT COUNT(*)::int AS c FROM students`);
    assert.strictEqual(after?.c, 0, 'students not empty after cleanup');
  });

  it('stays idempotent for PG-4.3 inserts (school_settings stable at 1)', async () => {
    const c = (await ds.queryOne<{ c: number }>(`SELECT COUNT(*)::int AS c FROM school_settings`))!.c;
    assert.strictEqual(c, 1, 'school_settings count changed on re-apply');
  });
});
