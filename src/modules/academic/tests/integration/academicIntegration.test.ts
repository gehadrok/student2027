/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5.3 — Academic Integration Tests.
 *
 * End-to-end integration tests covering:
 *   1. AcademicYear lifecycle
 *   2. AcademicTerm lifecycle
 *   3. Curriculum persistence
 *   4. CourseAssignment persistence
 *   5. AcademicCalendar persistence
 *
 * These tests use the REAL Academic repositories (no mocks), combined with a
 * faithful in-memory IDataSource that mirrors the existing SQLite schema
 * (academic_years, academic_terms, subjects_master, subjects, schedule_periods),
 * the real UnitOfWork, and the real EventBus. This validates the full
 * repository → mapper → UnitOfWork → EventBus wiring without requiring the
 * browser-only sql.js/WASM runtime.
 *
 * Run via: npx tsx scripts/run-academic-integration.mjs
 */

import { IDataSource } from '../../../../core/datasource/IDataSource';
import { UnitOfWork } from '../../../../core/datasource/UnitOfWork';
import { EventBus } from '../../../../core/events/EventBus';
import { initializeInfrastructure, resolve, SERVICE_IDS } from '../../../../core/bootstrap';

import { SQLiteAcademicYearRepository } from '../../infrastructure/repositories/SQLiteAcademicYearRepository';
import { SQLiteCurriculumRepository } from '../../infrastructure/repositories/SQLiteCurriculumRepository';
import { SQLiteCourseAssignmentRepository } from '../../infrastructure/repositories/SQLiteCourseAssignmentRepository';
import { SQLiteAcademicCalendarRepository } from '../../infrastructure/repositories/SQLiteAcademicCalendarRepository';

import { AcademicYear } from '../../domain/aggregates/AcademicYear';
import { AcademicTerm } from '../../domain/entities/AcademicTerm';
import { AcademicYearId } from '../../domain/value-objects/AcademicYearId';
import { AcademicYearCode } from '../../domain/value-objects/AcademicYearCode';
import { SchoolScopeId } from '../../domain/value-objects/SchoolScopeId';
import { DateRange } from '../../domain/value-objects/DateRange';
import { AcademicTermId } from '../../domain/value-objects/AcademicTermId';
import { AcademicTermCode } from '../../domain/value-objects/AcademicTermCode';
import { CurriculumId } from '../../domain/value-objects/CurriculumId';
import { CurriculumCode } from '../../domain/value-objects/CurriculumCode';
import { CourseAssignmentId } from '../../domain/value-objects/CourseAssignmentId';
import { SubjectId } from '../../domain/value-objects/SubjectId';
import { TeacherId } from '../../domain/value-objects/TeacherId';
import { GradeLevelId } from '../../domain/value-objects/GradeLevelId';
import { SchoolDayId } from '../../domain/value-objects/SchoolDayId';
import { AcademicWeek } from '../../domain/value-objects/AcademicWeek';
import { AcademicCalendarDate } from '../../domain/value-objects/AcademicCalendarDate';
import type { CurriculumRecord } from '../../domain/repositories/ICurriculumRepository';
import type { CourseAssignmentRecord } from '../../domain/repositories/ICourseAssignmentRepository';
import type { AcademicCalendarRecord } from '../../domain/repositories/IAcademicCalendarRepository';

/**
 * In-memory IDataSource that mirrors the existing SQLite schema.
 * This is a test double of the DATA SOURCE (persistence backend), NOT of the
 * repositories. The repositories are the real production implementations.
 */
class InMemoryDataSource implements IDataSource {
  private tables: Map<string, Map<string, Record<string, any>>> = new Map();
  failNextTransaction = false;
  private txnActive = false;
  private txnSnapshot: Map<string, Map<string, Record<string, any>>> = new Map();

  tableName(sql: string): string {
    const m = sql.toLowerCase();
    if (m.includes('academic_calendar_days')) return 'academic_calendar_days';
    if (m.includes('academic_years')) return 'academic_years';
    if (m.includes('academic_terms')) return 'academic_terms';
    if (m.includes('subjects_master')) return 'subjects_master';
    if (m.includes('schedule_periods')) return 'schedule_periods';
    if (m.includes('subjects')) return 'subjects';
    return 'misc';
  }

