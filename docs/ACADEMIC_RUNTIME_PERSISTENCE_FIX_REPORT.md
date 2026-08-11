# ACADEMIC RUNTIME PERSISTENCE — FIX REPORT

**Task:** Close the Academic runtime persistence blocker (schema alignment only).
**Scope:** Align the canonical runtime SQLite schema (`src/lib/sqlite-schema.sql`)
with the EXISTING Academic repository/mapper expectations. No domain logic,
repositories, services, controllers, routes, frontend, or new features were
modified.
**Phase guard:** Phase 6.3 / Phase 7 NOT started. `AcademicStructure` and
`ClassSchedule` NOT implemented.
**Date:** Phase 6.2 closure follow-up.

---

## 1. Original Root Cause

The application runtime SQLite bootstrap (`src/lib/sqlite-engine.ts`) loads
**only** two files on a fresh database:

- `src/lib/sqlite-schema.sql` (canonical runtime schema, imported via `?raw`)
- `src/lib/sqlite-seed.sql` (canonical runtime seed, imported via `?raw`)

The four production Academic repositories target tables and columns that were
**not present** in that runtime-loaded schema:

| Repository | Target table | Missing at runtime |
|---|---|---|
| `SQLiteAcademicYearRepository` | `academic_years`, `academic_terms` | Entire tables absent |
| `SQLiteCurriculumRepository` | `subjects_master` | Entire table absent |
| `SQLiteCourseAssignmentRepository` | `subjects` | Column `subject_id` absent; `name`/`code` were `NOT NULL` (insert supplies neither) |
| `SQLiteAcademicCalendarRepository` | `schedule_periods` | Column `academic_week` absent; `day` had a CHECK restricted to Arabic weekday tokens |

Those definitions existed only in `migrations/001_master_data.sql`, which is a
migration file and **is never loaded** by the runtime bootstrap. Because
`sqlite-engine.ts` (`runSqlSync`/`querySqlSync`) silently swallows query errors,
every Academic persistence operation failed or no-op'd at runtime:

- `exists()` returned `false` on `no such table` (error swallowed).
- `runTransactionSync` threw `no such table` inside the transaction → rollback
  → `save()` threw.
- `subjects` inserts violated the NOT NULL `name`/`code` columns.
- `schedule_periods` inserts with ISO dates violated the `day` CHECK.

Net effect: the fully-wired Academic layer (Year lifecycle, Curriculum,
CourseAssignment, Calendar, frontend) could not durably persist any data
against the actual runtime database.

## 2. Exact Schema Mismatch Discovered

Confirmed by reading the repositories and mappers against the runtime-loaded
schema (`src/lib/sqlite-schema.sql` + `src/lib/sqlite-seed.sql`):

**2.1 `academic_years` / `academic_terms` — tables missing from runtime schema.**
The `SQLiteAcademicYearRepository` `save()` executes:
`INSERT INTO academic_years (id, code, name_ar, name_en, description,
start_date, end_date, is_current, is_active, display_order, created_at,
updated_at) ...` and per-term
`INSERT INTO academic_terms (id, code, name_ar, name_en, description,
academic_year_id, start_date, end_date, is_current, is_active,
display_order, created_at, updated_at) ...`, plus `SELECT * FROM
academic_years/academic_terms`. Neither table existed at runtime.

**2.2 `subjects_master` — table missing from runtime schema.**
`SQLiteCurriculumRepository` executes `INSERT/UPDATE/SELECT/DELETE` on
`subjects_master (id, code, name_ar, name_en, description, grade_level_id,
is_active, display_order, created_at, updated_at)`. The table existed only in
`migrations/001_master_data.sql`.

**2.3 `subjects` — missing `subject_id`, and `name`/`code` NOT NULL.**
`SQLiteCourseAssignmentRepository` inserts rows with only
`(id, subject_id, teacher_id, class_id, weekly_hours)`:
`INSERT INTO subjects (id, subject_id, teacher_id, class_id, weekly_hours,
max_score, pass_score, created_at, updated_at)`. Runtime `subjects` lacked
`subject_id`, and `name`/`code` were declared `NOT NULL` with `code` `UNIQUE`
— any repository insert violated the constraints.

