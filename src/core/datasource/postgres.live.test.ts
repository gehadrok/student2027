/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-3 LIVE PostgreSQL integration test.
 *
 * Requires a live PostgreSQL 16 instance reachable via the environment
 * (PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE). The password is read
 * exclusively through getPostgresConfig() (environment) and is NEVER logged,
 * asserted, or printed in any output.
 *
 * Targets the dedicated `kayan_school_erp` database created in PG-3 Phase 2.
 * If the PostgreSQL environment is not configured, the suite is skipped
 * (external service absent) — no fake/mock results are produced.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { getPostgresConfig } from './postgresConfig';
import { PostgreSQLDataSource } from './PostgreSQLDataSource';
import { DataSourceFactory } from './DataSourceFactory';
import { SQLiteDataSource } from './SQLiteDataSource';

import { SQLiteAcademicYearRepository } from '../../modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository';
import { SQLiteCourseAssignmentRepository } from '../../modules/academic/infrastructure/repositories/SQLiteCourseAssignmentRepository';
import { AcademicYear } from '../../modules/academic/domain/aggregates/AcademicYear';
import { AcademicYearId } from '../../modules/academic/domain/value-objects/AcademicYearId';
import { AcademicYearCode } from '../../modules/academic/domain/value-objects/AcademicYearCode';
import { SchoolScopeId } from '../../modules/academic/domain/value-objects/SchoolScopeId';
import { DateRange } from '../../modules/academic/domain/value-objects/DateRange';
import { AcademicTerm } from '../../modules/academic/domain/entities/AcademicTerm';
import { AcademicTermId } from '../../modules/academic/domain/value-objects/AcademicTermId';
import { AcademicTermCode } from '../../modules/academic/domain/value-objects/AcademicTermCode';
import { CourseAssignmentId } from '../../modules/academic/domain/value-objects/CourseAssignmentId';
import { SubjectId } from '../../modules/academic/domain/value-objects/SubjectId';
import { TeacherId } from '../../modules/academic/domain/value-objects/TeacherId';
import { GradeLevelId } from '../../modules/academic/domain/value-objects/GradeLevelId';

const PG_CONFIGURED = Boolean(
  process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD
);
const describePg = PG_CONFIGURED ? describe : describe.skip;

// Always target the dedicated PG-3 dev database (Phase 2), not the default env DB.
process.env.PGDATABASE = process.env.PG_TEST_DATABASE ?? 'kayan_school_erp';

const YEAR_ID = 'pg3_year_1';
const YEAR_CODE = 'PG3-YR1';
const TERM_ID = 'pg3_term_1';
const TERM_CODE = 'PG3-T1';
const CA_ID = 'pg3_ca_1';

async function cleanup(ds: PostgreSQLDataSource): Promise<void> {
  // Idempotent cleanup of ALL pg3 test artifacts (covers ad-hoc ids used in
  // individual tests), so re-runs never hit leftover rows.
  await ds.execute("DELETE FROM academic_terms WHERE academic_year_id LIKE ? OR id LIKE ? OR code LIKE ?", ['pg3_%', 'pg3_%', 'PG3-%']);
  await ds.execute("DELETE FROM academic_years WHERE id LIKE ? OR code LIKE ?", ['pg3_%', 'PG3-%']);
  await ds.execute('DELETE FROM subjects WHERE id LIKE ?', ['pg3_%']);
}

