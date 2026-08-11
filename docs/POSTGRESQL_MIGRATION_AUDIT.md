# PostgreSQL Migration Audit — Al-Salam School Management System

> **Audit type:** READ-ONLY architecture & schema analysis (no production code or schema was modified).
> **Scope:** Full persistence stack trace + SQLite assumption classification + schema mapping + data migration + Academic pilot + test strategy.
> **Date:** 2026-08-11
> **Verdict:** `POSTGRESQL MIGRATION: BLOCKED` until the synchronous `IDataSource` interface and the dual-database architecture are resolved (see Sections 5, 7, 13).

---

## 1. Executive Summary

The Al-Salam School Management System (Express + React/Vite SPA, DDD/Clean-Architecture layers) persists **all** data through `sql.js` (SQLite compiled to WebAssembly). Persistence is split across **two independent database instances**:

1. **Browser-side SQLite** — the vast majority of SPA screens read/write an in-memory `sql.js` database persisted as a base64 blob in `localStorage` (`al_salam_school_sqlite_db_v1`) via `getRealmDB()` / `saveRealmDB()` → `SQLiteRepository` → `querySqlSync` / `runSqlSync`.
2. **Server-side SQLite** — the Express server (`server.ts`) initializes its own `sql.js` instance persisted to `data/al-salam-server.db`. The **Academic REST API** (`/api/academic/*`) is the only component that reads/writes this server-side database, through the layered Repository → UnitOfWork → `IDataSource` stack.

The two databases are **never synchronized**. Any migration to PostgreSQL must therefore decide the fate of the browser-side store (Sections 7 and 13).

**Key architectural fact:** `IDataSource` (`src/core/datasource/IDataSource.ts`) is a **fully synchronous** 10-method interface (`query`, `queryOne`, `execute`, `transaction`, `prepare`, `count`, `exists`, `beginTransaction`, `commit`, `rollback`). Every repository, service, controller, and verify script is written synchronously. All mainstream PostgreSQL drivers (`pg`, `postgres`, `@postgres.js`) are asynchronous, so a PostgreSQL port requires an **interface-level redesign to async** or a synchronous wrapper over a pooled connection. This is the single largest risk and the reason for the `BLOCKED` verdict.

**Other headline findings:**

- **Two schema files, only one loaded:** `src/lib/sqlite-schema.sql` (27 tables, canonical superset — includes the 4 academic tables) is the only schema executed at runtime (via `sqlite-engine.ts`). `src/lib/db/schema.sql` (23 legacy tables) is **not** loaded anywhere at runtime.
- **Master-data module queries ~29 tables that do not exist at runtime.** `masterDataRepository.TABLE_MAP` maps 32 entity types to tables; only `academic_years`, `academic_terms`, `subjects_master` exist in the runtime schema. `education_stages`, `grade_levels`, `sections_master`, `nationalities`, etc. are defined only in `migrations/001_master_data.sql`, which is **never executed**. Because `querySqlSync` swallows errors and returns `[]`, every master-data screen silently renders empty.
- **Optimistic concurrency is not persisted.** The `AcademicYear` aggregate carries a `version` counter, but `academicYearFromRows` hardcodes `version = 0` and the schema has no `version` column. Status is stored lossily: `description` is overloaded to carry status strings (`'approved'`, `'closed'`, `'locked'`) while `is_active` / `is_current` integer flags carry a second copy of state.
- **SQLite-specific SQL is pervasive:** `INSERT OR REPLACE` / `INSERT OR IGNORE` (32+ call sites), `?` positional placeholders (hundreds), `changes()` / `last_insert_rowid()` (engine + `SQLiteDataSource.execute`), `PRAGMA foreign_keys`, `CURRENT_TIMESTAMP`, `LIMIT ? OFFSET ?`, plus a trigger-based fee/book-return recomputation ported from schema into PG-equivalent or service code.
- **No PostgreSQL dependency, no migration tooling, no DB abstraction test harness** currently exists (`package.json` has no `pg`; there is no test framework; verify scripts are bespoke `npx tsx` runners).
- **Security:** `ConfigService` hardcodes `type: 'sqlite'` and ships insecure default JWT/encryption secrets; PostgreSQL credentials would need to be added to the same env mechanism (`.env` / AI Studio secrets).

---

## 2. Current Persistence Architecture

### 2.1 Runtime data flow (three independent paths)

```
Path 1 — SPA screens (dominant, synchronous)
  React screen (src/screens/*.tsx, src/components/*.tsx)
    → getRealmDB() / saveRealmDB()            (src/lib/db.ts)
    → SQLiteRepository (static methods)        (src/lib/sqlite-repository.ts)
    → querySqlSync / runSqlSync                (src/lib/sqlite-engine.ts)
    → sql.js Database (in-memory, localStorage-persisted)

Path 2 — Repository-layer modules (students/teachers/financial/master-data/dashboard)
  React screen → Service → Repository class (implements I*Repository)
    → IDataSource (DataSourceFactory.getInstance() → SQLiteDataSource)
    → querySqlSync / runSqlSync / runTransactionSync   (src/lib/sqlite-engine.ts)
    → sql.js Database (browser OR server instance, whichever module was imported in)

Path 3 — Academic module (layered, server-side only)
  Browser → academicApiClient (fetch /api/academic/*)   (src/modules/academic/presentation/api)
  Express server.ts → createAcademicRouter()             (src/modules/academic/api/academicRoutes.ts)
    → AcademicController (thin adapter)                  (application/controllers/academicController.ts)
    → Application Services (AcademicYearService, ...)    (application/services/*.ts)
    → SQLite*Repository (implements I*Repository)        (infrastructure/repositories/*.ts)
    → IDataSource + UnitOfWork + EventBus                (src/core/datasource/*, src/core/events/*)
    → sql.js Database (server instance, data/al-salam-server.db)
```

### 2.2 Database bootstrap