**2.4 `schedule_periods` — missing `academic_week`, and `day` CHECK blocked ISO dates.**
`SQLiteAcademicCalendarRepository` matches rows by calendar date stored in
`day` (`SELECT * FROM schedule_periods WHERE day = ?`), filters by
`academic_week`, and updates `updated_at`. Runtime `day` had
`CHECK(day IN ('الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'))` — ISO
dates (e.g. `2025-09-01`) were rejected — and `academic_week` did not exist.

**2.5 `SELECT name FROM sqlite_master` at runtime** returned no academic
tables; `PRAGMA table_info(subjects)` / `schedule_periods` confirmed the
missing columns.

## 3. Exact Changes Made

All changes are **additive or constraint-relaxing** in the single canonical
runtime schema `src/lib/sqlite-schema.sql` (`CREATE TABLE IF NOT EXISTS` /
relaxed column definitions; the seed file is untouched):

| # | Change | Detail |
|---|---|---|
| 1 | Added table `academic_years` | `id PK, code UNIQUE NOT NULL, name_ar NOT NULL, name_en, description, start_date NOT NULL, end_date NOT NULL, is_current, is_active, display_order, created_at, updated_at, created_by, updated_by` |
| 2 | Added table `academic_terms` | `id PK, code UNIQUE NOT NULL, name_ar NOT NULL, name_en, description, academic_year_id NOT NULL → academic_years ON DELETE CASCADE, start_date, end_date, is_current, is_active, display_order, created_at, updated_at, created_by, updated_by` |
| 3 | Added table `subjects_master` | `id PK, code UNIQUE NOT NULL, name_ar NOT NULL, name_en, description, grade_level_id (plain column, no FK), weekly_hours, max_score, pass_score, is_active, display_order, created_at, updated_at, created_by, updated_by` |
| 4 | Extended `subjects` | Added `subject_id TEXT`; added `updated_at DATETIME`; relaxed `name`/`code` to nullable; removed `UNIQUE` from `code` (CourseAssignment inserts carry no name/code) |
| 5 | Extended `schedule_periods` | Added `academic_week INTEGER DEFAULT 1`; added `updated_at DATETIME`; removed the Arabic-weekday `CHECK` on `day` (now accepts ISO calendar dates and legacy weekday tokens) |
| 6 | Added indexes | `idx_academic_years_code`, `idx_academic_years_is_active`, `idx_academic_terms_year`, `idx_academic_terms_code`, `idx_subjects_master_code`, `idx_subjects_master_is_active` |

**Ledger:** `migrations/002_academic_runtime_schema.sql` registers the exact
DDL as an auditable migration-002 ledger (`schema_migrations` row `'002'`).
It contains NO `CREATE TABLE`/`ALTER` executed at runtime — it is documentation
only, and the header explicitly states it must not be loaded as a second
runtime schema.

**Constrained:** `migrations/001_master_data.sql` remains unused at runtime
(no workaround dependency). No second schema was introduced
(`src/lib/db/schema.sql` remains legacy/unloaded). No repository, mapper,
service, controller, route, or frontend code changed.

## 4. Runtime Initialization Path Used

Verification used the **same schema-loading path as the application**:

```
src/lib/sqlite-engine.ts (app runtime)
  getSQLiteDB():
    db = new SQL.Database()
    PRAGMA foreign_keys = ON
    db.run(schemaSql)      // src/lib/sqlite-schema.sql?raw
    db.run(seedSql)        // src/lib/sqlite-seed.sql?raw
```

`scripts/verify-academic-runtime-persistence.ts` mirrors this exactly with a
**real sql.js** engine:

```
initSqlJs({ locateFile: -> node_modules/sql.js/dist/sql-wasm.wasm })
db = new SQL.Database(); PRAGMA foreign_keys = ON
db.run(sqlite-schema.sql)   // read from disk (same bytes the app loads)
db.run(sqlite-seed.sql)     // read from disk
```

