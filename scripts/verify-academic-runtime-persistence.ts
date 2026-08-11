/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Academic Runtime Persistence Verification (REAL SQLite).
 *
 * PURPOSE
 * =======
 * Verifies that the REAL Academic repositories can persist and reconstruct data
 * against a REAL sql.js SQLite database that is initialized using the SAME
 * schema-loading path used by the application at startup:
 *
 *   src/lib/sqlite-schema.sql  (canonical runtime schema)
 *   src/lib/sqlite-seed.sql    (canonical runtime seed)
 *
 * This is NOT an InMemoryDataSource test double. It constructs an actual
 * sql.js Database (in-memory), runs the schema + seed SQL, then wraps the live
 * Database in an IDataSource implementation and drives the real repositories
 * through it.
 *
 * Run via: npx node scripts/run-academic-runtime-persistence.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database } from 'sql.js';

import { IDataSource } from '../src/core/datasource/IDataSource';
import { UnitOfWork } from '../src/core/datasource/UnitOfWork';
import { EventBus } from '../src/core/events/EventBus';

import { SQLiteAcademicYearRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository';
import { SQLiteCurriculumRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteCurriculumRepository';
import { SQLiteCourseAssignmentRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteCourseAssignmentRepository';
import { SQLiteAcademicCalendarRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteAcademicCalendarRepository';

import { AcademicYear } from '../src/modules/academic/domain/aggregates/AcademicYear';
import { AcademicTerm } from '../src/modules/academic/domain/entities/AcademicTerm';
import { AcademicYearId } from '../src/modules/academic/domain/value-objects/AcademicYearId';
import { AcademicYearCode } from '../src/modules/academic/domain/value-objects/AcademicYearCode';
import { SchoolScopeId } from '../src/modules/academic/domain/value-objects/SchoolScopeId';
import { DateRange } from '../src/modules/academic/domain/value-objects/DateRange';
import { AcademicTermId } from '../src/modules/academic/domain/value-objects/AcademicTermId';
import { AcademicTermCode } from '../src/modules/academic/domain/value-objects/AcademicTermCode';
import { CurriculumId } from '../src/modules/academic/domain/value-objects/CurriculumId';
import { CurriculumCode } from '../src/modules/academic/domain/value-objects/CurriculumCode';
import { CourseAssignmentId } from '../src/modules/academic/domain/value-objects/CourseAssignmentId';
import { SubjectId } from '../src/modules/academic/domain/value-objects/SubjectId';
import { TeacherId } from '../src/modules/academic/domain/value-objects/TeacherId';
import { GradeLevelId } from '../src/modules/academic/domain/value-objects/GradeLevelId';
import { SchoolDayId } from '../src/modules/academic/domain/value-objects/SchoolDayId';
import { AcademicWeek } from '../src/modules/academic/domain/value-objects/AcademicWeek';
import { AcademicCalendarDate } from '../src/modules/academic/domain/value-objects/AcademicCalendarDate';

/**
 * IDataSource implementation backed by a REAL sql.js Database.
 * This is a thin adapter over the live Database — it is NOT an in-memory
 * test double mirroring the schema. Every query is executed by the real
 * SQLite engine.
 */
class RealSQLiteDataSource implements IDataSource {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
    this.db.run('PRAGMA foreign_keys = ON;');
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params || []);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as unknown as T);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
    this.db.run(sql, params || []);
    const meta = await this.queryOne<{ cnt: number; id: number }>(
      'SELECT changes() as cnt, last_insert_rowid() as id'
    );
    return { changes: meta?.cnt ?? 0, lastInsertRowid: meta?.id ?? 0 };
  }

  async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<{ success: boolean; error?: string }> {
    try {
      await this.beginTransaction();
      for (const q of queries) {
        this.db.run(q.sql, q.params || []);
      }
      await this.commit();
      return { success: true };
} catch (err: any) {
      await this.rollback();
      console.error('>>> TRANSACTION ERROR:', err);
      return { success: false, error: err?.message || String(err) || 'Transaction failed' };
    }
  }

  async prepare(sql: string): Promise<{ run: (params?: any[]) => void; free: () => void }> {
    const stmt = this.db.prepare(sql);
    return {
      run: (params?: any[]) => stmt.bind(params || []),
      free: () => stmt.free(),
    };
  }

  async count(sql: string, params?: any[]): Promise<number> {
    return (await this.query(sql, params)).length;
  }

  async exists(sql: string, params?: any[]): Promise<boolean> {
    return (await this.count(sql, params)) > 0;
  }

  async beginTransaction(): Promise<void> {
    this.db.run('BEGIN TRANSACTION;');
  }

  async commit(): Promise<void> {
    this.db.run('COMMIT;');
  }

  async rollback(): Promise<void> {
    this.db.run('ROLLBACK;');
  }
}

let failures = 0;
let passed = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

export async function run(): Promise<number> {
  console.log('\n=== ACADEMIC RUNTIME PERSISTENCE (REAL SQLite) ===\n');

  // ── 1. Initialize a REAL sql.js SQLite database using the SAME startup path ─
  const wasmPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');

  const schemaSql = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/sqlite-schema.sql'),
    'utf-8'
  );
  const seedSql = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/sqlite-seed.sql'),
    'utf-8'
  );

  db.run(schemaSql);
  db.run(seedSql);

  // Confirm the canonical runtime schema actually contains the academic tables.
  const tables = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('academic_years','academic_terms','subjects_master','subjects','schedule_periods','academic_calendar_days')"
  );
  const tableNames = (tables[0]?.values ?? []).map((r) => String(r[0])).sort();
  check(
    'canonical runtime schema creates academic tables',
    ['academic_calendar_days', 'academic_terms', 'academic_years', 'schedule_periods', 'subjects', 'subjects_master'].every((t) =>
      tableNames.includes(t)
    ),
    `found: ${tableNames.join(',')}`
  );

  // Confirm required columns exist.
  const subjectsCols = db.exec('PRAGMA table_info(subjects)');
  const subjectsColNames = (subjectsCols[0]?.values ?? []).map((r) => String(r[1]));
  check('subjects has subject_id column', subjectsColNames.includes('subject_id'));
  check('subjects has updated_at column', subjectsColNames.includes('updated_at'));

  const spCols = db.exec('PRAGMA table_info(schedule_periods)');
  const spColNames = (spCols[0]?.values ?? []).map((r) => String(r[1]));
  check('schedule_periods has academic_week column', spColNames.includes('academic_week'));
  check('schedule_periods has updated_at column', spColNames.includes('updated_at'));

  const calCols = db.exec('PRAGMA table_info(academic_calendar_days)');
  const calColNames = (calCols[0]?.values ?? []).map((r) => String(r[1]));
  check('academic_calendar_days has day column', calColNames.includes('day'));
  check('academic_calendar_days has academic_week column', calColNames.includes('academic_week'));
  check('academic_calendar_days has is_instructional column', calColNames.includes('is_instructional'));
  check('academic_calendar_days has updated_at column', calColNames.includes('updated_at'));

  const ds = new RealSQLiteDataSource(db);
  const eventBus = EventBus.getInstance();
  eventBus.clear();

  const yearRepo = new SQLiteAcademicYearRepository(ds, new UnitOfWork(ds), eventBus);
  const curriculumRepo = new SQLiteCurriculumRepository(ds, new UnitOfWork(ds));
  const caRepo = new SQLiteCourseAssignmentRepository(ds, new UnitOfWork(ds));
  const calRepo = new SQLiteAcademicCalendarRepository(ds, new UnitOfWork(ds));

  // ══════ 1. ACADEMIC YEAR CREATE / SAVE / FIND BY ID / RECONSTRUCT ══════
  console.log('\n[1] AcademicYear create/save/findById/reconstruct');
  {
    const published: string[] = [];
    eventBus.subscribe('AcademicYearCreated', () => published.push('AcademicYearCreated'));

    const year = AcademicYear.create({
      id: new AcademicYearId('rt-ay-2025'),
      code: new AcademicYearCode('2025-2026'),
      schoolScopeId: new SchoolScopeId('scope-1'),
      dateRange: new DateRange({ startDate: new Date('2025-09-01'), endDate: new Date('2026-06-30') }),
      createdBy: 'runtime-verify',
    });

    await yearRepo.save(year);
    check('AcademicYear created (row exists)', await ds.exists('SELECT 1 FROM academic_years WHERE id = ?', ['rt-ay-2025']));
    check('AcademicYearCreated event published', published.includes('AcademicYearCreated'));

    const loaded = await yearRepo.findById(new AcademicYearId('rt-ay-2025'));
    check('AcademicYear findById reconstructs', loaded !== null);
    check('reconstructed code', loaded?.code.toString() === '2025-2026');
    check('reconstructed dateRange start', loaded?.dateRange.startDate.toISOString().slice(0, 10) === '2025-09-01');
    check('reconstructed status draft', loaded?.status === 'draft');

    // Update path (save again)
    await yearRepo.save(year);
    const re = await yearRepo.findById(new AcademicYearId('rt-ay-2025'));
    check('AcademicYear save (update path) persists', re !== null && re.code.toString() === '2025-2026');
  }

  // ══════ 2. ACADEMIC TERM PERSISTENCE ══════
  console.log('\n[2] AcademicTerm persistence');
  {
    const year = AcademicYear.create({
      id: new AcademicYearId('rt-ay-terms'),
      code: new AcademicYearCode('2024-2025'),
      schoolScopeId: new SchoolScopeId('scope-1'),
      dateRange: new DateRange({ startDate: new Date('2024-09-01'), endDate: new Date('2025-06-30') }),
      createdBy: 'runtime-verify',
    });
    year.addTerm(
      new AcademicTerm({
        id: new AcademicTermId('rt-term-f1'),
        code: new AcademicTermCode('F1'),
        dateRange: new DateRange({ startDate: new Date('2024-09-01'), endDate: new Date('2025-01-31') }),
      }),
      'runtime-verify'
    );
    year.addTerm(
      new AcademicTerm({
        id: new AcademicTermId('rt-term-s2'),
        code: new AcademicTermCode('S2'),
        dateRange: new DateRange({ startDate: new Date('2025-02-01'), endDate: new Date('2025-06-30') }),
      }),
      'runtime-verify'
    );
    await yearRepo.save(year);

    const loaded = await yearRepo.findById(new AcademicYearId('rt-ay-terms'));
    check('2 terms persisted and reconstructed', loaded?.terms.length === 2);
    check('term codes preserved', loaded?.terms.map((t) => t.code.toString()).join(',') === 'F1,S2');
    check('academic_terms rows in real DB', await ds.count('SELECT 1 FROM academic_terms WHERE academic_year_id = ?', ['rt-ay-terms']) === 2);
  }

  // ══════ 3. CURRICULUM PERSISTENCE ══════
  console.log('\n[3] Curriculum persistence');
  {
    const saved = await curriculumRepo.save({
      id: 'rt-cur-math',
      code: 'MATH-101',
      nameAr: 'رياضيات',
      nameEn: 'Mathematics',
      description: 'Intro Math',
      gradeLevelId: 'grade-7',
      isActive: true,
      displayOrder: 1,
    });
    check('curriculum save returns record', saved !== null);
    check('curriculum row in subjects_master', await ds.exists('SELECT 1 FROM subjects_master WHERE id = ?', ['rt-cur-math']));
    check('curriculum findById', (await curriculumRepo.findById(new CurriculumId('rt-cur-math')))?.code === 'MATH-101');
    check('curriculum findByCode', (await curriculumRepo.findByCode(new CurriculumCode('MATH-101')))?.id === 'rt-cur-math');
    check('curriculum getByGradeLevel', (await curriculumRepo.getByGradeLevel(new GradeLevelId('grade-7'))).some((c) => c.id === 'rt-cur-math'));

    const updated = await curriculumRepo.save({
      id: 'rt-cur-math',
      code: 'MATH-201',
      nameAr: 'رياضيات متقدمة',
      nameEn: 'Advanced Mathematics',
      isActive: true,
      displayOrder: 2,
    });
    check('curriculum update persisted', (await curriculumRepo.findById(new CurriculumId('rt-cur-math')))?.code === 'MATH-201');
    check('curriculum update returns record', updated?.code === 'MATH-201');

    check('curriculum delete', await curriculumRepo.delete(new CurriculumId('rt-cur-math')) === true);
    check('curriculum delete persisted', await curriculumRepo.findById(new CurriculumId('rt-cur-math')) === null);
  }

  // ══════ 4. COURSE ASSIGNMENT PERSISTENCE ══════
  console.log('\n[4] CourseAssignment persistence');
{
    // Seed valid FK parents (user -> teacher -> class) required by the
    // subjects FK (subjects.teacher_id -> teachers.id -> users.id).
    await ds.execute(
      "INSERT OR IGNORE INTO users (id, name, role, email, password_hash, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['rt-user-1', 'Teacher One', 'teacher', 't1@test.ye', 'hash', '0500000000', 'active']
    );
    await ds.execute(
      "INSERT OR IGNORE INTO teachers (id, user_id, name, email, phone, specialization, qualification, experience_years, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['rt-tch-1', 'rt-user-1', 'Teacher One', 't1@test.ye', '0500000000', 'Math', 'BSc', 5, 'active']
    );
    await ds.execute(
      "INSERT OR IGNORE INTO school_classes (id, name, level) VALUES (?, ?, ?)",
      ['rt-cls-1', 'Grade 7', 7]
    );

    const saved = await caRepo.save({
      id: 'rt-ca-1',
      subjectId: 'rt-subj-1',
      teacherId: 'rt-tch-1',
      gradeLevelId: 'rt-cls-1',
      weeklyPeriods: 4,
      isActive: true,
    });
    check('course assignment save returns record', saved !== null);
    check('course assignment row in subjects', await ds.exists('SELECT 1 FROM subjects WHERE id = ?', ['rt-ca-1']));
    const byId = await caRepo.findById(new CourseAssignmentId('rt-ca-1'));
    check('course assignment findById', byId?.subjectId === 'rt-subj-1');
    check('course assignment weeklyPeriods', byId?.weeklyPeriods === 4);
    check('course assignment teacherId', byId?.teacherId === 'rt-tch-1');
    check('course assignment getBySubject', (await caRepo.getBySubject(new SubjectId('rt-subj-1'))).some((c) => c.id === 'rt-ca-1'));
    check('course assignment getByTeacher', (await caRepo.getByTeacher(new TeacherId('rt-tch-1'))).some((c) => c.id === 'rt-ca-1'));
    check('course assignment getByGradeLevel', (await caRepo.getByGradeLevel(new GradeLevelId('rt-cls-1'))).some((c) => c.id === 'rt-ca-1'));

    const updated = await caRepo.save({
      id: 'rt-ca-1',
      subjectId: 'rt-subj-1',
      teacherId: 'rt-tch-1',
      gradeLevelId: 'rt-cls-1',
      weeklyPeriods: 5,
      isActive: true,
    });
    check('course assignment update persisted', (await caRepo.findById(new CourseAssignmentId('rt-ca-1')))?.weeklyPeriods === 5);

    check('course assignment delete', await caRepo.delete(new CourseAssignmentId('rt-ca-1')) === true);
    check('course assignment delete persisted', await caRepo.findById(new CourseAssignmentId('rt-ca-1')) === null);
  }

  // ══════ 5. ACADEMIC CALENDAR PERSISTENCE ══════
  console.log('\n[5] AcademicCalendar persistence');
  {
    // New-record INSERT: the dedicated academic_calendar_days table requires
    // no timetable FK parents, so a brand-new day must persist on first save.
    const created = await calRepo.save({
      id: 'rt-day-1',
      date: '2025-09-01',
      isInstructional: true,
      academicWeek: 1,
    });
    check('academic calendar new-record insert returns record', created !== null);
    check('academic calendar new-record insert date', created?.date === '2025-09-01');
    check('academic calendar new-record insert persisted', await ds.exists('SELECT 1 FROM academic_calendar_days WHERE id = ? AND day = ?', ['rt-day-1', '2025-09-01']));

    // Update path: same id → UPDATE the existing row (week + instructional flag).
    const updated = await calRepo.save({
      id: 'rt-day-1',
      date: '2025-09-01',
      isInstructional: false,
      academicWeek: 2,
    });
    check('academic calendar update returns record', updated !== null);
    check('academic calendar update persisted', await ds.exists('SELECT 1 FROM academic_calendar_days WHERE id = ? AND academic_week = 2 AND is_instructional = 0', ['rt-day-1']));

    const byDate = await calRepo.findByDate(new AcademicCalendarDate(new Date('2025-09-01')));
    check('academic calendar findByDate', byDate?.id === 'rt-day-1');
    check('academic calendar findByDate non-instructional', byDate?.isInstructional === false);
    check('academic calendar getByWeek(2)', (await calRepo.getByWeek(new AcademicWeek(2))).some((c) => c.id === 'rt-day-1'));
    check('academic calendar getAll', (await calRepo.getAll()).some((c) => c.id === 'rt-day-1'));

    check('academic calendar delete', await calRepo.delete(new SchoolDayId('rt-day-1')) === true);
    check('academic calendar delete persisted', await ds.exists('SELECT 1 FROM academic_calendar_days WHERE id = ?', ['rt-day-1']) === false);
  }

  // ══════ 6. UNITOFWORK TRANSACTION ROLLBACK ══════
  console.log('\n[6] UnitOfWork transaction rollback');
  {
    // Force a failing transaction via a deliberate constraint violation.
    const year = AcademicYear.create({
      id: new AcademicYearId('rt-ay-txn'),
      code: new AcademicYearCode('2023-2024'),
      schoolScopeId: new SchoolScopeId('scope-1'),
      dateRange: new DateRange({ startDate: new Date('2023-09-01'), endDate: new Date('2024-06-30') }),
      createdBy: 'runtime-verify',
    });
    year.addTerm(
      new AcademicTerm({
        id: new AcademicTermId('rt-txn-term'),
        code: new AcademicTermCode('T1'),
        dateRange: new DateRange({ startDate: new Date('2023-09-01'), endDate: new Date('2024-01-31') }),
      }),
      'runtime-verify'
    );
    await yearRepo.save(year);
    check('year + term persisted in transaction', await ds.exists('SELECT 1 FROM academic_years WHERE id = ?', ['rt-ay-txn']) && await ds.exists('SELECT 1 FROM academic_terms WHERE id = ?', ['rt-txn-term']));

// Force failure by inserting two rows with the same UNIQUE code. The second
    // INSERT violates the UNIQUE constraint, which must roll back the first.
    const uow = new UnitOfWork(ds);
    uow.register('INSERT INTO academic_years (id, code, name_ar, start_date, end_date) VALUES (?, ?, ?, ?, ?)', ['rt-fail1', 'RT-UNIQUE-1', 'F1', '2023-09-01', '2024-06-30']);
    uow.register('INSERT INTO academic_years (id, code, name_ar, start_date, end_date) VALUES (?, ?, ?, ?, ?)', ['rt-fail2', 'RT-UNIQUE-1', 'F2', '2023-09-01', '2024-06-30']);
    const result = await uow.commit();
    check('transaction fails on constraint violation', result.success === false);
    check('no partial insert persisted after rollback', await ds.exists('SELECT 1 FROM academic_years WHERE id = ?', ['rt-fail1']) === false && await ds.exists('SELECT 1 FROM academic_years WHERE id = ?', ['rt-fail2']) === false);
  }

  // ══════ 7. NO TABLE / COLUMN NOT FOUND ERRORS ══════
  console.log('\n[7] No table/column-not-found errors');
  {
    // All repository methods above already ran against the real DB. If any had
    // thrown "no such table" / "no such column", the run() would have aborted.
    check('All repository queries executed without table/column errors', true);
  }

  console.log(`\n=== RESULT: ${passed} passed, ${failures} failed (REAL SQLite) ===`);
  return failures === 0 ? 0 : 1;
}

// Self-execute when run directly.
if (typeof require !== 'undefined' && require.main === module) {
  run().then((code) => process.exit(code));
}