- `src/lib/sqlite-engine.ts`:
  - `getSQLiteDB()` (async): loads persisted binary (Node: `data/al-salam-server.db`; browser: localStorage base64), else creates fresh `sql.js` `Database`, runs `PRAGMA foreign_keys = ON;`, executes `schemaSql` (from `./sqlite-schema.sql?raw`) then `seedSql` (from `./sqlite-seed.sql?raw`), then `persistSQLiteDB()`.
  - `querySqlSync` (line 248): **catches all errors and returns `[]`**.
  - `runSqlSync` (line 268): **catches all errors and returns void** (silent write failure).
  - `runTransactionSync` (line 307): `BEGIN TRANSACTION;` → run each → `COMMIT;` else `ROLLBACK;`. Uses `BEGIN TRANSACTION` (SQLite-only keyword, line 283).
  - `runSql` (async) returns `{ changes, lastInsertRowid }` via `SELECT changes() as cnt, last_insert_rowid() as id;` (line 233).
- `src/lib/db.ts`:
  - `getRealmDB()` reads **all 19 collections** in one synchronous pass and flattens `sections` into `classes`.
  - `saveRealmDB()` writes every collection back through `SQLiteRepository.*` — a whole-state write model (N+1 synchronous writes per save).
  - `subscribeDB` / `notifyListeners` provide a reactive update channel to screens.
  - Current user is tracked in `localStorage` (`al_salam_school_current_user_v1`).

### 2.3 Server composition

- `server.ts`: `PORT = 3000`, `app.use(express.json())`, mounts `createAcademicRouter()` at `/api`, `/api/health`, three AI endpoints (Gemini with heuristic fallback), and Vite middleware (dev) / static `dist` (prod). `startServer()` awaits `getSQLiteDB()` before serving.
- DI composition root: `src/core/bootstrap/index.ts` — registers Config, Logger, Cache, EventBus, Storage, Notification, Audit, Permission, Encryption, Hash, Token, Session, DataSource, Auth, 5 legacy repositories, 4 academic repositories, DashboardService, 4 academic services (all `singleton`). `verify-di-smoke.ts` asserts 22 mandatory services resolve.

### 2.4 The `IDataSource` seam (the key abstraction)

- `src/core/datasource/IDataSource.ts` — synchronous interface. Return types are plain values (`T[]`, `{ changes, lastInsertRowid }`, `boolean`, `number`).
- `src/core/datasource/SQLiteDataSource.ts` — `execute()` runs the write then issues a second statement `SELECT changes() as cnt, last_insert_rowid() as id` (lines 31–41) because `runSqlSync` returns nothing. `exists()` wraps predicates in `SELECT COUNT(*) AS cnt FROM (…)` (lines 65–79). `transaction()` delegates to `runTransactionSync`. `beginTransaction/commit/rollback` delegate to engine `BEGIN TRANSACTION`/`COMMIT`/`ROLLBACK`.
- `src/core/datasource/DataSourceFactory.ts` — singleton factory; `createDataSource('sqlite' | 'postgresql' | 'restapi')` currently only implements `'sqlite'`; `postgresql`/`restapi` are commented-out placeholders. `setInstance()` exists and is used by tests to inject `InMemoryDataSource`.
- `src/core/datasource/UnitOfWork.ts` — `register(sql, params)` queues; `commit()` calls `dataSource.transaction(queries)` then clears; `clear()`; `pendingCount`. It does **not** enforce a connection-level begin/commit pair — it relies on `transaction()`.

---

## 3. SQLite Dependency Inventory

Every persistence touch point classified `A` (portable), `B` (SQLite-specific — must change), `C` (PostgreSQL-specific — new), `D` (design decision), `E` (blocking/risk). Counts are from repository-wide grep.

### 3.1 SQL dialect patterns

| Pattern | Classification | Locations (representative) | PostgreSQL equivalent |
|---|---|---|---|
| `?` positional parameters | B | every repository, `SQLiteRepository`, `SQLiteDataSource`, verify scripts | `$1, $2, …` |
| `INSERT OR REPLACE INTO …` | B | `financialRepository` (72, 97), `teacherRepository` (81), `studentRepository` (106), `SQLiteRepository` (113, 171, 219, 302, 346, 390, 426, 463, 497, 535, 576, 610, 645, 686, 719, 751, 783), seed | `INSERT … ON CONFLICT (…) DO UPDATE …` |
| `INSERT OR IGNORE INTO …` | B | `teacherRepository` (102, 112), `studentRepository` (132), `SQLiteRepository` (184, 231, 237, 358), seed | `INSERT … ON CONFLICT DO NOTHING` |
| `changes()` | B | `sqlite-engine.ts:233`, `SQLiteDataSource.ts:35` | `RETURNING` / driver `rowCount` |
| `last_insert_rowid()` | B | `sqlite-engine.ts:233`, `SQLiteDataSource.ts:35` | `RETURNING id` (UUID/TEXT ids make this moot) |
| `PRAGMA foreign_keys = ON;` | B | `sqlite-engine.ts:124,134`; both schema files | Always-on in PG; no-op needed |
| `BEGIN TRANSACTION;` | B | `sqlite-engine.ts:283` | `BEGIN;` |
| `CURRENT_TIMESTAMP` | D | `SQLiteAcademicYearRepository` (54, 74, 103), `SQLiteCurriculumRepository` (37, 55), `SQLiteCourseAssignmentRepository` (38, 46), `SQLiteAcademicCalendarRepository` (37, 45), schema defaults | PG `CURRENT_TIMESTAMP` returns `timestamptz`; stored text columns in SQLite make this lossy on round-trip |
| `LIMIT ? OFFSET ?` | A/D | `masterDataRepository:110` | Works in PG with `$` placeholders |
| `SELECT COUNT(*) as cnt …` | A | `SQLiteDataSource` (count/exists), `masterDataRepository` | Portable |
| `LIKE '…%…%'` (Arabic) | A | `masterDataRepository:86` | Portable (consider `ILIKE`) |
| `DATETIME` / `REAL` column types | B | both schema files (created_at/updated_at, scores) | PG `TIMESTAMP` / `DOUBLE PRECISION` / `NUMERIC` |
| `INTEGER` boolean flags (0/1) | D | all schemas (`is_active`, `is_current`, `notified`, `is_read`, `enable_*`) | PG `BOOLEAN` (mappers already coerce via `=== 1`) |
| `TEXT PRIMARY KEY` (client-generated ids) | A | all tables | PG `TEXT` PK (ids are `u1`/`s1`/`sub1`/`uuid`-style strings — keep `TEXT`) |
| `CHECK(...)` constraints (Arabic enum values) | A | both schema files (gender, status, term, etc.) | Portable as-is |
| Triggers (`trg_fee_payment_update`, `trg_book_borrow_insert/return`, `trg_users_updated_at`) | B | `sqlite-schema.sql:474–516` | Not portable; must be re-implemented as PG functions/triggers or moved into service/repo logic |
| `SELECT * FROM ${table}` with dynamic table names | D | `masterDataRepository` (95, 110, 129, 133, 141, 148, 179, 205, 223, 244), `useReferenceData` (52, 56), `ReferenceDataProvider` | Portable but a SQL-injection surface if input is unvalidated |

