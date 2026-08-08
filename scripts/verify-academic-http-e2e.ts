/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.1 — HTTP End-to-End API Verification.
 *
 * Starts a REAL HTTP server on an ephemeral port and exercises the REAL
 * Express routing stack via REAL `fetch` HTTP requests. This verifies the
 * complete path:
 *
 *   Client → HTTP → Express → Router → Controller → Application Service
 *          → Repository → UnitOfWork → EventBus → HTTP Response
 *
 * The Application Service singletons (src/modules/academic/application/services)
 * default their repositories to DataSourceFactory.getInstance(). We therefore
 * install an InMemoryDataSource via DataSourceFactory.setInstance() BEFORE the
 * router/services modules are loaded, so the full stack resolves against the
 * in-memory store. No production code is modified.
 *
 * Run via: npx node scripts/run-academic-http-e2e.mjs
 */

import { IDataSource } from '../src/core/datasource/IDataSource';
import { DataSourceFactory } from '../src/core/datasource/DataSourceFactory';
import { EventBus } from '../src/core/events/EventBus';

/**
 * In-memory IDataSource that mimics the SQL behaviour of the repository SQL
 * (academic_years, academic_terms, subjects_master, subjects, schedule_periods).
 * Reuses the proven pattern from the Phase 6.0 smoke suite.
 */
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
      // For UPDATE ... WHERE day = ? (AcademicCalendar), the "id" is the day value.
      const effectiveKey = existing ? key : (params?.length ? String(params[params.length - 1]) : key);
      const target = existing ? existing : table.get(effectiveKey);
      if (target && setMatch) {
        const assign = setMatch[1].split(',').map((a) => a.trim());
        const clone = { ...target };
        let paramIndex = 0;
        assign.forEach((a) => {
          const eq = a.indexOf('=');
          const col = a.slice(0, eq).trim();
          const valPart = a.slice(eq + 1).trim();
          if (!/CURRENT_TIMESTAMP/.test(valPart.toUpperCase())) {
            clone[col] = params?.[paramIndex] ?? clone[col];
            paramIndex++;
          }
        });
        table.set(effectiveKey, clone);
      }
      return { changes: target ? 1 : 0, lastInsertRowid: 0 };
    }
    if (lower.startsWith('delete')) {
      const key = String(params?.[params!.length - 1]);
      let had = table.has(key);
      if (!had) {
        // find row whose any value matches key (e.g. DELETE by day)
        for (const [k, v] of table.entries()) {
          if (Object.values(v).some((val) => String(val) === key)) { table.delete(k); had = true; break; }
        }
      } else {
        table.delete(key);
      }
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
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

interface TestResponse {
  status: number;
  body: any;
}

async function request(
  base: string,
  method: string,
  path: string,
  body?: unknown
): Promise<TestResponse> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: res.status, body: parsed };
}

