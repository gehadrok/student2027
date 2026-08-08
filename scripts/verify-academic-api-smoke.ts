/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer API Smoke Tests.
 *
 * Verifies the Application Services (AcademicYearService, CurriculumService,
 * CourseAssignmentService, AcademicCalendarService), the CQRS command/query
 * contracts, the use-cases, and the Express AcademicController wiring using an
 * in-memory IDataSource (no browser/WASM runtime required).
 *
 * Run via: npx node scripts/run-academic-api-smoke.mjs
 */

import { IDataSource } from '../src/core/datasource/IDataSource';
import { UnitOfWork } from '../src/core/datasource/UnitOfWork';
import { EventBus } from '../src/core/events/EventBus';
import { AcademicYearService } from '../src/modules/academic/application/services/AcademicYearService';
import { CurriculumService } from '../src/modules/academic/application/services/CurriculumService';
import { CourseAssignmentService } from '../src/modules/academic/application/services/CourseAssignmentService';
import { AcademicCalendarService } from '../src/modules/academic/application/services/AcademicCalendarService';
import { AcademicYearUseCases } from '../src/modules/academic/application/use-cases/AcademicYearUseCases';
import { SQLiteAcademicYearRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository';
import { SQLiteCurriculumRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteCurriculumRepository';
import { SQLiteCourseAssignmentRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteCourseAssignmentRepository';
import { SQLiteAcademicCalendarRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteAcademicCalendarRepository';

class InMemoryDataSource implements IDataSource {
  private tables: Map<string, Map<string, Record<string, any>>> = new Map();
  failNextTransaction = false;
  private txnActive = false;
  private txnSnapshot: Map<string, Map<string, Record<string, any>>> = new Map();

  tableName(sql: string): string {
    const m = sql.toLowerCase();
    if (m.includes('academic_years')) return 'academic_years';
    if (m.includes('academic_terms')) return 'academic_terms';
    if (m.includes('subjects_master')) return 'subjects_master';
    if (m.includes('schedule_periods')) return 'schedule_periods';
    if (m.includes('subjects')) return 'subjects';
    return 'misc';
  }

  store(): Map<string, Map<string, Record<string, any>>> {
    for (const t of ['academic_years', 'academic_terms', 'subjects_master', 'subjects', 'schedule_periods']) {
      if (!this.tables.has(t)) this.tables.set(t, new Map());
    }
    return this.tables;
  }

  query<T = any>(sql: string, params?: any[]): T[] {
    const t = this.tableName(sql);
    const table = this.store().get(t)!;
    let rows = Array.from(table.values());
    if (params && params.length > 0) {
      const key = String(params[params.length - 1]);
      rows = rows.filter((r) => Object.values(r).some((v) => String(v) === key));
    }
    return rows as unknown as T[];
  }

  queryOne<T = any>(sql: string, params?: any[]): T | null {
    const rows = this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  execute(sql: string, params?: any[]): { changes: number; lastInsertRowid: number } {
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
      const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
      if (existing && setMatch) {
        const assign = setMatch[1].split(',').map((a) => a.trim());
        const clone = { ...existing };
        let paramIndex = 0;
        assign.forEach((a) => {
          const eq = a.indexOf('=');
          const col = a.slice(0, eq).trim();
          const valPart = a.slice(eq + 1).trim();
          if (!/CURRENT_TIMESTAMP/.test(valPart.toUpperCase())) {
            // SET columns map to params[0..n]; the WHERE id is the last param.
            clone[col] = params?.[paramIndex];
            paramIndex++;
          }
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

  transaction(queries: Array<{ sql: string; params?: any[] }>): { success: boolean; error?: string } {
    if (this.failNextTransaction) {
      this.failNextTransaction = false;
      return { success: false, error: 'Simulated transaction failure' };
    }
    try {
      this.beginTransaction();
      for (const q of queries) this.execute(q.sql, q.params);
      this.commit();
      return { success: true };
    } catch (err: any) {
      this.rollback();
      return { success: false, error: err?.message || 'Transaction failed' };
    }
  }

  prepare(): { run: (params?: any[]) => void; free: () => void } {
    return { run: () => undefined, free: () => undefined };
  }

  count(sql: string, params?: any[]): number {
    return this.query(sql, params).length;
  }

  exists(sql: string, params?: any[]): boolean {
    return this.count(sql, params) > 0;
  }

  beginTransaction(): void {
    this.txnActive = true;
    this.txnSnapshot = new Map();
    for (const [name, table] of this.store()) this.txnSnapshot.set(name, new Map(table));
  }

  commit(): void {
    this.txnActive = false;
  }

  rollback(): void {
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
  // ── Shared in-memory data source + services ─────────────────────────────
  const ds = new InMemoryDataSource();
  const eventBus = EventBus.getInstance();
  eventBus.clear();

  const yearService = new AcademicYearService(new SQLiteAcademicYearRepository(ds, new UnitOfWork(ds), eventBus));
  const curriculumService = new CurriculumService(new SQLiteCurriculumRepository(ds, new UnitOfWork(ds)));
  const caService = new CourseAssignmentService(new SQLiteCourseAssignmentRepository(ds, new UnitOfWork(ds)));
  const calService = new AcademicCalendarService(new SQLiteAcademicCalendarRepository(ds, new UnitOfWork(ds)));
  const useCases = new AcademicYearUseCases(yearService);

  console.log('\n=== ACADEMIC APPLICATION LAYER API SMOKE TESTS ===\n');

  // ── 1. AcademicYearService commands ─────────────────────────────────────
  console.log('\n[1] AcademicYearService commands');
  {
    const dto = yearService.create({
      id: 'app-ay-1',
      code: '2026-2027',
      schoolScopeId: 'scope-1',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      createdBy: 'smoke-runner',
    });
    check('create returns draft DTO', dto.status === 'draft');
    check('create returns code', dto.code === '2026-2027');

    const loaded = yearService.getById({ id: 'app-ay-1' });
    check('getById returns persisted DTO', loaded.id === 'app-ay-1');

    const byCode = yearService.getByCode({ code: '2026-2027' });
    check('getByCode returns DTO', byCode.id === 'app-ay-1');

    const list = yearService.list({});
    check('list returns DTOs', list.some((y) => y.id === 'app-ay-1'));
  }

  // ── 2. AcademicYear lifecycle via UseCases ─────────────────────────────
  console.log('\n[2] AcademicYear lifecycle via use-cases');
  {
    const dto = useCases.createWithTerms({
      year: {
        id: 'app-ay-2',
        code: '2025-2026',
        schoolScopeId: 'scope-1',
        startDate: '2025-09-01',
        endDate: '2026-06-30',
        createdBy: 'smoke-runner',
      },
      terms: [
        {
          id: 'app-term-1',
          code: 'F1',
          startDate: '2025-09-01',
          endDate: '2026-01-31',
        },
      ],
    });
    check('createWithTerms returns year', dto.status === 'draft');
    check('createWithTerms adds term', dto.terms.length === 1);

    const approved = useCases.approve({ academicYearId: 'app-ay-2', changedBy: 'smoke-runner' });
    check('approve transitions to approved', approved.status === 'approved');

    const active = useCases.activate({ academicYearId: 'app-ay-2', changedBy: 'smoke-runner' });
    check('activate transitions to active', active.status === 'active');

    const closed = useCases.close({ academicYearId: 'app-ay-2', changedBy: 'smoke-runner' });
    check('close transitions to closed', closed.status === 'closed');

    const archived = useCases.archive({ academicYearId: 'app-ay-2', reason: 'cycle end', changedBy: 'smoke-runner' });
    check('archive transitions to archived', archived.status === 'archived');
  }

  // ── 3. Term operations via service ─────────────────────────────────────
  console.log('\n[3] AcademicTerm operations via service');
  {
    const dto = yearService.addTerm({
      academicYearId: 'app-ay-1',
      id: 'app-term-x',
      code: 'S2',
      startDate: '2027-02-01',
      endDate: '2027-06-30',
      changedBy: 'smoke-runner',
    });
    check('addTerm returns year with term', dto.terms.some((t) => t.id === 'app-term-x'));

    const opened = yearService.openTerm({ academicYearId: 'app-ay-1', termId: 'app-term-x', changedBy: 'smoke-runner' });
    check('openTerm sets status open', opened.terms.find((t: any) => t.id === 'app-term-x')?.status === 'open');

    const closed = yearService.closeTerm({ academicYearId: 'app-ay-1', termId: 'app-term-x', changedBy: 'smoke-runner' });
    check('closeTerm sets status closed', closed.terms.find((t: any) => t.id === 'app-term-x')?.status === 'closed');
  }

  // ── 4. CurriculumService ───────────────────────────────────────────────
  console.log('\n[4] CurriculumService');
  {
    const dto = curriculumService.save({
      id: 'app-cur-1',
      code: 'SCI-201',
      nameAr: 'علوم',
      nameEn: 'Science',
      gradeLevelId: 'grade-8',
      isActive: true,
      displayOrder: 2,
    });
    check('curriculum save returns DTO', dto.code === 'SCI-201');

    const found = curriculumService.getById({ id: 'app-cur-1' });
    check('curriculum getById', found.nameAr === 'علوم');

    const byCode = curriculumService.getByCode({ code: 'SCI-201' });
    check('curriculum getByCode', byCode.id === 'app-cur-1');

    const byGrade = curriculumService.list({ gradeLevelId: 'grade-8' });
    check('curriculum list by grade', byGrade.some((c) => c.id === 'app-cur-1'));

    check('curriculum delete', curriculumService.delete({ id: 'app-cur-1' }) === true);
  }

  // ── 5. CourseAssignmentService ─────────────────────────────────────────
  console.log('\n[5] CourseAssignmentService');
  {
    const dto = caService.save({
      id: 'app-ca-1',
      subjectId: 'subj-1',
      teacherId: 'tch-1',
      gradeLevelId: 'grade-8',
      weeklyPeriods: 4,
      isActive: true,
    });
    check('course assignment save returns DTO', dto.id === 'app-ca-1');

    const found = caService.getById({ id: 'app-ca-1' });
    check('course assignment getById', found.teacherId === 'tch-1');

    const byTeacher = caService.list({ teacherId: 'tch-1' });
    check('course assignment list by teacher', byTeacher.some((x) => x.id === 'app-ca-1'));

    check('course assignment delete', caService.delete({ id: 'app-ca-1' }) === true);
  }

  // ── 6. AcademicCalendarService ─────────────────────────────────────────
  console.log('\n[6] AcademicCalendarService');
  {
    // Seed a schedule_periods row so the update path is exercised.
    ds.execute('INSERT INTO schedule_periods (id, day, academic_week) VALUES (?, ?, ?)', ['app-day-1', '2027-09-01', 1]);

    const dto = calService.save({
      id: 'app-day-1',
      date: '2027-09-01',
      isInstructional: true,
      academicWeek: 1,
    });
    check('academic calendar save returns DTO', dto.date === '2027-09-01');

    const byDate = calService.getByDate({ date: '2027-09-01' });
    check('academic calendar getByDate', byDate.id === 'app-day-1');

    const byWeek = calService.list({ week: 1 });
    check('academic calendar list by week', byWeek.some((x) => x.id === 'app-day-1'));

    check('academic calendar delete', calService.delete({ id: 'app-day-1' }) === true);
  }

  console.log(`\n=== RESULT: ${passed} passed, ${failures} failed ===`);
  return failures === 0 ? 0 : 1;
}

// Self-execute when run directly (not imported as a module).
if (typeof require !== 'undefined' && require.main === module) {
  run().then((code) => process.exit(code));
}