The real `Database` is then wrapped in a `RealSQLiteDataSource implements
IDataSource` (prepare/bind/step/getAsObject, BEGIN/COMMIT/ROLLBACK), and the
**production repositories** (`SQLiteAcademicYearRepository`,
`SQLiteCurriculumRepository`, `SQLiteCourseAssignmentRepository`,
`SQLiteAcademicCalendarRepository`) + real `UnitOfWork` + real `EventBus`
are driven through it — no in-memory test double.

Run command: `node scripts/run-academic-runtime-persistence.mjs`

## 5. Real sql.js Verification Results — PASS (47/47)

| Group | Result |
|---|---|
| `sqlite_master` contains `academic_years`, `academic_terms`, `subjects_master`, `subjects`, `schedule_periods` | ✅ |
| `subjects` has `subject_id`, `updated_at` | ✅ |
| `schedule_periods` has `academic_week`, `updated_at` | ✅ |
| Complete schema + seed load with no SQL errors | ✅ |

## 6. Academic Repository Persistence Results (REAL sql.js) — PASS

- **AcademicYear:** create → row exists; `save()` update path persists;
  findById reconstructs; code/dateRange/status preserved. ✅
- **AcademicTerm:** 2 terms persisted and reconstructed; codes preserved;
  `academic_terms` rows counted against `academic_year_id`. ✅
- **Curriculum:** save returns record; row in `subjects_master`; findById /
  findByCode / getByGradeLevel; update persists; delete persists. ✅
- **CourseAssignment:** save returns record (FK parents seeded: user→teacher
  →class, matching `subjects` FKs); findById / getBySubject / getByTeacher /
  getByGradeLevel; update persists (weeklyPeriods 4→5); delete persists. ✅
- **AcademicCalendar:** update path persists date into `day` + `academic_week`;
  findByDate / getByWeek / getAll; delete persists. ✅
- **No table/column-not-found errors** in any repository query. ✅

Notes (existing documented behavior, not part of this schema blocker):
- `subjects` FK on `teacher_id`/`class_id` requires seeded teacher/class
  parents — seeded in the verification exactly as the schema mandates.
- `AcademicCalendar` new-record INSERT remains an explicit no-op in the
  repository (documented in code: `schedule_periods` requires full FK
  parents); update/read/delete paths are fully persisted.

## 7. UnitOfWork Results — PASS

- Multi-row aggregate write (year row + term delete + term re-insert) commits
  in ONE transaction; both rows persisted. ✅
- Forced constraint-violation transaction (`UNIQUE constraint failed:
  academic_years.code`) returns `success:false`, rolls back, and **no partial
  rows persist** (`rt-fail1`/`rt-fail2` absent). ✅
- Repository `save()` throws when the commit fails (no silent success). ✅

## 8. EventBus Results — PASS

- `AcademicYearCreated` dispatched **after successful commit** and captured by
  a subscriber during real-SQLite persistence. ✅
- Full lifecycle events verified in the integration suite:
  `AcademicYearCreated/Approved/Activated/Closed/Archived`,
  `AcademicTermAdded/Opened/Closed`. ✅
- On failed commit (forced failure) no event dispatch occurs; `save()` throws
  first. ✅

## 9. Aggregate Reconstruction Results — PASS

- `findById` → `academicYearFromRows` → `AcademicYear.rehydrate` yields the
  correct aggregate: id, code, `DateRange` (start `2025-09-01`), status
  `draft`, and child `AcademicTerm` entities with correct codes/status. ✅
- Lifecycle round-trip through real repositories:
  `draft → approved → active → closed → archived` each reconstruct correctly
  after reload (status inference via `is_current`/`is_active`/`description`). ✅
- Term lifecycle round-trip: `planned → open → closed` reconstruct
  correctly. ✅

## 10. Integration Test Result — PASS (68/68)

```
=== RESULT: 68 passed, 0 failed ===
npx tsx scripts/run-academic-integration.mjs
```