describePg('PG-3 live PostgreSQL integration', () => {
  let ds: PostgreSQLDataSource;

  before(async () => {
    ds = new PostgreSQLDataSource(getPostgresConfig());
    await cleanup(ds);
  });

  after(async () => {
    if (ds) {
      await cleanup(ds);
      await ds.close();
    }
  });

  // ---- PHASE 3: datasource primitives -------------------------------------
  it('connects and runs a real query', async () => {
    const r = await ds.queryOne<{ v: number }>('SELECT 1 AS v');
    assert.strictEqual(r?.v, 1);
  });

  it('translates ? placeholders to $N through the real datasource', async () => {
    const one = await ds.queryOne<{ n: number }>('SELECT ?::int AS n', [7]);
    assert.strictEqual(one?.n, 7);

    const two = await ds.queryOne<{ a: number; b: string }>(
      'SELECT ?::int AS a, ?::text AS b',
      [3, 'hello']
    );
    assert.strictEqual(two?.a, 3);
    assert.strictEqual(two?.b, 'hello');
  });

  it('query/queryOne return real rows with correct columns', async () => {
    const rows = await ds.query<{ tbl: string }>(`SELECT table_name AS tbl FROM information_schema.tables WHERE table_schema = ? ORDER BY tbl`, ['public']);
    assert.ok(Array.isArray(rows));
    assert.ok(rows.length >= 7);
    const names = rows.map((r) => r.tbl);
    for (const t of ['academic_years', 'academic_terms', 'subjects_master', 'academic_calendar_days', 'education_stages', 'grade_levels', 'subjects']) {
      assert.ok(names.includes(t), `expected table ${t} in live schema`);
    }
  });

  // ---- PHASE 4: real CRUD + transactions + constraints --------------------
  it('execute returns affected row count', async () => {
    const res = await ds.execute(
      'INSERT INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [YEAR_ID, YEAR_CODE, 'PG3 Year', '2027-09-01', '2028-08-31', 1]
    );
    assert.strictEqual(res.changes, 1);
  });

  it('real INSERT -> SELECT -> UPDATE -> DELETE CRUD on a pilot table', async () => {
    const id = 'pg3_crud_1';
    await ds.execute(
      'INSERT INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, 'PG3-CRUD', 'Before', '2027-09-01', '2028-08-31', 1]
    );
    let row = await ds.queryOne<{ name_ar: string }>('SELECT name_ar FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(row?.name_ar, 'Before');

    await ds.execute('UPDATE academic_years SET name_ar = ? WHERE id = ?', ['After', id]);
    row = await ds.queryOne<{ name_ar: string }>('SELECT name_ar FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(row?.name_ar, 'After');

    const cnt = await ds.count('SELECT * FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(cnt, 1);
    const exists = await ds.exists('SELECT 1 FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(exists, true);

    const del = await ds.execute('DELETE FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(del.changes, 1);
    const cnt2 = await ds.count('SELECT * FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(cnt2, 0);
  });

  it('transaction COMMIT persists changes', async () => {
    const id = 'pg3_tx_commit';
    const res = await ds.transaction([
      {
        sql: 'INSERT INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        params: [id, 'PG3-TXC', 'T', '2027-09-01', '2028-08-31', 1],
      },
    ]);
    assert.strictEqual(res.success, true);
    const cnt = await ds.count('SELECT * FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(cnt, 1);
    await ds.execute('DELETE FROM academic_years WHERE id = ?', [id]);
  });

  it('transaction ROLLBACK undoes all statements on error', async () => {
    const id = 'pg3_tx_rb';
    await ds.execute(
      'INSERT INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, 'PG3-TXR', 'T', '2027-09-01', '2028-08-31', 1]
    );
    // Second insert with the SAME id must violate the PK and trigger rollback.
    const res = await ds.transaction([
      {
        sql: 'INSERT INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        params: [id, 'PG3-TXR2', 'T', '2027-09-01', '2028-08-31', 1],
      },
    ]);
    assert.strictEqual(res.success, false);
    // The whole transaction rolled back, so the original row remains intact.
    const cnt = await ds.count('SELECT * FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(cnt, 1);
    await ds.execute('DELETE FROM academic_years WHERE id = ?', [id]);
  });

  it('FK constraint failure is reported by the transaction', async () => {
    const res = await ds.transaction([
      {
        sql: 'INSERT INTO academic_terms (id, code, name_ar, academic_year_id, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: ['pg3_fk', 'PG3-FK', 'T', 'pg3_no_such_year', '2027-09-01', '2028-01-31', 1],
      },
    ]);
    assert.strictEqual(res.success, false);
    assert.ok(/foreign|key|violat/i.test(res.error ?? ''), `expected FK error, got: ${res.error}`);
  });

  it('ON CONFLICT: INSERT OR IGNORE keeps a single row', async () => {
    const id = 'pg3_ignore';
    await ds.execute(
      'INSERT OR IGNORE INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, 'PG3-IGN', 'T', '2027-09-01', '2028-08-31', 1]
    );
    await ds.execute(
      'INSERT OR IGNORE INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, 'PG3-IGN', 'T2', '2027-09-01', '2028-08-31', 1]
    );
    const cnt = await ds.count('SELECT * FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(cnt, 1);
    const row = await ds.queryOne<{ name_ar: string }>('SELECT name_ar FROM academic_years WHERE id = ?', [id]);
    assert.strictEqual(row?.name_ar, 'T'); // unchanged by the ignored duplicate
    await ds.execute('DELETE FROM academic_years WHERE id = ?', [id]);
  });

  it('ON CONFLICT: INSERT OR REPLACE updates the existing row', async () => {
    const id = 'pg3_replace';
    await ds.execute(
      'INSERT OR REPLACE INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, 'PG3-REP', 'T', '2027-09-01', '2028-08-31', 1]
    );
    await ds.execute(
      'INSERT OR REPLACE INTO academic_years (id, code, name_ar, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, 'PG3-REP', 'T2', '2027-09-01', '2028-08-31', 0]
    );
    const row = await ds.queryOne<{ name_ar: string; is_active: number }>(
      'SELECT name_ar, is_active FROM academic_years WHERE id = ?',
      [id]
    );
    assert.strictEqual(row?.name_ar, 'T2');
    assert.strictEqual(row?.is_active, 0);
    await ds.execute('DELETE FROM academic_years WHERE id = ?', [id]);
  });

  // ---- PHASE 5: DataSourceFactory selection -------------------------------
  it('DataSourceFactory returns SQLiteDataSource for sqlite', async () => {
    const s = await DataSourceFactory.createDataSource('sqlite');
    assert.ok(s instanceof SQLiteDataSource);
  });

  it('DataSourceFactory returns PostgreSQLDataSource for postgresql and reaches kayan_school_erp', async () => {
    const p = (await DataSourceFactory.createDataSource('postgresql')) as PostgreSQLDataSource;
    try {
      assert.ok(p instanceof PostgreSQLDataSource);
      const r = await p.queryOne<{ n: number }>(
        'SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = ?',
        ['public']
      );
      assert.ok((r?.n ?? 0) >= 7, 'postgresql datasource did not reach the live schema');
    } finally {
      await p.close();
    }
  });

  // ---- PHASE 6: Academic repository pilot (real persistence) --------------
  it('AcademicYearRepository persists INSERT -> SELECT -> UPDATE -> DELETE on PostgreSQL', async () => {
    const repo = new SQLiteAcademicYearRepository(ds);

    const year = AcademicYear.create({
      id: new AcademicYearId(YEAR_ID),
      code: new AcademicYearCode(YEAR_CODE),
      schoolScopeId: new SchoolScopeId(YEAR_ID),
      dateRange: new DateRange({ startDate: new Date('2027-09-01'), endDate: new Date('2028-08-31') }),
      createdBy: 'pg3-tester',
    });
    const term = new AcademicTerm({
      id: new AcademicTermId(TERM_ID),
      code: new AcademicTermCode(TERM_CODE),
      dateRange: new DateRange({ startDate: new Date('2027-09-01'), endDate: new Date('2028-01-31') }),
    });
    year.addTerm(term, 'pg3-tester');

    await repo.save(year); // INSERT year + term

    let found = await repo.findById(new AcademicYearId(YEAR_ID));
    assert.ok(found, 'academic year not found after insert');
    assert.strictEqual(found?.status, 'draft');
    assert.strictEqual(found?.terms.length, 1);

    // UPDATE path: approve then activate.
    const approved = (await repo.findById(new AcademicYearId(YEAR_ID)))!;
    approved.approve('pg3-tester');
    await repo.save(approved);
    found = await repo.findById(new AcademicYearId(YEAR_ID));
    assert.strictEqual(found?.status, 'approved');

    const activated = (await repo.findById(new AcademicYearId(YEAR_ID)))!;
    activated.activate('pg3-tester');
    await repo.save(activated);
    found = await repo.findById(new AcademicYearId(YEAR_ID));
    assert.strictEqual(found?.status, 'active');

    const deleted = await repo.delete(new AcademicYearId(YEAR_ID));
    assert.strictEqual(deleted, true);
    const gone = await repo.findById(new AcademicYearId(YEAR_ID));
    assert.strictEqual(gone, null);
  });

  it('CourseAssignmentRepository persists INSERT -> SELECT -> UPDATE -> DELETE on PostgreSQL (subjects)', async () => {
    const repo = new SQLiteCourseAssignmentRepository(ds);
    const record = {
      id: CA_ID,
      subjectId: 'pg3_subj_1',
      gradeLevelId: 'pg3_grade_1',
      teacherId: 'pg3_teacher_1',
      weeklyPeriods: 4,
      isActive: true,
    };

    const saved = await repo.save(record);
    assert.ok(saved);
    assert.strictEqual(saved?.weeklyPeriods, 4);

    const found = await repo.findById(new CourseAssignmentId(CA_ID));
    assert.ok(found);
    assert.strictEqual(found?.teacherId, 'pg3_teacher_1');

    const updated = await repo.save({ ...record, weeklyPeriods: 6 });
    assert.strictEqual(updated?.weeklyPeriods, 6);
    const found2 = await repo.findById(new CourseAssignmentId(CA_ID));
    assert.strictEqual(found2?.weeklyPeriods, 6);

    const deleted = await repo.delete(new CourseAssignmentId(CA_ID));
    assert.strictEqual(deleted, true);
    const gone = await repo.findById(new CourseAssignmentId(CA_ID));
    assert.strictEqual(gone, null);
  });
});