### 3.2 Engine / runtime patterns

| Pattern | Classification | Locations | Notes |
|---|---|---|---|
| `sql.js` (WASM) `Database` | B | `sqlite-engine.ts` (entire file) | Whole engine swap to `pg` pool |
| localStorage base64 persistence | B/E | `sqlite-engine.ts` (70, 86–92, 169–176); `db.ts` | Browser-only; cannot reach a server PG |
| Node file persistence `data/al-salam-server.db` | B | `sqlite-engine.ts` (50–52, 79–84, 162–167) | Becomes PG schema+seed via migration runner |
| `querySqlSync` error-swallow → `[]` | E | `sqlite-engine.ts:248–266` | Hides missing-table errors (masked the master-data gap) |
| `runSqlSync` error-swallow → void | E | `sqlite-engine.ts:268–276` | Silent write loss; PG must surface errors |
| `?raw` SQL imports via Vite/esbuild | B | `sqlite-engine.ts:3–4`; `scripts/asset-loader.mjs`; `scripts/esbuild-asset-loader.mjs` | Server bundle inlines schema+seed SQL text |
| `?url` WASM import | B | `sqlite-engine.ts:2` | Removed in a PG-only world |
| Vite asset loaders in test runners | B | `scripts/run-*.mjs` | Only needed while `.sql?raw`/`.wasm?url` exist |
| WASM CDN fallbacks (cdnjs/jsdelivr) | B | `sqlite-engine.ts:104–114` | Gone with sql.js |

### 3.3 Synchronous `IDataSource` (biggest cross-cutting item)

- **All 10 methods are synchronous.** Every caller assumes immediate results:
  - Repositories: `studentRepository`, `teacherRepository`, `financialRepository`, `masterDataRepository`, `dashboardRepository`, all 4 `SQLiteAcademic*Repository`.
  - Services: `masterDataService`, `dashboardService`, `AcademicYearService`, `CurriculumService`, `CourseAssignmentService`, `AcademicCalendarService`.
  - Controllers: `academicController` (all handlers synchronous).
  - Tests: `InMemoryDataSource` implementations in `verify-academic-smoke.ts`, `verify-academic-api-smoke.ts`, `verify-academic-http-e2e.ts`, `academicIntegration.test.ts`.
  - Legacy: `SQLiteRepository` static class + `db.ts` + ~100 screen/component call sites via `getRealmDB`/`saveRealmDB`.
- Classification: **E (blocking)** — see Section 13.

---

## 4. Repository Inventory

### 4.1 Repository contracts (`src/core/repositories/`)

| Interface | Methods | Implemented by |
|---|---|---|
| `IStudentRepository` | getAll / getById / getByClass / save / delete | `StudentRepository` |
| `ITeacherRepository` | getAll / getById / save / delete | `TeacherRepository` |
| `IFinancialRepository` | getAllPayments / getAllExpenses / savePayment / saveExpense | `FinancialRepository` |
| `IMasterDataRepository` | getAll / getAllFlat / getById / create / update / delete / bulkDelete / isFieldUnique / logAudit / getAuditLogs / getParentRecords / getFieldOptions / generateNextNumber / getPermission | `MasterDataRepository` |
| `IDashboardRepository` | getKpis / getTopStudents / getStrugglingStudents / getMostAbsentClasses / getClassDistribution / getAttendanceBreakdown / getNotifications / getSettings | `DashboardRepository` |

### 4.2 Academic domain repositories (`src/modules/academic/domain/repositories/`)

| Interface | Methods | Implemented by | Persistence table |
|---|---|---|---|
| `IAcademicYearRepository` | save / findById / findByCode / getAll / delete | `SQLiteAcademicYearRepository` | `academic_years` + `academic_terms` |
| `ICurriculumRepository` | save / findById / findByCode / getByStage / getByGradeLevel / getAll / delete | `SQLiteCurriculumRepository` | `subjects_master` |
| `ICourseAssignmentRepository` | save / findById / getBySubject / getByTeacher / getByGradeLevel / getByCurriculum / getAll / delete | `SQLiteCourseAssignmentRepository` | `subjects` |
| `IAcademicCalendarRepository` | save / findById / findByDate / getByWeek / getAll / delete | `SQLiteAcademicCalendarRepository` | `academic_calendar_days` |

### 4.3 Legacy static repository

- `src/lib/sqlite-repository.ts` — 795 lines, **static** methods over `querySqlSync`/`runSqlSync` for all 19 collections. This is the workhorse behind `getRealmDB`/`saveRealmDB` and is the largest single file to port. ~40 `INSERT OR REPLACE` statements.

### 4.4 Writes and transaction usage by module

| Module | Write mechanism | Transactional? |
|---|---|---|
| Academic (4 repos) | `UnitOfWork.register` → `dataSource.transaction` | ✅ yes (save), plus events after commit |
| `MasterDataRepository.bulkDelete` | `dataSource.transaction(queries)` | ✅ yes |
| `StudentRepository.save` | single `execute` + `INSERT OR IGNORE` parent link | ❌ not atomic (2 statements) |
| `TeacherRepository.save` | `execute` + DELETE + N×INSERT OR IGNORE | ❌ not atomic |
| `FinancialRepository.save*` | single `execute` | n/a |
| `SQLiteRepository.save*` (all) | individual `runSqlSync` per row | ❌ no |
| `db.ts saveRealmDB` | many individual `runSqlSync` | ❌ no |

**Implication:** PG transactions are per-connection; the current coarse unit is a batch of raw statements. Any atomicity requirement must be re-designed at the repository/UnitOfWork boundary.

---

## 5. UnitOfWork Analysis

`src/core/datasource/UnitOfWork.ts`