  store(): Map<string, Map<string, Record<string, any>>> {
    for (const t of ['academic_years', 'academic_terms', 'subjects_master', 'subjects', 'schedule_periods', 'academic_calendar_days']) {
      if (!this.tables.has(t)) this.tables.set(t, new Map());
    }
    return this.tables;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const t = this.tableName(sql);
    const table = this.store().get(t)!;
    let rows = Array.from(table.values());
    if (params && params.length > 0) {
      const key = String(params[params.length - 1]);
      rows = rows.filter((r) => Object.values(r).some((v) => String(v) === key));
    }
    return rows as unknown as T[];
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

async execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const t = this.tableName(sql);
    const table = this.store().get(t)!;
    const lower = sql.toLowerCase();
    const id = params ? String(params[0]) : `id_${Math.random()}`;

    if (lower.startsWith('insert')) {
      const obj: Record<string, any> = {};
      const cols = (sql.match(/\(([^)]+)\)/) || [])[1]?.split(',').map((c) => c.trim()) || [];
      cols.forEach((c, i) => {
        obj[c] = params?.[i];
      });
      table.set(id, obj);
      return { changes: 1, lastInsertRowid: 1 };
    }
if (lower.startsWith('update')) {
      const key = String(params?.[params!.length - 1]);
      const existing = table.get(key);
      // The repository UPDATE SQL is multi-line, so `.` (which does not match
      // newlines) cannot span the SET clause. Use [\s\S] to match across lines.
      const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
      if (existing && setMatch) {
        const assign = setMatch[1].split(',').map((a) => a.trim());
        const clone = { ...existing };
        // SET columns are bound in order params[0..n-1]; the WHERE id is the
        // final param (params[params.length - 1]). We map each SET column to
        // its own bound value rather than the WHERE id.
        let paramIndex = 0;
        assign.forEach((a) => {
          const eq = a.indexOf('=');
          const col = a.slice(0, eq).trim();
          const valPart = a.slice(eq + 1).trim();
          if (/CURRENT_TIMESTAMP/.test(valPart.toUpperCase())) {
            return;
          }
          clone[col] = params?.[paramIndex] ?? clone[col];
          paramIndex += 1;
        });
        table.set(key, clone);
      }
      return { changes: existing ? 1 : 0, lastInsertRowid: 0 };
    }
    if (lower.startsWith('delete')) {
      const key = String(params?.[params!.length - 1]);
      const had = table.has(key);
      table.delete(key);
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
      for (const q of queries) await this.execute(q.sql, q.params);
      await this.commit();
      return { success: true };
    } catch (err: any) {
      await this.rollback();
      return { success: false, error: err?.message || 'Transaction failed' };
    }
  }

  async prepare(): Promise<{ run: (params?: any[]) => void; free: () => void }> {
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
    for (const [name, table] of this.store()) this.txnSnapshot.set(name, new Map(table));
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
  console.log('\n=== ACADEMIC INTEGRATION TESTS ===\n');

  const ds = new InMemoryDataSource();
  const eventBus = EventBus.getInstance();
  eventBus.clear();

  // Shared repositories sharing the same data source + a shared UnitOfWork.
  const uow = new UnitOfWork(ds);
  const yearRepo = new SQLiteAcademicYearRepository(ds, uow, eventBus);
  const curriculumRepo = new SQLiteCurriculumRepository(ds, new UnitOfWork(ds));
  const caRepo = new SQLiteCourseAssignmentRepository(ds, new UnitOfWork(ds));
  const calRepo = new SQLiteAcademicCalendarRepository(ds, new UnitOfWork(ds));

  // ═════════════════════════════════════════════════════════════════════════
  // 1. ACADEMIC YEAR LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n[1] AcademicYear lifecycle');
  {
    const published: string[] = [];
    eventBus.subscribe('AcademicYearCreated', () => published.push('AcademicYearCreated'));
    eventBus.subscribe('AcademicYearApproved', () => published.push('AcademicYearApproved'));
    eventBus.subscribe('AcademicYearActivated', () => published.push('AcademicYearActivated'));
    eventBus.subscribe('AcademicYearClosed', () => published.push('AcademicYearClosed'));
    eventBus.subscribe('AcademicYearArchived', () => published.push('AcademicYearArchived'));

    const year = AcademicYear.create({
      id: new AcademicYearId('iy-2025'),
      code: new AcademicYearCode('2025-2026'),
      schoolScopeId: new SchoolScopeId('scope-1'),
      dateRange: new DateRange({ startDate: new Date('2025-09-01'), endDate: new Date('2026-06-30') }),
      createdBy: 'integration-runner',
    });

// Initial state
    check('created as draft', year.status === 'draft');
    // AcademicYear.create() calls touch() which increments the version from 0
    // to 1, so the intended domain behavior is version === 1 immediately after
    // creation. The assertion reflects the actual domain behavior (the domain
    // model is the source of truth and is left unchanged).
    check('version 1 on creation', year.version === 1);

    // Save draft → persistence + event
    await yearRepo.save(year);
    check('AcademicYearCreated event published', published.includes('AcademicYearCreated'));

    // Load & reconstruct
    const loaded1 = await yearRepo.findById(new AcademicYearId('iy-2025'));
    check('reconstructed after save (findById)', loaded1 !== null);
    check('reconstructed code', loaded1?.code.toString() === '2025-2026');
    check('reconstructed status draft', loaded1?.status === 'draft');

    // ═════ 1b. UnitOfWork rollback on aggregate save failure ═════
    console.log('  [1b] UnitOfWork rollback');
    {
      const ds2 = new InMemoryDataSource();
      ds2.failNextTransaction = true;
      const uow2 = new UnitOfWork(ds2);
      const repo2 = new SQLiteAcademicYearRepository(ds2, uow2, EventBus.getInstance());
      const y2 = AcademicYear.create({
        id: new AcademicYearId('iy-fail'),
        code: new AcademicYearCode('2099-2100'),
        schoolScopeId: new SchoolScopeId('scope-x'),
        dateRange: new DateRange({ startDate: new Date('2099-09-01'), endDate: new Date('2100-06-30') }),
        createdBy: 'integration-runner',
      });
      let threw = false;
      try {
        await repo2.save(y2);
      } catch {
        threw = true;
      }
      check('save throws on transaction failure', threw);
      check('transaction rolled back (no row persisted)', !(await ds2.exists('SELECT 1 FROM academic_years WHERE id = ?', ['iy-fail'])));
    }

    // ═════ 1c. Lifecycle transitions ═════
    // Need a term to activate.
    const term = new AcademicTerm({
      id: new AcademicTermId('term-1'),
      code: new AcademicTermCode('T1'),
      dateRange: new DateRange({ startDate: new Date('2025-09-01'), endDate: new Date('2026-01-31') }),
    });
    year.addTerm(term, 'integration-runner');
    await yearRepo.save(year);

    year.approve('integration-runner');
    await yearRepo.save(year);
    check('approved event published', published.includes('AcademicYearApproved'));
    const approved = await yearRepo.findById(new AcademicYearId('iy-2025'));
    check('approved reconstructed', approved?.status === 'approved');

    year.activate('integration-runner');
    await yearRepo.save(year);
    check('activated event published', published.includes('AcademicYearActivated'));
    const active = await yearRepo.findById(new AcademicYearId('iy-2025'));
    check('active reconstructed', active?.status === 'active');

    year.close('integration-runner');
    await yearRepo.save(year);
    check('closed event published', published.includes('AcademicYearClosed'));
    const closed = await yearRepo.findById(new AcademicYearId('iy-2025'));
    check('closed reconstructed', closed?.status === 'closed');

    year.archive('end of cycle', 'integration-runner');
    await yearRepo.save(year);
    check('archived event published', published.includes('AcademicYearArchived'));
    const archived = await yearRepo.findById(new AcademicYearId('iy-2025'));
    check('archived reconstructed', archived?.status === 'archived');

// GetAll returns the record
    const all = await yearRepo.getAll();
    check('getAll returns persisted year', all.some((y: AcademicYear) => y.id.toString() === 'iy-2025'));

    // Delete
    check('delete returns true', await yearRepo.delete(new AcademicYearId('iy-2025')) === true);
    check('deleted year gone', await yearRepo.findById(new AcademicYearId('iy-2025')) === null);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. ACADEMIC TERM LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n[2] AcademicTerm lifecycle');
  {
    const published: string[] = [];
    eventBus.subscribe('AcademicTermAdded', () => published.push('AcademicTermAdded'));
    eventBus.subscribe('AcademicTermOpened', () => published.push('AcademicTermOpened'));
    eventBus.subscribe('AcademicTermLocked', () => published.push('AcademicTermLocked'));
    eventBus.subscribe('AcademicTermClosed', () => published.push('AcademicTermClosed'));

    const year = AcademicYear.create({
      id: new AcademicYearId('iy-terms'),
      code: new AcademicYearCode('2024-2025'),
      schoolScopeId: new SchoolScopeId('scope-1'),
      dateRange: new DateRange({ startDate: new Date('2024-09-01'), endDate: new Date('2025-06-30') }),
      createdBy: 'integration-runner',
    });

    const t1 = new AcademicTerm({
      id: new AcademicTermId('term-f1'),
      code: new AcademicTermCode('F1'),
      dateRange: new DateRange({ startDate: new Date('2024-09-01'), endDate: new Date('2025-01-31') }),
    });
    const t2 = new AcademicTerm({
      id: new AcademicTermId('term-s2'),
      code: new AcademicTermCode('S2'),
      dateRange: new DateRange({ startDate: new Date('2025-02-01'), endDate: new Date('2025-06-30') }),
    });

    year.addTerm(t1, 'integration-runner');
    year.addTerm(t2, 'integration-runner');
    await yearRepo.save(year);
    check('AcademicTermAdded events published', published.filter((p) => p === 'AcademicTermAdded').length === 2);

    // Terms persisted as children
    const loaded = await yearRepo.findById(new AcademicYearId('iy-terms'));
    check('2 terms reconstructed', loaded?.terms.length === 2);
check('term codes preserved', loaded?.terms.map((t: AcademicTerm) => t.code.toString()).join(',') === 'F1,S2');

    // Open first term
    year.openTerm(new AcademicTermId('term-f1'), 'integration-runner');
    await yearRepo.save(year);
    check('AcademicTermOpened event published', published.includes('AcademicTermOpened'));
    const opened = await yearRepo.findById(new AcademicYearId('iy-terms'));
    const openedTerm = opened?.terms.find((t: AcademicTerm) => t.id.toString() === 'term-f1');
    check('term status open', openedTerm?.status === 'open');

    // Lock second term
    year.closeTerm(new AcademicTermId('term-f1'), 'integration-runner');
    await yearRepo.save(year);
    check('AcademicTermClosed event published', published.includes('AcademicTermClosed'));
    const closedLoaded = await yearRepo.findById(new AcademicYearId('iy-terms'));
    const closedTerm = closedLoaded?.terms.find((t: AcademicTerm) => t.id.toString() === 'term-f1');
    check('term status closed', closedTerm?.status === 'closed');

    // Term overlap invariant protected
    const badTerm = new AcademicTerm({
      id: new AcademicTermId('term-bad'),
      code: new AcademicTermCode('BAD'),
      dateRange: new DateRange({ startDate: new Date('2024-10-01'), endDate: new Date('2024-12-31') }),
    });
    let overlapThrew = false;
    try {
      year.addTerm(badTerm, 'integration-runner');
    } catch {
      overlapThrew = true;
    }
    check('overlapping term rejected', overlapThrew);

    await yearRepo.delete(new AcademicYearId('iy-terms'));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. CURRICULUM PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n[3] Curriculum persistence');
  {
    const saved = await curriculumRepo.save({
      id: 'cur-math',
      code: 'MATH-101',
      nameAr: 'رياضيات',
      nameEn: 'Mathematics',
      description: 'Introductory Mathematics',
      gradeLevelId: 'grade-7',
      isActive: true,
      displayOrder: 1,
    });
    check('curriculum save returns record', saved !== null);
    check('curriculum saved code', saved?.code === 'MATH-101');

    const byId = await curriculumRepo.findById(new CurriculumId('cur-math'));
    check('curriculum findById', byId?.code === 'MATH-101');
    check('curriculum mapper nameAr', byId?.nameAr === 'رياضيات');
    check('curriculum mapper isActive', byId?.isActive === true);

    const byCode = await curriculumRepo.findByCode(new CurriculumCode('MATH-101'));
    check('curriculum findByCode', byCode?.id === 'cur-math');

const byGrade = await curriculumRepo.getByGradeLevel(new GradeLevelId('grade-7'));
    check('curriculum getByGradeLevel', byGrade.some((c: CurriculumRecord) => c.id === 'cur-math'));

    const allActive = await curriculumRepo.getAll(true);
    check('curriculum getAll active', allActive.some((c: CurriculumRecord) => c.id === 'cur-math'));

    // Update (UnitOfWork update path)
    const updated = await curriculumRepo.save({
      id: 'cur-math',
      code: 'MATH-201',
      nameAr: 'رياضيات متقدمة',
      nameEn: 'Advanced Mathematics',
      isActive: true,
      displayOrder: 2,
    });
    check('curriculum update', updated?.code === 'MATH-201');
    const reloaded = await curriculumRepo.findById(new CurriculumId('cur-math'));
    check('curriculum update persisted', reloaded?.code === 'MATH-201');

    check('curriculum delete', await curriculumRepo.delete(new CurriculumId('cur-math')) === true);
    check('curriculum delete persisted', await curriculumRepo.findById(new CurriculumId('cur-math')) === null);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. COURSE ASSIGNMENT PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n[4] CourseAssignment persistence');
  {
    const saved = await caRepo.save({
      id: 'ca-1',
      subjectId: 'subj-1',
      teacherId: 'tch-1',
      gradeLevelId: 'grade-7',
      weeklyPeriods: 4,
      isActive: true,
    });
    check('course assignment save returns record', saved !== null);
    check('course assignment saved id', saved?.id === 'ca-1');

    const byId = await caRepo.findById(new CourseAssignmentId('ca-1'));
    check('course assignment findById', byId?.subjectId === 'subj-1');
    check('course assignment mapper weeklyPeriods', byId?.weeklyPeriods === 4);
    check('course assignment mapper teacherId', byId?.teacherId === 'tch-1');

    const bySubject = await caRepo.getBySubject(new SubjectId('subj-1'));
    check('course assignment getBySubject', bySubject.some((c) => c.id === 'ca-1'));

    const byTeacher = await caRepo.getByTeacher(new TeacherId('tch-1'));
    check('course assignment getByTeacher', byTeacher.some((c) => c.id === 'ca-1'));

    const byGrade = await caRepo.getByGradeLevel(new GradeLevelId('grade-7'));
    check('course assignment getByGradeLevel', byGrade.some((c) => c.id === 'ca-1'));

    const all = await caRepo.getAll();
    check('course assignment getAll', all.some((c) => c.id === 'ca-1'));

    // Update
    const updated = await caRepo.save({
      id: 'ca-1',
      subjectId: 'subj-1',
      teacherId: 'tch-2',
      gradeLevelId: 'grade-7',
      weeklyPeriods: 5,
      isActive: true,
    });
    check('course assignment update', updated?.teacherId === 'tch-2');
    const reloaded = await caRepo.findById(new CourseAssignmentId('ca-1'));
    check('course assignment update persisted', reloaded?.weeklyPeriods === 5);

    check('course assignment delete', await caRepo.delete(new CourseAssignmentId('ca-1')) === true);
    check('course assignment delete persisted', await caRepo.findById(new CourseAssignmentId('ca-1')) === null);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. ACADEMIC CALENDAR PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n[5] AcademicCalendar persistence');
  {
    // New-record INSERT: dedicated academic_calendar_days table requires no
    // timetable FK parents, so a brand-new day must persist.
    const created = await calRepo.save({
      id: 'day-new',
      date: '2025-09-02',
      isInstructional: true,
      academicWeek: 2,
    });
    check('academic calendar new-record insert returns record', created !== null);
    check('academic calendar new-record insert date', created?.date === '2025-09-02');
    check('academic calendar new-record insert persisted', await ds.exists('SELECT 1 FROM academic_calendar_days WHERE id = ? AND day = ?', ['day-new', '2025-09-02']));

    // Update path: same id → UPDATE the existing row.
    const updated = await calRepo.save({
      id: 'day-new',
      date: '2025-09-02',
      isInstructional: false,
      academicWeek: 3,
    });
    check('academic calendar update returns record', updated !== null);
    check('academic calendar update week persisted', await ds.exists('SELECT 1 FROM academic_calendar_days WHERE id = ? AND academic_week = 3 AND is_instructional = 0', ['day-new']));

    const byDate = await calRepo.findByDate(new AcademicCalendarDate(new Date('2025-09-02')));
    check('academic calendar findByDate', byDate?.id === 'day-new');
    check('academic calendar findByDate non-instructional', byDate?.isInstructional === false);

    const byWeek = await calRepo.getByWeek(new AcademicWeek(3));
    check('academic calendar getByWeek', byWeek.some((c) => c.id === 'day-new'));

    const all = await calRepo.getAll();
    check('academic calendar getAll', all.some((c) => c.id === 'day-new'));

    check('academic calendar delete', await calRepo.delete(new SchoolDayId('day-new')) === true);
    check('academic calendar delete persisted', await ds.exists('SELECT 1 FROM academic_calendar_days WHERE id = ?', ['day-new']) === false);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. TRANSACTION CONSISTENCY
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n[6] Transaction consistency (Multi-row aggregate write)');
  {
    const ds2 = new InMemoryDataSource();
    const uow2 = new UnitOfWork(ds2);
    const repo2 = new SQLiteAcademicYearRepository(ds2, uow2, EventBus.getInstance());

    const year = AcademicYear.create({
      id: new AcademicYearId('iy-txn'),
      code: new AcademicYearCode('2023-2024'),
      schoolScopeId: new SchoolScopeId('scope-1'),
      dateRange: new DateRange({ startDate: new Date('2023-09-01'), endDate: new Date('2024-06-30') }),
      createdBy: 'integration-runner',
    });
    year.addTerm(
      new AcademicTerm({
        id: new AcademicTermId('txn-term'),
        code: new AcademicTermCode('T1'),
        dateRange: new DateRange({ startDate: new Date('2023-09-01'), endDate: new Date('2024-01-31') }),
      }),
      'integration-runner'
    );

    // Aggregate save writes year + deletes + re-inserts term in ONE transaction.
    await repo2.save(year);
    check('year row persisted', await ds2.exists('SELECT 1 FROM academic_years WHERE id = ?', ['iy-txn']));
    check('term row persisted', await ds2.exists('SELECT 1 FROM academic_terms WHERE id = ?', ['txn-term']));

    // Force a mid-transaction failure → nothing should persist.
    ds2.failNextTransaction = true;
    const y2 = AcademicYear.create({
      id: new AcademicYearId('iy-txn2'),
      code: new AcademicYearCode('2022-2023'),
      schoolScopeId: new SchoolScopeId('scope-1'),
      dateRange: new DateRange({ startDate: new Date('2022-09-01'), endDate: new Date('2023-06-30') }),
      createdBy: 'integration-runner',
    });
    let threw = false;
    try {
      await repo2.save(y2);
    } catch {
      threw = true;
    }
    check('second save throws on forced failure', threw);
    check('no partial year persisted on failure', await ds2.count('SELECT 1 FROM academic_years') === 1);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 7. DI RESOLUTION
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n[7] DI resolution');
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

  // ═════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═════════════════════════════════════════════════════════════════════════
  console.log(`\n=== RESULT: ${passed} passed, ${failures} failed ===`);
  return failures === 0 ? 0 : 1;
}

// Self-execute when run directly (not imported as a module).
if (typeof require !== 'undefined' && require.main === module) {
  run().then((code) => process.exit(code));
}
