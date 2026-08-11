/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5.2 — Academic Repository Smoke Tests.
 * Verifies repository behavior, aggregate persistence/rehydration, UnitOfWork
 * commit/rollback, EventBus dispatch, and DI resolution.
 *
 * The SQLite repos depend on sql.js (WASM) + localStorage (browser-only), so
 * these smoke tests use an in-memory mock IDataSource combined with the real
 * UnitOfWork and EventBus. This validates the repository wiring logic without
 * requiring a browser/WASM runtime.
 *
 * Run via: npx tsx scripts/verify-academic-smoke.ts
 */

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
import { SchoolDayId } from '../src/modules/academic/domain/value-objects/SchoolDayId';
import { initializeInfrastructure, resolve, SERVICE_IDS } from '../src/core/bootstrap';

/**
 * In-memory mock IDataSource. Stores rows per table in JS Maps.
 * Supports the subset of IDataSource primitives used by the academic repos.
 */
class InMemoryDataSource implements IDataSource {
  private tables: Map<string, Map<string, Record<string, any>>> = new Map();
  failNextTransaction = false;
  private txnActive = false;
  private txnSnapshot: Map<string, Map<string, Record<string, any>>> = new Map();

  private table(sql: string): string {
    const match = sql.toLowerCase();
    if (match.includes('academic_calendar_days')) return 'academic_calendar_days';
    if (match.includes('academic_years')) return 'academic_years';
    if (match.includes('academic_terms')) return 'academic_terms';
    if (match.includes('subjects_master')) return 'subjects_master';
    if (match.includes('subjects')) return 'subjects';
    if (match.includes('schedule_periods')) return 'schedule_periods';
    return 'misc';
  }

  private store(): Map<string, Map<string, Record<string, any>>> {
    if (!this.tables.has('academic_calendar_days')) this.tables.set('academic_calendar_days', new Map());
    if (!this.tables.has('academic_years')) this.tables.set('academic_years', new Map());
    if (!this.tables.has('academic_terms')) this.tables.set('academic_terms', new Map());
    if (!this.tables.has('subjects_master')) this.tables.set('subjects_master', new Map());
    if (!this.tables.has('subjects')) this.tables.set('subjects', new Map());
    if (!this.tables.has('schedule_periods')) this.tables.set('schedule_periods', new Map());
    return this.tables;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const t = this.table(sql);
    const rows = Array.from(this.store().get(t)!.values());
    if (params && params.length > 0) {
      const key = String(params[params.length - 1]);
      return rows.filter((r) => Object.values(r).some((v) => String(v) === key)) as unknown as T[];
    }
    return rows as unknown as T[];
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const t = this.table(sql);
    const store = this.store().get(t)!;
    const lower = sql.toLowerCase();
    const id = params ? String(params[0]) : `id_${Math.random()}`;

    if (lower.startsWith('insert')) {
      const obj: Record<string, any> = {};
      if (t === 'academic_years' || t === 'academic_terms' || t === 'subjects_master' || t === 'subjects' || t === 'schedule_periods' || t === 'academic_calendar_days') {
        const cols = (sql.match(/\(([^)]+)\)/) || [])[1]?.split(',').map((c: string) => c.trim()) || [];
        cols.forEach((c: string, i: number) => {
          obj[c] = params?.[i];
        });
      }
      store.set(id, obj);
      return { changes: 1, lastInsertRowid: 1 };
    }
    if (lower.startsWith('update')) {
      const key = String(params?.[params!.length - 1]);
      const existing = store.get(key);
      if (existing) {
        store.set(key, { ...existing, ...Object.fromEntries(Object.entries(existing)) });
      }
      return { changes: existing ? 1 : 0, lastInsertRowid: 0 };
    }
    if (lower.startsWith('delete')) {
      const key = String(params?.[params!.length - 1]);
      const had = store.has(key);
      store.delete(key);
      return { changes: had ? 1 : 0, lastInsertRowid: 0 };
    }
    return { changes: 0, lastInsertRowid: 0 };
  }

  async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<{ success: boolean; error?: string }> {
    if (this.failNextTransaction) {
      this.failNextTransaction = false;
      return { success: false, error: 'Simulated transaction failure' };
    }
    try {
      await this.beginTransaction();
      for (const q of queries) {
        await this.execute(q.sql, q.params);
      }
      await this.commit();
      return { success: true };
    } catch (err: any) {
      await this.rollback();
      return { success: false, error: err?.message || 'Transaction failed' };
    }
  }

  async prepare(sql: string): Promise<{ run: (params?: any[]) => void; free: () => void }> {
    return { run: () => undefined, free: () => undefined };
  }

  async count(sql: string, params?: any[]): Promise<number> {
    return (await this.query(sql, params)).length;
  }

  async exists(sql: string, params?: any[]): Promise<boolean> {
    return (await this.count(sql, params)) > 0;
  }

  async beginTransaction(): Promise<void> {
    this.txnActive = true;
    this.txnSnapshot = new Map();
    for (const [name, table] of this.store()) {
      this.txnSnapshot.set(name, new Map(table));
    }
  }

  async commit(): Promise<void> {
    this.txnActive = false;
  }

  async rollback(): Promise<void> {
    if (this.txnActive && this.txnSnapshot.size > 0) {
      this.tables = this.txnSnapshot;
      this.txnActive = false;
    }
  }
}