- **What it does well:** batches statements, auto-commits on success, auto-rolls back on failure, clears the queue.
- **What it does not do (PostgreSQL-relevant):**
  - No explicit begin/commit bookkeeping at the connection level — relies entirely on `IDataSource.transaction(queries)`.
  - No unit-of-work identity; two sequential `commit()` calls each open their own `transaction()`.
  - Does not propagate domain events (the AcademicYear repository dispatches `year.pullDomainEvents()` itself after a successful `commit()` — `SQLiteAcademicYearRepository.ts:129–133`). This ordering is correct for PG too.
  - Does not support nested units of work.
  - No isolation-level control.
- **SQLite transaction primitives used:** `runTransactionSync` (`BEGIN TRANSACTION;`/`COMMIT;`/`ROLLBACK;` on the single shared `dbInstance`). Because sql.js is single-connection/synchronous, there is **no concurrency** today — this is a major behavior change under PG where concurrent transactions are real.

**Recommendation:** Keep the UnitOfWork pattern but back it with a per-request connection from a PG pool and expose `RETURNING`-aware execute. Convert `register/commit` to async.

---

## 6. Schema Mapping

### 6.1 Table inventory

**Canonical runtime schema `src/lib/sqlite-schema.sql` (27 tables, loaded at runtime):**

*Legacy domain (23):* `users`, `teachers`, `parents`, `school_classes`, `sections`, `students`, `subjects`, `schedule_periods`, `attendance_records`, `grade_records`, `certificates`, `fee_payments`, `expense_records`, `library_books`, `book_borrowings`, `app_notifications`, `audit_logs`, `school_settings`, `saved_reports`, `teacher_subjects`, `teacher_classes`, `parent_students`, `user_linked_students`.

*Academic (4):* `academic_years`, `academic_terms`, `subjects_master`, `academic_calendar_days`.

**Legacy schema `src/lib/db/schema.sql` (23 tables) — NOT loaded at runtime.** Identical DDL for the legacy domain tables (per-line verified; no academic tables). Superseded by `sqlite-schema.sql`.

**`migrations/001_master_data.sql` (35 tables) — NOT loaded at runtime.** Adds `education_stages`, `grade_levels`, `sections_master`, `exam_types`, `certificate_types`, `attendance_types`, `leave_types`, `academic_statuses`, `nationalities`, `countries`, `governorates`, `districts`, `cities`, `identity_types`, `employee_types`, `qualifications`, `specializations`, `job_titles`, `departments`, `buildings`, `rooms`, `laboratories`, `libraries`, `fee_categories`, `payment_methods`, `discount_types`, `currencies`, `system_numbering`, `school_branches`, `document_types`, `master_data_audit_log`, `master_data_permissions` (plus `academic_years`/`academic_terms`/`subjects_master` overlapping with the canonical schema).

**`migrations/002_academic_runtime_schema.sql` / `003_academic_calendar_days.sql` — ledgers only.** Document additive DDL that was applied directly to `sqlite-schema.sql` (academic tables, `subjects.subject_id` + `updated_at`, relaxed `subjects.name/code` nullability, de-uniqued `subjects.code`, `schedule_periods.academic_week` + `updated_at`, relaxed `schedule_periods.day` CHECK, dedicated `academic_calendar_days`).

### 6.2 Master-data runtime gap (verified)

`masterDataRepository.TABLE_MAP` (32 entries, `src/modules/master-data/repository/masterDataRepository.ts:19–53`) references **29 tables that do not exist in the runtime schema** (`education_stages` … `document_types`, minus the 3 that overlap). `useReferenceData.ts` (13 hooks) and `ReferenceDataProvider.tsx` query the same tables. Because `querySqlSync` swallows errors, all these screens render empty without any error.

**Audit classification: D/E.** For PostgreSQL, these 29 tables must be created and seeded as part of the migration (they are legitimate target entities), OR the master-data module must be recognized as currently non-functional and the decision recorded.

### 6.3 Column-level mapping strategy

All tables share a common shape that ports cleanly:

| SQLite column idiom | Example (table.column) | PostgreSQL target |
|---|---|---|
| `TEXT PRIMARY KEY` | all `id` columns | `TEXT PRIMARY KEY` (preserve client-generated ids) |
| `TEXT NOT NULL UNIQUE` | `academic_years.code`, `fee_payments.receipt_number`, `expense_records.voucher_number`, `subjects_master.code` | `TEXT NOT NULL UNIQUE` |
| `INTEGER` flags | `is_current`, `is_active`, `notified`, `is_read`, `enable_*` | `BOOLEAN NOT NULL DEFAULT <bool>` (mappers update: `r.is_active === 1` → `r.is_active`) |
| `REAL` | `total_amount`, `score`, `gpa`, `weekly_hours` | `DOUBLE PRECISION` or `NUMERIC(12,2)` for money columns (`fee_payments.total_amount/paid_amount/remaining_amount`, `expense_records.amount`) |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `created_at`, `updated_at` | `TIMESTAMPTZ DEFAULT now()` |
| `TEXT` dates | `start_date`, `birth_date`, `due_date`, `day` (ISO `YYYY-MM-DD`) | `DATE` (parse `'YYYY-MM-DD'`); keep `TEXT` if avoiding date-coercion risk |
| `TEXT` times | `start_time`, `end_time` (`'07:30'`) | `TIME` or keep `TEXT` |
| `CHECK(gender IN ('male','female'))` | `students.gender` | identical CHECK (portable) |
| Composite `PRIMARY KEY` | `teacher_subjects`, `teacher_classes`, `parent_students`, `user_linked_students` | identical |
| `UNIQUE(a,b)` | `sections(class_id,name)`, `schedule_periods(section_id,day,period_number)`, `attendance_records(student_id,date,subject_id)`, `certificates(student_id,term,academic_year)` | identical |
| FKs with `ON DELETE CASCADE` / `ON DELETE RESTRICT` / `ON DELETE SET NULL` | throughout | identical (PG enforces by default) |
| Triggers | `trg_users_updated_at`, `trg_book_borrow_insert/return`, `trg_fee_payment_update` | port as PG `BEFORE/AFTER` triggers + `CREATE OR REPLACE FUNCTION` |

### 6.4 Academic tables — detailed target mapping