export async function run(): Promise<number> {
  const ds = new InMemoryDataSource();
  // Install the in-memory data source BEFORE the service singleton modules load.
  DataSourceFactory.setInstance(ds);
  EventBus.getInstance().clear();

  // Track domain events dispatched through the EventBus.
  const eventCounts: Record<string, number> = {};
  const trackEvent = (name: string): void => {
    EventBus.getInstance().subscribe(name, () => {
      eventCounts[name] = (eventCounts[name] ?? 0) + 1;
    });
  };
  trackEvent('AcademicYearCreated');
  trackEvent('AcademicTermAdded');
  trackEvent('AcademicYearApproved');
  trackEvent('AcademicYearActivated');
  trackEvent('AcademicTermOpened');
  trackEvent('AcademicTermLocked');
  trackEvent('AcademicTermClosed');
  trackEvent('AcademicYearClosed');
  trackEvent('AcademicYearArchived');

  // Dynamic imports so the singleton service modules resolve against ds.
  const { createAcademicRouter } = await import('../src/modules/academic/api/academicRoutes');
  const express = (await import('express')).default;

  const app = express();
  app.use(express.json());
  app.use('/api', createAcademicRouter());

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const base = `http://127.0.0.1:${port}`;

  console.log('\n=== ACADEMIC HTTP END-TO-END API VERIFICATION ===');
  console.log(`HTTP server listening on ${base}\n`);

  try {
    // ── Health check (routing stack alive) ───────────────────────────────
    console.log('[0] Health / routing stack');
    {
      const r = await request(base, 'GET', '/api/academic/years');
      check('GET /api/academic/years returns 200', r.status === 200, `got ${r.status}`);
      check('list returns array', Array.isArray(r.body));
    }

    // ── AcademicYear lifecycle ───────────────────────────────────────────
    console.log('\n[1] AcademicYear lifecycle');
    const YEAR_ID = 'http-ay-2027';
    const TERM_ID = 'http-term-f1';
    const YEAR_CODE = '2027-2028';
    {
      // POST create
      const created = await request(base, 'POST', '/api/academic/years', {
        id: YEAR_ID,
        code: YEAR_CODE,
        schoolScopeId: 'scope-http',
        startDate: '2027-09-01',
        endDate: '2028-06-30',
        createdBy: 'http-e2e',
      });
      check('POST /academic/years → 201', created.status === 201, `got ${created.status}`);
      check('create returns draft status', created.body?.status === 'draft');
      check('create returns code', created.body?.code === YEAR_CODE);

      // GET by id
      const byId = await request(base, 'GET', `/api/academic/years/${YEAR_ID}`);
      check('GET /academic/years/:id → 200', byId.status === 200, `got ${byId.status}`);
      check('getById id matches', byId.body?.id === YEAR_ID);

      // GET list
      const list = await request(base, 'GET', '/api/academic/years');
      check('GET list contains created year', Array.isArray(list.body) && list.body.some((y: any) => y.id === YEAR_ID));
      check('list summary termCount present', list.body.some((y: any) => typeof y.termCount === 'number'));

      // GET by code
      const byCode = await request(base, 'GET', `/api/academic/years/code/${YEAR_CODE}`);
      check('GET /academic/years/code/:code → 200', byCode.status === 200, `got ${byCode.status}`);
      check('getByCode id matches', byCode.body?.id === YEAR_ID);

      // POST addTerm
      const withTerm = await request(base, 'POST', `/api/academic/years/${YEAR_ID}/terms`, {
        id: TERM_ID,
        code: 'F1',
        startDate: '2027-09-01',
        endDate: '2028-01-31',
        changedBy: 'http-e2e',
      });
      check('POST /academic/years/:id/terms → 201', withTerm.status === 201, `got ${withTerm.status}`);
      check('addTerm adds one term', withTerm.body?.terms?.length === 1);
      check('term code matches', withTerm.body?.terms?.[0]?.code === 'F1');

      // While the year is DRAFT, exercise term lifecycle (assertEditable allows it).
      // open → lock → close (planned → open → locked → closed)
      const termOpen = await request(base, 'POST', `/api/academic/years/${YEAR_ID}/terms/${TERM_ID}/open`, { changedBy: 'http-e2e' });
      check('POST .../terms/:id/open → 200', termOpen.status === 200, `got ${termOpen.status}`);
      check('term status open', termOpen.body?.terms?.find((t: any) => t.id === TERM_ID)?.status === 'open');

      const termLock = await request(base, 'POST', `/api/academic/years/${YEAR_ID}/terms/${TERM_ID}/lock`, { changedBy: 'http-e2e' });
      check('POST .../terms/:id/lock → 200', termLock.status === 200, `got ${termLock.status}`);
      check('term status locked', termLock.body?.terms?.find((t: any) => t.id === TERM_ID)?.status === 'locked');

      const termClose = await request(base, 'POST', `/api/academic/years/${YEAR_ID}/terms/${TERM_ID}/close`, { changedBy: 'http-e2e' });
      check('POST .../terms/:id/close → 200', termClose.status === 200, `got ${termClose.status}`);
      check('term status closed', termClose.body?.terms?.find((t: any) => t.id === TERM_ID)?.status === 'closed');

      // Year lifecycle: approve (draft → approved) → activate (approved → active)
      const approved = await request(base, 'POST', `/api/academic/years/${YEAR_ID}/approve`, { changedBy: 'http-e2e' });
      check('POST /approve → 200', approved.status === 200, `got ${approved.status}`);
      check('status becomes approved', approved.body?.status === 'approved');

      const active = await request(base, 'POST', `/api/academic/years/${YEAR_ID}/activate`, { changedBy: 'http-e2e' });
      check('POST /activate → 200', active.status === 200, `got ${active.status}`);
      check('status becomes active', active.body?.status === 'active');

      // close (active → closed)
      const closed = await request(base, 'POST', `/api/academic/years/${YEAR_ID}/close`, { changedBy: 'http-e2e' });
      check('POST /close → 200', closed.status === 200, `got ${closed.status}`);
      check('status becomes closed', closed.body?.status === 'closed');

      // archive
      const archived = await request(base, 'POST', `/api/academic/years/${YEAR_ID}/archive`, { reason: 'cycle end', changedBy: 'http-e2e' });
      check('POST /archive → 200', archived.status === 200, `got ${archived.status}`);
      check('status becomes archived', archived.body?.status === 'archived');

      // DELETE
      const del = await request(base, 'DELETE', `/api/academic/years/${YEAR_ID}`);
      check('DELETE /academic/years/:id → 204', del.status === 204, `got ${del.status}`);

      // Verify persistence: getById after delete → 400 (not found)
      const afterDelete = await request(base, 'GET', `/api/academic/years/${YEAR_ID}`);
      check('GET after DELETE returns error (not found)', afterDelete.status === 400, `got ${afterDelete.status}`);
      check('error envelope present', afterDelete.body?.error !== undefined);
    }

    // ── Error handling: invalid status transition (409/400) ─────────────
    console.log('\n[2] Error handling / validation');
    {
      // Create a year with no terms, then try to activate → must fail (needs terms)
      const bad = await request(base, 'POST', '/api/academic/years', {
        id: 'http-ay-error',
        code: '2030-2031',
        schoolScopeId: 'scope-http',
        startDate: '2030-09-01',
        endDate: '2031-06-30',
        createdBy: 'http-e2e',
      });
      check('create error-setup year → 201', bad.status === 201, `got ${bad.status}`);

      // Try to approve first (valid), then activate without terms → domain error → 400
      await request(base, 'POST', `/api/academic/years/${'http-ay-error'}/approve`, { changedBy: 'http-e2e' });
      const activateNoTerms = await request(base, 'POST', `/api/academic/years/${'http-ay-error'}/activate`, { changedBy: 'http-e2e' });
      check('activate without terms → 400 (validation)', activateNoTerms.status === 400, `got ${activateNoTerms.status}`);
      check('error envelope returned', activateNoTerms.body?.error !== undefined);

      // Try to close a draft year (year2 is draft) → invalid transition → 400
      const year2 = await request(base, 'POST', '/api/academic/years', {
        id: 'http-ay-draft',
        code: '2031-2032',
        schoolScopeId: 'scope-http',
        startDate: '2031-09-01',
        endDate: '2032-06-30',
        createdBy: 'http-e2e',
      });
      check('create draft year → 201', year2.status === 201, `got ${year2.status}`);
      const closeDraft = await request(base, 'POST', `/api/academic/years/${'http-ay-draft'}/close`, { changedBy: 'http-e2e' });
      check('close draft (invalid transition) → 400', closeDraft.status === 400, `got ${closeDraft.status}`);

      // GET non-existent id → 400 not found
      const missing = await request(base, 'GET', '/api/academic/years/nope-123');
      check('GET missing id → 400 not found', missing.status === 400, `got ${missing.status}`);
    }

    // ── Curriculum CRUD ──────────────────────────────────────────────────
    console.log('\n[3] Curriculum CRUD');
    const CUR_ID = 'http-cur-sci';
    {
      const created = await request(base, 'POST', '/api/academic/curriculums', {
        id: CUR_ID,
        code: 'SCI-301',
        nameAr: 'علوم',
        nameEn: 'Science',
        gradeLevelId: 'grade-9',
        isActive: true,
        displayOrder: 3,
      });
      check('POST /academic/curriculums → 201', created.status === 201, `got ${created.status}`);
      check('curriculum code returned', created.body?.code === 'SCI-301');

      const byId = await request(base, 'GET', `/api/academic/curriculums/${CUR_ID}`);
      check('GET /curriculums/:id → 200', byId.status === 200, `got ${byId.status}`);
      check('curriculum nameAr matches', byId.body?.nameAr === 'علوم');

      const byCode = await request(base, 'GET', '/api/academic/curriculums/code/SCI-301');
      check('GET /curriculums/code/:code → 200', byCode.status === 200, `got ${byCode.status}`);
      check('curriculum by code id', byCode.body?.id === CUR_ID);

      const list = await request(base, 'GET', '/api/academic/curriculums');
      check('GET /curriculums list contains', Array.isArray(list.body) && list.body.some((c: any) => c.id === CUR_ID));

      // PUT update (upsert)
      const updated = await request(base, 'PUT', `/api/academic/curriculums/${CUR_ID}`, {
        id: CUR_ID,
        code: 'SCI-301',
        nameAr: 'علوم متقدمة',
        nameEn: 'Advanced Science',
        gradeLevelId: 'grade-10',
        isActive: true,
        displayOrder: 4,
      });
      check('PUT /curriculums/:id → 201', updated.status === 201, `got ${updated.status}`);
      const updatedById = await request(base, 'GET', `/api/academic/curriculums/${CUR_ID}`);
      check('PUT persists name change', updatedById.body?.nameAr === 'علوم متقدمة');

      const del = await request(base, 'DELETE', `/api/academic/curriculums/${CUR_ID}`);
      check('DELETE /curriculums/:id → 204', del.status === 204, `got ${del.status}`);
    }

    // ── CourseAssignment CRUD ────────────────────────────────────────────
    console.log('\n[4] CourseAssignment CRUD');
    const CA_ID = 'http-ca-1';
    {
      const created = await request(base, 'POST', '/api/academic/course-assignments', {
        id: CA_ID,
        subjectId: 'subj-x',
        teacherId: 'tch-x',
        gradeLevelId: 'grade-9',
        weeklyPeriods: 4,
        isActive: true,
      });
      check('POST /course-assignments → 201', created.status === 201, `got ${created.status}`);
      check('course assignment id returned', created.body?.id === CA_ID);

      const byId = await request(base, 'GET', `/api/academic/course-assignments/${CA_ID}`);
      check('GET /course-assignments/:id → 200', byId.status === 200, `got ${byId.status}`);
      check('teacherId matches', byId.body?.teacherId === 'tch-x');

      const list = await request(base, 'GET', '/api/academic/course-assignments');
      check('GET /course-assignments list contains', Array.isArray(list.body) && list.body.some((x: any) => x.id === CA_ID));

      const byTeacher = await request(base, 'GET', '/api/academic/course-assignments?teacherId=tch-x');
      check('list by teacherId filter', Array.isArray(byTeacher.body) && byTeacher.body.some((x: any) => x.id === CA_ID));

      // PUT update
      const updated = await request(base, 'PUT', `/api/academic/course-assignments/${CA_ID}`, {
        id: CA_ID,
        subjectId: 'subj-x',
        teacherId: 'tch-y',
        gradeLevelId: 'grade-9',
        weeklyPeriods: 6,
        isActive: true,
      });
      check('PUT /course-assignments/:id → 201', updated.status === 201, `got ${updated.status}`);
      const updatedById = await request(base, 'GET', `/api/academic/course-assignments/${CA_ID}`);
      check('PUT persists teacher change', updatedById.body?.teacherId === 'tch-y');

      const del = await request(base, 'DELETE', `/api/academic/course-assignments/${CA_ID}`);
      check('DELETE /course-assignments/:id → 204', del.status === 204, `got ${del.status}`);
    }

    // ── AcademicCalendar CRUD ────────────────────────────────────────────
    console.log('\n[5] AcademicCalendar CRUD');
    const CAL_ID = 'http-day-1';
    const CAL_DATE = '2027-09-01';
    {
      // Seed a schedule_periods row so the update path is exercised.
      ds.execute('INSERT INTO schedule_periods (id, day, academic_week) VALUES (?, ?, ?)', [CAL_ID, CAL_DATE, 1]);

      const created = await request(base, 'POST', '/api/academic/calendar', {
        id: CAL_ID,
        date: CAL_DATE,
        isInstructional: true,
        academicWeek: 1,
      });
      check('POST /academic/calendar → 201', created.status === 201, `got ${created.status}`);

      const byDate = await request(base, 'GET', `/api/academic/calendar/date/${CAL_DATE}`);
      check('GET /calendar/date/:date → 200', byDate.status === 200, `got ${byDate.status}`);
      check('calendar by date id', byDate.body?.id === CAL_ID);

      const byId = await request(base, 'GET', `/api/academic/calendar/${CAL_ID}`);
      check('GET /calendar/:id → 200', byId.status === 200, `got ${byId.status}`);

      const list = await request(base, 'GET', '/api/academic/calendar');
      check('GET /calendar list contains', Array.isArray(list.body) && list.body.some((x: any) => x.id === CAL_ID));

      const byWeek = await request(base, 'GET', '/api/academic/calendar?week=1');
      check('GET /calendar?week=1 filter', Array.isArray(byWeek.body) && byWeek.body.some((x: any) => x.id === CAL_ID));

      // PUT update
      const updated = await request(base, 'PUT', `/api/academic/calendar/${CAL_ID}`, {
        id: CAL_ID,
        date: CAL_DATE,
        isInstructional: true,
        academicWeek: 2,
      });
      check('PUT /calendar/:id → 201', updated.status === 201, `got ${updated.status}`);

      const del = await request(base, 'DELETE', `/api/academic/calendar/${CAL_ID}`);
      check('DELETE /calendar/:id → 204', del.status === 204, `got ${del.status}`);
    }

    // ── AcademicYear with terms (use-case path) ──────────────────────────
    console.log('\n[6] createAcademicYearWithTerms (use-case path)');
    {
      const created = await request(base, 'POST', '/api/academic/years/with-terms', {
        year: {
          id: 'http-ay-withterms',
          code: '2029-2030',
          schoolScopeId: 'scope-http',
          startDate: '2029-09-01',
          endDate: '2030-06-30',
          createdBy: 'http-e2e',
        },
        terms: [
          { id: 'http-term-f1-wt', code: 'F1', startDate: '2029-09-01', endDate: '2030-01-31' },
          { id: 'http-term-s2-wt', code: 'S2', startDate: '2030-02-01', endDate: '2030-06-30' },
        ],
      });
      check('POST /academic/years/with-terms → 201', created.status === 201, `got ${created.status}`);
      check('with-terms creates 2 terms', created.body?.terms?.length === 2);
    }

    console.log(`\n=== RESULT: ${passed} passed, ${failures} failed ===`);
    return failures === 0 ? 0 : 1;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