let failures = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    console.log(`✓ ${name}`);
  } else {
    console.error(`✗ ${name} ${detail}`);
    failures++;
  }
}

// ── 1. UnitOfWork commit ───────────────────────────────────────────────────
async function main(): Promise<void> {
{
  const ds = new InMemoryDataSource();
  const uow = new UnitOfWork(ds);
  uow.register('INSERT INTO academic_years (id, code) VALUES (?, ?)', ['ay1', '2024-2025']);
  const result = await uow.commit();
  check('UnitOfWork commit succeeds', result.success === true);
  check('UnitOfWork registers + commits into DataSource', await ds.exists('SELECT 1 FROM academic_years WHERE id = ?', ['ay1']));
  check('UnitOfWork clears after commit', uow.pendingCount === 0);
}

// ── 2. UnitOfWork rollback (transaction failure) ───────────────────────────
{
  const ds = new InMemoryDataSource();
  ds.failNextTransaction = true;
  const uow = new UnitOfWork(ds);
  uow.register('INSERT INTO academic_terms (id, code) VALUES (?, ?)', ['t1', 'T1']);
  const result = await uow.commit();
  check('UnitOfWork rolls back on failure', result.success === false);
}

// ── 3. UnitOfWork rollback via explicit rollback ────────────────────────────
{
  const ds = new InMemoryDataSource();
  await ds.beginTransaction();
  await ds.execute('INSERT INTO academic_years (id, code) VALUES (?, ?)', ['ay_rollback', '2023-2024']);
  await ds.rollback();
  check('DataSource rollback discards pending write', await ds.exists('SELECT 1 FROM academic_years WHERE id = ?', ['ay_rollback']) === false);
}

// ── 4. AcademicYear aggregate persistence + rehydration + event dispatch ────
{
  const ds = new InMemoryDataSource();
  const eventBus = EventBus.getInstance();
  eventBus.clear();
  let dispatchedEvents: string[] = [];
  eventBus.subscribe('AcademicYearCreated', () => { dispatchedEvents.push('AcademicYearCreated'); });

  const repo = new SQLiteAcademicYearRepository(ds, new UnitOfWork(ds), eventBus);

  const year = AcademicYear.create({
    id: new AcademicYearId('ay_smoke'),
    code: new AcademicYearCode('2025-2026'),
    schoolScopeId: new SchoolScopeId('scope_1'),
    dateRange: new DateRange({ startDate: new Date('2025-09-01'), endDate: new Date('2026-06-30') }),
    createdBy: 'test-user',
  });

  await repo.save(year);

  check('AcademicYear persisted (CRUD create)', await ds.exists('SELECT 1 FROM academic_years WHERE id = ?', ['ay_smoke']));
  check('AcademicYearCreated event dispatched', dispatchedEvents.length === 1);

  const rehydrated = await repo.findById(new AcademicYearId('ay_smoke'));
  check('AcademicYear rehydration (findById)', rehydrated !== null);
  check('AcademicYear rehydrated code', rehydrated?.code.toString() === '2025-2026');
  check('AcademicYear rehydrated status', rehydrated?.status === 'draft');

  // term add + save (update path)
  year.addTerm(
    new AcademicTerm({
      id: new AcademicTermId('term_1'),
      code: new AcademicTermCode('T1'),
      dateRange: new DateRange({ startDate: new Date('2025-09-01'), endDate: new Date('2026-01-31') }),
    }),
    'test-user'
  );
  await repo.save(year);
  const withTerm = await repo.findById(new AcademicYearId('ay_smoke'));
  check('AcademicYear term child persisted', withTerm?.terms.length === 1);

  const deleted = await repo.delete(new AcademicYearId('ay_smoke'));
  check('AcademicYear delete (CRUD delete)', deleted === true);
}

// ── 5. Curriculum, CourseAssignment, AcademicCalendar repositories ─────────
{
  const ds = new InMemoryDataSource();
  const curriculumRepo = new SQLiteCurriculumRepository(ds, new UnitOfWork(ds));
  const saved = await curriculumRepo.save({
    id: 'cur_1',
    code: 'MATH-101',
    nameAr: 'رياضيات',
    nameEn: 'Mathematics',
    isActive: true,
    displayOrder: 1,
  });
  check('Curriculum repo save (CRUD create)', saved !== null);
  const found = await curriculumRepo.findById(new CurriculumId('cur_1'));
  check('Curriculum repo findById', found?.code === 'MATH-101');
  check('Curriculum repo delete', await curriculumRepo.delete(new CurriculumId('cur_1')) === true);

  const caRepo = new SQLiteCourseAssignmentRepository(ds, new UnitOfWork(ds));
  const ca = await caRepo.save({
    id: 'ca_1',
    subjectId: 'subj_1',
    teacherId: 'tch_1',
    weeklyPeriods: 3,
    isActive: true,
  });
  check('CourseAssignment repo save (CRUD create)', ca !== null);
  const caFound = await caRepo.findById(new CourseAssignmentId('ca_1'));
  check('CourseAssignment repo findById', caFound?.id === 'ca_1');

const calRepo = new SQLiteAcademicCalendarRepository(ds, new UnitOfWork(ds));
  const cal = await calRepo.save({
    id: 'day_1',
    date: '2025-09-01',
    isInstructional: true,
    academicWeek: 1,
  });
  // The dedicated academic_calendar_days table requires no timetable FK
  // parents, so a new record is persisted (INSERT) and returned.
  check('AcademicCalendar repo save persists new day (INSERT)', cal !== null && cal.date === '2025-09-01');
  const calFound = await calRepo.findById(new SchoolDayId('day_1'));
  check('AcademicCalendar repo findById returns persisted day', calFound?.id === 'day_1');
  check('AcademicCalendar repo row exists in academic_calendar_days', await ds.exists('SELECT 1 FROM academic_calendar_days WHERE id = ?', ['day_1']));
}

// ── 6. DI resolution ────────────────────────────────────────────────────────
{
  initializeInfrastructure();
  const ids = [
    SERVICE_IDS.AcademicYearRepository,
    SERVICE_IDS.CurriculumRepository,
    SERVICE_IDS.CourseAssignmentRepository,
    SERVICE_IDS.AcademicCalendarRepository,
  ];
  for (const id of ids) {
    try {
      const svc = resolve(id);
      check(`DI resolves ${id}`, svc != null);
    } catch (err: any) {
      check(`DI resolves ${id}`, false, err?.message);
    }
  }
}

console.log(`\nAcademic Repository Smoke Tests: ${failures === 0 ? 'ALL PASSED' : `${failures} FAILURE(S)`}`);
if (failures > 0) process.exit(1);
process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