| SQLite column | PG type | Notes |
|---|---|---|
| `academic_years.id` | `TEXT PRIMARY KEY` | keep |
| `academic_years.code` | `TEXT NOT NULL UNIQUE` | |
| `academic_years.name_ar/name_en/description` | `TEXT` | `description` currently overloaded with status string — **recommend adding dedicated `status` column** during migration (schema change is part of the target design; see Section 13 decision) |
| `academic_years.start_date/end_date` | `DATE` | |
| `academic_years.is_current/is_active/display_order` | `BOOLEAN` / `INTEGER` | mappers updated |
| `academic_years.created_at/updated_at` | `TIMESTAMPTZ` | |
| `academic_terms.academic_year_id` | `TEXT REFERENCES academic_years(id) ON DELETE CASCADE` | |
| `subjects_master.*` | same approach | `grade_level_id` is a plain column (no FK in SQLite) — leave as `TEXT` or add FK if `grade_levels` table is created |
| `academic_calendar_days.day` | `DATE UNIQUE` | ISO date |
| `academic_calendar_days.academic_week/is_instructional` | `INTEGER` / `BOOLEAN` | |
| **New (recommended) columns** | `academic_years.version INTEGER NOT NULL DEFAULT 0`, `academic_years.school_scope_id TEXT`, `academic_years.status TEXT`, `academic_terms.status TEXT` | enable real optimistic concurrency + lossless status |

### 6.5 Indexes

`sqlite-schema.sql:434–467` defines 27 indexes. All are portable 1:1 to PG (`CREATE INDEX …`). No prefix-length or partial-index features used. Note: `students(class_id, section_id)`, `grade_records(student_id, subject_id)`, `fee_payments(student_id, status)`, `attendance_records(student_id, date)`, `schedule_periods(section_id, day, period_number)` are the hot paths.

---

## 7. PostgreSQL Target Architecture

### 7.1 Recommended target layout

```
Screens/Services
   │
   ├─ (legacy screens) → getRealmDB()/saveRealmDB()  →  REPLACED by async repository/query layer
   │
   └─ Repositories (IStudent, ITeacher, IFinancial, IMasterData, IDashboard, IAcademic*)
        │
        ▼
   IDataSource (ASYNC)  ── SQLiteDataSource (kept for parity/tests, wrapped async)
        │
        ▼
   PostgreSQLDataSource (new) ── pg.Pool ── connections via pool.connect()
        │
        ▼
   PostgreSQL (schema applied by a migration runner, seeded idempotently)
```

### 7.2 Interface redesign (the core decision)

Two viable approaches:

- **Option 1 (recommended): make `IDataSource` async.** Change all 10 methods to return Promises (`Promise<T[]>`, `Promise<{changes,lastInsertRowid}>`, `Promise<boolean>`, `transaction(...): Promise<{success,error?}>`). Ripple: every repository method becomes async, every service becomes async, `academicController` handlers become `async`, and ~100 browser call sites must be adapted (the browser DB is either dropped or served via a local adapter). This is the only design that maps cleanly onto `pg`.
- **Option 2: synchronous wrapper over a `pg` connection.** Uses `pg`'s synchronous mode via `libpq`/`pg-sync` — fragile, blocks the event loop, and is not production-viable.

**Verdict: Option 1.** This is a large but mechanical refactor; the repository → `IDataSource` seam is already the intended extension point (`DataSourceFactory.createDataSource` already advertises `'postgresql'`).

### 7.3 PostgreSQL components to build

1. `src/core/datasource/PostgreSQLDataSource.ts` — implements the async `IDataSource` over `pg.Pool`:
   - `query/queryOne` → `pool.query(sql, params)` with `$1` translation.
   - `execute` → `INSERT/UPDATE/DELETE … RETURNING` (or `rowCount`) to synthesize `{ changes, lastInsertRowid }`.
   - `transaction(queries)` → `pool.connect()`, `BEGIN`, run, `COMMIT`, else `ROLLBACK`, always `release()`.
   - `count/exists/begin/commit/rollback` mirror the interface.
   - Placeholder rewriter `?` → `$n` (careful: also rewrites inside string literals — use a tokenizer or force all SQL to use `$n`).
2. `src/core/datasource/DataSourceFactory.ts` — implement the `'postgresql'` branch, reading `DatabaseConfig` (`type/name/host/port/username/password`).
3. `src/core/config/ConfigService.ts` — read DB type/credentials from env (currently hardcoded `type: 'sqlite'`), add `.env` keys (`DATABASE_URL` or discrete host/port/user/pass/db).
4. A migration runner (`scripts/migrate.mjs` or npm script) that applies `migrations/00X_*.sql` in order and records versions in `schema_migrations` — replaces the Vite `?raw` schema inlining used by the current server build.
5. Idempotent seed script ported from `sqlite-seed.sql` (rewrite `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`; `INSERT OR REPLACE` → `ON CONFLICT (id) DO UPDATE`).

### 7.4 What happens to the browser-side SQLite?

- **Recommended:** eliminate the browser DB for the server-backed features. All screens route through the async repository/API layer (academic already does). The `sql.js` engine and `localStorage` persistence become dead code after the migration.
- **Fallback:** keep browser SQLite as an offline cache with a sync layer — adds significant complexity and is out of scope for a first migration.

---

## 8. Data Migration Strategy

Source: export of the current `sql.js` database (either `data/al-salam-server.db` binary or a browser localStorage export). Recommended pipeline:

1. **Extract** — write a one-shot script `scripts/export-sqlite-to-sql.mjs` that opens `data/al-salam-server.db` with `sql.js`, runs `.schema` + `SELECT` per table, and emits ordered SQL. Or use `sqlite3` CLI (`sqlite3 al-salam-server.db .dump`).
2. **Normalize** — a transformation layer that, per table:
   - rewrites `INSERT OR REPLACE/IGNORE` → `ON CONFLICT`,
   - converts `'YYYY-MM-DD'` text to `DATE` (if the PG target uses `DATE`),
   - converts integer booleans to PG booleans,
   - strips SQLite `AUTOINCREMENT`/`INTEGER PRIMARY KEY` specifics (`school_settings.id` is `INTEGER PRIMARY KEY CHECK(id=1)` → PG `BIGINT`/`BOOLEAN`-style guard),
   - removes SQLite triggers (re-add as PG functions/triggers).