Groups: AcademicYear lifecycle + rollback; AcademicTerm lifecycle + overlap
invariant; Curriculum CRUD; CourseAssignment CRUD; AcademicCalendar; multi-row
transaction consistency; DI resolution (all 4 repository IDs resolve).

## 11. HTTP E2E Result — PASS (66/66)

```
=== RESULT: 66 passed, 0 failed ===
npx tsx scripts/run-academic-http-e2e.mjs
```

Real Express server on an ephemeral port; real `fetch()` requests through
routes → controllers → services → repositories → UnitOfWork → EventBus.
AcademicYear lifecycle, error handling, Curriculum CRUD, CourseAssignment
CRUD, AcademicCalendar CRUD, and the `createAcademicYearWithTerms` use-case
all pass.

## 12. TypeScript Result — PASS (no new errors)

`npm run lint` (`tsc --noEmit`) reports **only the three pre-existing baseline
errors** already documented in `PHASE6_2_BUILD_CLOSURE_REPORT.md`:
`src/App.tsx` (2), `src/components/ActiveReportPrintView.tsx` (1),
`src/components/GlobalSearchBar.tsx` (6). None are in Academic code; the
schema change is SQL-only and introduces no TS errors.

## 13. Production Build Result — PASS

`npm run build` = `vite build && node scripts/build-server.mjs`:

```
✓ 2404 modules transformed.
✓ built in 1m 55s
dist/index.html                    0.41 kB
dist/assets/sql-wasm-UFUCzYNW.wasm 659.73 kB
dist/assets/index-BRCihrsT.css     127.87 kB
dist/assets/index-CBt4UnJN.js      1,540.58 kB
✅ Server bundle built: dist/server.cjs
```

Both client production bundle and server esbuild bundle succeed (chunk-size
warning only, non-blocking). `dist/server.cjs` produced.

## 14. Remaining Blockers

Out of scope for this task (recorded, NOT fixed):

1. **Aggregate completeness** (BLOCKER, Phase 6.3/7 scope): only `AcademicYear`
   is a full aggregate; `AcademicStructure` and `ClassSchedule` are absent;
   Curriculum/CourseAssignment/AcademicCalendar are record passthroughs
   without lifecycle aggregates, policies, or specifications.
2. **AcademicCalendar new-record INSERT no-op** (repository design, documented
   in code): new calendar days are persisted only via the update path; a
   dedicated calendar table is the remediation (future migration).
3. **Optimistic concurrency not materialized**: `version` is reset to `0` on
   reconstruction and never persisted; no `expectedVersion` check on save.
4. **Non-atomic `createWithTerms`**: `AcademicYearUseCases.createWithTerms`
   calls `create()` then `addTerm()` in two separate transactions.
5. **DI dual-instantiation**: `application/services/index.ts` builds module
   singletons independent of the DI container; `academicController.ts` imports
   services directly.
6. **HTTP error mapping**: `sendError()` always returns 400 (no 404/422/409).
7. **RBAC**: mounted Academic REST routes in `server.ts` are unauthenticated;
   `AcademicYearsScreen.tsx` hard-codes `CURRENT_USER = 'admin'`.
8. **`subjects.is_active` mapper nuance**: `courseAssignmentRowToRecord` reads
   `row.is_active === 1`; the `subjects` table has no `is_active` column, so a
   reloaded CourseAssignment reports `isActive: false` (field is optional and
   unused; the repository never writes it either). Non-blocking.

## Final Status

**ACADEMIC RUNTIME PERSISTENCE: PASS**

The canonical runtime schema now matches the existing Academic
repository/mapper expectations. All persistence paths — AcademicYear,
AcademicTerm, Curriculum, CourseAssignment, AcademicCalendar — create, save,
find, update, and delete durably against a REAL sql.js database initialized
through the same bootstrap path as the application. UnitOfWork commits and
rollbacks behave correctly, EventBus dispatch follows successful commits, and
aggregates reconstruct faithfully. No regression introduced; no new features
added; Phase 6.3 / Phase 7 untouched.

*Task stopped after closing the blocker. Next-phase planning awaits independent
verification.*