3. **Load in FK order** (dependency-first):
   1. `users`, `school_classes`
   2. `teachers`, `parents`
   3. `sections` (FK→`school_classes`, `teachers`)
   4. `students` (FK→`users`, `school_classes`, `sections`, `parents`)
   5. `subjects` (FK→`school_classes`, `teachers`), `subjects_master`, `academic_years`
   6. `schedule_periods`, `academic_terms`, `academic_calendar_days`, `grade_records`, `attendance_records`
   7. `fee_payments`, `expense_records`, `certificates`, `library_books`
   8. `book_borrowings`, `app_notifications`, `audit_logs`, `school_settings`, `saved_reports`
   9. junction tables `teacher_subjects`, `teacher_classes`, `parent_students`, `user_linked_students`
   10. master-data tables from `migrations/001_master_data.sql` + seed, if the module is to be functional.
4. **Validate** — row-count equality per table; spot-check FKs; verify academic aggregates rehydrate (term counts per year); verify fee status/recomputed `remaining_amount`.
5. **Failed rows** — log to a reject table/file; never abort mid-transaction; re-runnable idempotently.
6. **Rollback** — restore from the exported `.sql`/binary snapshot or a `pg_dump` before import.
7. **Seed parity** — port `sqlite-seed.sql` 1:1 so fresh PG installs match fresh SQLite installs (users `u1..u10`, students `s1..s3`, etc.), keeping stable ids.

**Special notes:**
- `school_settings` has `INTEGER PRIMARY KEY CHECK(id = 1)` → migrate as a single-row table.
- `saved_reports.summary_metrics_json` (JSON text) → PG `JSONB` (optional improvement).
- Arabic enum CHECK values must be preserved exactly.

---

## 9. Academic Pilot Migration Plan

Pilot the full stack on the Academic module first — it is the only module already fully decoupled through repositories + UnitOfWork + EventBus, and it already exercises every pattern needed.

### 9.1 Pilot scope (4 aggregates, 4 tables)

`AcademicYear` → `academic_years` + `academic_terms`; `Curriculum` → `subjects_master`; `CourseAssignment` → `subjects`; `AcademicCalendar` → `academic_calendar_days`.

### 9.2 Steps

1. **Async `IDataSource`** (Sections 7.2): convert interface, `SQLiteDataSource`, `DataSourceFactory`; convert `UnitOfWork.register/commit` to async.
2. **`PostgreSQLDataSource`** implementing the async interface.
3. **Convert the 4 academic repositories** to `await dataSource.*`; replace `?`→`$n`; keep `exists()` + INSERT/UPDATE logic; replace `CURRENT_TIMESTAMP` with `now()` or bind timestamps.
4. **Convert services + controller** to async (`AcademicYearService`, `CurriculumService`, `CourseAssignmentService`, `AcademicCalendarService`, `academicController` handlers, `academicRoutes` unchanged).
5. **Schema target** for the 4 tables (Section 6.4) incl. the recommended `version`/`status`/`school_scope_id` columns so optimistic concurrency finally works.
6. **Migration + seed** for the 4 tables; backfill from the SQLite export.
7. **Tests against real PostgreSQL** (Section 10).
8. **Feature-flag**: keep SQLite running via the same async interface; switch `DataSourceFactory` to `'postgresql'` behind env config.

### 9.3 Expected changes (Academic pilot only)

- `src/core/datasource/` (IDataSource, SQLiteDataSource, DataSourceFactory, UnitOfWork)
- `src/modules/academic/infrastructure/repositories/*` (4 files)
- `src/modules/academic/application/services/*` (4 files)
- `src/modules/academic/application/controllers/academicController.ts`
- `src/modules/academic/infrastructure/mappers/*` (4 files — status/version handling)
- new `src/core/datasource/PostgreSQLDataSource.ts`
- `scripts/*` (migrate, seed, PG test runners), `package.json` (`pg` dep)

---

## 10. Testing Strategy (real PostgreSQL)

The current test suite (Section 12 of the audit files) uses `InMemoryDataSource` test doubles or a real `sql.js` instance; there is **no** PostgreSQL coverage anywhere. For a credible PG migration the following tests must run against a **real PostgreSQL** (local Docker `postgres:16` or CI service):

### 10.1 Test tiers

1. **Repository tests (PG)** — extend `academicIntegration.test.ts` pattern: real `PostgreSQLDataSource` + real repos + real `UnitOfWork`/`EventBus`, against an isolated test database/schema created per run.
2. **HTTP E2E (PG)** — extend `verify-academic-http-e2e.ts`: boot Express with `DataSourceFactory.setInstance(new PostgreSQLDataSource(...))`, real fetch, full lifecycle CRUD.
3. **Runtime persistence (PG)** — extend `verify-academic-runtime-persistence.ts`: connect to PG, apply migrations+seed, verify tables/columns, then exercise repos; assert data survives reconnect (new pool).
4. **Transactional behavior** — commit/rollback assertions (unit-of-work success + induced failure).
5. **Constraint tests** — UNIQUE (duplicate `code`), NOT NULL, FK violation (orphan `academic_year_id`), CHECK violations.
6. **Concurrency tests** — two concurrent transactions updating the same year with version checking (asserts optimistic-concurrency column works).
7. **Reconstruction tests** — aggregate rehydration round-trip (year+terms), status inference from new dedicated columns.
8. **Data-migration tests** — export → import → row-count/FK parity assertions.

### 10.2 Infrastructure

- Add `pg` (and optionally `pg-mem` for unit tests only; PG integration stays real).
- Add a test DB provisioner (`scripts/test-pg-setup.mjs`): create `al_salam_test`, apply migrations, truncate between runs.
- Runners mirror the existing `scripts/run-*.mjs` pattern (register asset-loader only if `?raw`/`?url` imports remain; after the engine swap they can be deleted).

### 10.3 Existing coverage that must keep passing

- `verify-di-smoke.ts` (DI resolution, 22 services)
- `verify-academic-smoke.ts`, `verify-academic-api-smoke.ts` (in-memory doubles) — keep as fast unit tier; PG tier added alongside.
- `lint` (`tsc --noEmit`) must pass after the async refactor.

---

## 11. Rollback Strategy

1. **Schema**: `pg_dump` full snapshot before any import; a `migrations/down` convention or documented rollback script to drop the new schema and restore the snapshot.
2. **Data**: original `data/al-salam-server.db` and browser localStorage exports retained (archive path) for the full cutover window.
3. **Code**: `DataSourceFactory` type is config-driven; flipping `ConfigService` back to `sqlite` reverts the runtime without code changes, provided both datasources implement the same async interface and the browser SQLite path is preserved (or a local dev adapter is provided).
4. **Dual-run window**: run SQLite and PG side-by-side for the pilot; the Academic module is feature-flagged so each `POST/PUT/DELETE` can be verified on PG before full cutover.
5. **EventBus**: in-memory only — no durable event backlog to reconcile; a failed commit simply never publishes events (correct behavior is preserved because events are dispatched only after a successful `commit()`).

---

## 12. Security Considerations

- `ConfigService` (`src/core/config/ConfigService.ts`):
  - `loadDatabaseConfig()` **hardcodes** `type: 'sqlite'` — must read env; PG credentials (`DATABASE_URL`, host/port/user/password) must come from `.env`/AI Studio secrets, never committed.
  - Insecure defaults: `jwtSecret: 'al-salam-school-secret-key-change-in-production'` (line 86) and `encryptionKey: 'default-encryption-key-32chars!'` (line 89) must be rotated in any deployment, especially one now holding shared server data.
- `.env.example` currently exposes only `GEMINI_API_KEY` and `APP_URL`; add documented PG vars there (values empty).
- Dynamic table/column names in `masterDataRepository` and `useReferenceData` (from `TABLE_MAP` and hook args) are a **SQL-injection surface** — validate entity types against the map (already mostly constrained) and use parameter binding for all values.
- Secrets in the AI endpoints are read from `process.env.GEMINI_API_KEY` (server-side) — acceptable; do not expose DB creds to the browser bundle.
- Migrations/seed must not embed real credentials.

---

## 13. Risks and Blockers

| # | Risk / Blocker | Class | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Synchronous `IDataSource` vs async PG drivers** | E | Every repo/service/controller/test must become async; ~100 frontend call sites affected if browser DB is removed | Async interface refactor (Section 7.2); do it first, pilot on Academic |
| 2 | **Dual database instances (browser localStorage vs server file)** — never synchronized | E | Data written by SPA screens is invisible to the server PG (and vice versa); a naive migration loses all browser-side data | Decide store consolidation explicitly; migrate server DB, plan browser-data export, or document data loss for demo data |
| 3 | **Master-data module references ~29 non-existent tables** | D/E | Silently empty UI today; migration must decide whether to create+seed these tables | Create tables from `migrations/001_master_data.sql` + seed, or formally deprecate the module |
| 4 | **`querySqlSync`/`runSqlSync` swallow errors** | E | Masks failures; PG must surface and log errors | New datasource throws; update call sites |
| 5 | **Optimistic concurrency not persisted** (`version` hardcoded 0; status in `description`) | D | Concurrent edits silently lost under PG | Add `version`/`status` columns during migration; update mappers |
| 6 | `INSERT OR REPLACE`/`INSERT OR IGNORE` and `changes()`/`last_insert_rowid()` | B | Must be rewritten for PG | `ON CONFLICT` / `RETURNING` mapping (Section 3.1) |
| 7 | `?` positional placeholders everywhere | B | Mechanical but broad | `$n` rewriter with string-literal safety |
| 8 | SQLite triggers (fee/book) | B | Not portable | Port as PG functions/triggers or into service logic |
| 9 | No `pg`, no migration tooling, no PG test harness | C | Greenfield infra | Add dependency + runner + CI test DB |
| 10 | Vite `?raw`/`?url` asset inlining of schema/seed | B | Server bundle embeds SQLite schema text | Replace with migration runner + seed script |
| 11 | Concurrency semantics change (SQLite serial ⇨ PG parallel) | D | Latent races in non-transactional legacy writes | Wrap legacy writes in transactions; add constraint tests |
| 12 | Security defaults (JWT/encryption keys) | B | Production exposure when data moves server-side | Rotate secrets; env-driven config |

**Verdict:** `POSTGRESQL MIGRATION: BLOCKED` — blockers #1 and #2 must be resolved (design decision + async refactor) before implementation can be planned with confidence.

---

## 14. Exact Files Expected to Change (target scope, not yet modified)

**Core (interface & infra):**
- `src/core/datasource/IDataSource.ts` — async signature.
- `src/core/datasource/SQLiteDataSource.ts` — async wrappers (kept for parity/dev).
- `src/core/datasource/DataSourceFactory.ts` — implement `'postgresql'`.
- `src/core/datasource/UnitOfWork.ts` — async register/commit.
- `src/core/config/ConfigService.ts`, `src/core/config/AppConfig.ts` — env-driven DB config.
- New: `src/core/datasource/PostgreSQLDataSource.ts`.

**Repositories (convert to async + `$n` + `ON CONFLICT`/`RETURNING`):**
- `src/modules/students/repository/studentRepository.ts`
- `src/modules/teachers/repository/teacherRepository.ts`
- `src/modules/financial/repository/financialRepository.ts`
- `src/modules/master-data/repository/masterDataRepository.ts`
- `src/modules/dashboard/repository/dashboardRepository.ts`
- `src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository.ts`, `SQLiteCurriculumRepository.ts`, `SQLiteCourseAssignmentRepository.ts`, `SQLiteAcademicCalendarRepository.ts`

**Legacy persistence layer (decide: adapt async or retire):**
- `src/lib/sqlite-engine.ts`, `src/lib/sqlite-repository.ts`, `src/lib/db.ts`
- `src/lib/reference-data/useReferenceData.ts`, `src/lib/reference-data/ReferenceDataProvider.tsx`
- ~100 call sites across `src/screens/*.tsx`, `src/components/*.tsx` that use `getRealmDB`/`saveRealmDB`.

**Application/API:**
- `src/modules/academic/application/services/*.ts`, `use-cases/*.ts`
- `src/modules/academic/application/controllers/academicController.ts`
- `src/modules/academic/infrastructure/mappers/*.ts` (status/version columns)
- `src/core/bootstrap/index.ts` (wiring, DB config)

**Migrations & build:**
- New `migrations/00X_postgresql_*.sql` (port of canonical schema + master-data + academic) and a runner.
- Port `src/lib/sqlite-seed.sql` → idempotent PG seed.
- `scripts/esbuild-asset-loader.mjs`, `scripts/asset-loader.mjs`, `server.ts` build path (drop SQLite asset inlining).
- `package.json` (add `pg`), `.env.example` (PG vars).

**Tests:**
- `src/modules/academic/tests/integration/academicIntegration.test.ts` (async + PG variant)
- `scripts/verify-academic-runtime-persistence.ts`, `verify-academic-http-e2e.ts`, `verify-academic-api-smoke.ts`, `verify-academic-smoke.ts`, `verify-di-smoke.ts`
- New `scripts/run-academic-pg-*.mjs` + `scripts/test-pg-setup.mjs`.

---

## 15. Proposed Implementation Phases

- **Phase 0 — Decisions & foundation:** store consolidation (drop vs. cache browser DB); async `IDataSource`; PG env config; add `pg`; migration runner scaffold.
- **Phase 1 — Async refactor:** `IDataSource` + `SQLiteDataSource` + `UnitOfWork` + all repositories/services/controllers/tests to async; keep behavior identical (SQLite still active). Gate: full test suite + `tsc`.
- **Phase 2 — Academic pilot:** `PostgreSQLDataSource`; 4 academic repos/services/controller; PG schema for the 4 tables (with `version`/`status` columns); migrate+seed; feature flag.
- **Phase 3 — Academic PG tests:** repository/PG, HTTP E2E/PG, runtime persistence/PG, concurrency, constraint tests (Section 10).
- **Phase 4 — Legacy module port:** student/teacher/financial/master-data/dashboard repos to async `PostgreSQLDataSource`; create + seed master-data tables; port legacy screens off `getRealmDB` (or keep via an async adapter).
- **Phase 5 — Data migration & validation:** export → transform → import → parity validation → rollback rehearsal.
- **Phase 6 — Cutover:** flip `DataSourceFactory` to PG; run dual-store briefly; archive SQLite; remove sql.js asset pipeline.

---

## 16. Acceptance Criteria

1. All verify scripts and integration tests pass against **real PostgreSQL** (not only in-memory doubles): DI smoke, academic runtime persistence, academic HTTP E2E, academic integration, plus new PG-only transaction/constraint/concurrency tests.
2. `tsc --noEmit` passes after the async refactor; no `any` leaks in new datasource.
3. Full CRUD + lifecycle works for all 4 Academic aggregates against PG with identical DTO contracts (routes unchanged).
4. AcademicYear optimistic concurrency is enforced via a real persisted `version` column (concurrent update test proves one write wins).
5. Data migration round-trips all 27 canonical tables + master-data tables with equal row counts and FK integrity; seed parity on fresh PG installs.
6. UnitOfWork commit/rollback + EventBus-after-commit semantics verified against PG (success publishes events; failure publishes none).
7. No SQLite-specific SQL remains in production repositories (grep for `INSERT OR REPLACE`, `INSERT OR IGNORE`, `PRAGMA`, `last_insert_rowid`, `changes()` returns zero in `src/modules`, `src/lib` except legacy-parity files).
8. Rollback plan rehearsed (pg_dump restore + config flip-back) with no data loss.
9. Security: DB credentials env-driven, insecure default secrets removed, no dynamic-table SQL injection reachable.
10. READY/executive sign-off with this report updated to `POSTGRESQL MIGRATION: READY FOR IMPLEMENTATION`.

---

## Appendix A — Mandated Audit Area Coverage Matrix

| Mandated area | Where verified | Finding |
|---|---|---|
| Transaction begin/commit/rollback | §3.1, §5, `sqlite-engine.ts:281–324` | SQLite `BEGIN TRANSACTION/COMMIT/ROLLBACK` on single shared instance; PG needs per-connection `BEGIN` via pool |
| Connection lifecycle / pooling | §7.3, §13 (#1, #9) | No pooling exists (sql.js single instance); `pg.Pool` + `pool.connect()`/`release()` required |
| Concurrency | §5, §10.1 (#6), §13 (#11) | SQLite is serial/blocking; PG introduces real concurrency — optimistic locking column added in target schema |
| Generated UUIDs / ids | §3.1, §6.3, §8 | Client-generated `TEXT` ids everywhere (`u1`,`s1`,`sub1`, `generateId()`) — preserved as `TEXT PRIMARY KEY`, no UUID migration needed |
| Timestamps | §3.1, §6.3, §8 | `DATETIME DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMPTZ DEFAULT now()`; `CURRENT_TIMESTAMP` in repo SQL is lossy on round-trip |
| Foreign keys | §6.3, §8 (load order) | FKs with CASCADE/RESTRICT/SET NULL port 1:1; PG enforces by default |
| Unique violations | §3.1, §10.1 (#5) | `INSERT OR IGNORE/REPLACE` masks violations today → `ON CONFLICT`; UNIQUE constraints preserved |
| Optimistic concurrency | §3.2, §6.4, §13 (#5), §16 (#4) | `AcademicYear.version` exists in domain but is hardcoded `0` on rehydrate — `version` column added to target schema |
| EventBus-after-commit | §5, §11 | Events dispatched only after successful `commit()` (`SQLiteAcademicYearRepository.ts:129–133`) — preserved |
| Rollback | §11, §16 (#8) | pg_dump snapshot + config flip-back; UoW auto-rollback on failure |
| Repository reconstruction | §4.2, §10.1 (#7) | `academicYearFromRows` rehydrates aggregate; term children re-read per year (N+1 — note for PG query tuning) |
| Pagination | §3.1 (`LIMIT ? OFFSET ?`, `masterDataRepository:110`), §4.1 | Portable with `$n` placeholders; `MasterDataService` also re-paginates in memory |
| NULL semantics | §3.1, §8 | JS `undefined → null` at repo boundaries; SQLite `NULL`/empty-string leniency must be re-checked per column (e.g. `subjects.name/code` now nullable by design) |
| PostgreSQL parameter binding | §3.1, §7.3 | `?` → `$n` rewriter required; string-literal-safe implementation mandatory |

---

*End of audit. No production code, schema, data, or configuration was modified during this audit.*
