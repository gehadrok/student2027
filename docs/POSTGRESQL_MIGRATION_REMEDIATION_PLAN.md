# PostgreSQL Migration — Remediation Plan

> **Scope:** READ-ONLY remediation plan. This document is an exact implementation
> roadmap for the 5 blockers identified in
> [`docs/POSTGRESQL_MIGRATION_AUDIT.md`](./POSTGRESQL_MIGRATION_AUDIT.md).
> **Nothing in this document has been implemented.** No production code, SQL,
> schema, migration, UI, test, package configuration, or PostgreSQL
> configuration has been modified to produce it. Every proposed change below
> names the exact existing file/module it targets. No business rules or schema
> have been invented — everything is derived from the existing repository.
>
> **Deliverable status:** `docs/POSTGRESQL_MIGRATION_AUDIT.md` (completed input)
> + this plan. `POSTGRESQL_MIGRATION_READINESS_AUDIT.md` was NOT created.

---

## 1. Executive Summary

The application (`F:\student2027`) cannot be migrated to PostgreSQL until five
architectural blockers are removed. They are independent enough to be
remediated in sequence but share one root cause: **the system was built as a
single-machine SPA that owns a browser-resident SQLite database, with a
separate, never-synchronized server-side SQLite file**, and a persistence layer
that is (a) fully synchronous, (b) bypassed by many screens, and (c) running
against a runtime SQLite schema that is missing ~30 of the 33 master-data
tables it claims to manage.

The five blockers, in remediation order:

| # | Blocker | Headline |
|---|---------|----------|
| 1 | Sync `IDataSource` | Entire persistence stack is synchronous (`IDataSource`, `SQLiteDataSource`, repositories, services, use cases, controllers, tests, DI). |
| 2 | Dual DB instances | Browser `sql.js` DB (`getRealmDB()/saveRealmDB()` in `src/lib/db.ts`) vs server `data/al-salam-server.db` (REST-only) — never synchronized. |
| 3 | Master-data runtime schema gap | `masterDataRepository.TABLE_MAP` (33 entries) references ~30 tables that exist only in `migrations/001_master_data.sql`, which is never executed at runtime (`querySqlSync` swallows errors → silent empty UIs). |
| 4 | AcademicYear version gap | `academicYearFromRows` hardcodes `version = 0`; schema has no `version` column; no optimistic concurrency in the repo contract. |
| 5 | AcademicYear status gap | Status is lossily represented via `description` + `is_active` + `is_current`; no first-class status column or status history. |

**Target architecture** (single canonical data path, after remediation):

```
Frontend SPA (no authoritative business-data copy)
   │  HTTP only (REST)
   ▼
REST API (server.ts, Express) ── Application services ── Use Cases
   ▼
Domain repositories (interfaces, async) ── PostgreSQL DataSource
   ▼
PostgreSQL (single source of truth)
```

Browser state must be reduced to a session/auth cache (current user), never an
authoritative business-data store. SQLite is retained only as a temporary,
server-side fallback DataSource during the transition; the browser-resident
`sql.js` database must be decommissioned.

---

## 2. Blocker Inventory

The five blockers and where each is anchored in the repository:

1. **Sync `IDataSource`** — `src/core/datasource/IDataSource.ts` (10 sync
   methods), `src/core/datasource/SQLiteDataSource.ts`,
   `src/core/datasource/DataSourceFactory.ts` (`'postgresql'`/`'restapi'`
   implementations are commented out),
   `src/core/datasource/UnitOfWork.ts`, all domain repositories
   (`IMasterDataRepository`, `IAcademicYearRepository`, etc.),
   `src/core/bootstrap/index.ts` (DI), `server.ts` controllers, and all tests
   (`scripts/run-*.mjs`, `verify-*.mjs`).
2. **Dual DB instances** — `src/lib/db.ts` (`getRealmDB`, `saveRealmDB`,
   `subscribeRealmDB`, `addAuditLog`, `addSavedReportLog`,
   `deleteSavedReportLog`, `getCurrentUser`, `setCurrentUser`),
   `src/lib/sqlite-engine.ts`, `src/lib/sqlite-repository.ts`, the 28 screen
   files + 10 component files listed in §6, and server-side
   `data/al-salam-server.db` used by the REST API (`server.ts`).
3. **Master-data runtime schema gap** — `src/modules/master-data/repository/masterDataRepository.ts`
   (`TABLE_MAP`, 33 entries), `src/lib/sqlite-schema.sql` (runtime, 27 tables,
   only 3 of the 33 exist), `migrations/001_master_data.sql` (35 tables, never
   executed), `src/lib/sqlite-engine.ts` `querySqlSync`/`runSqlSync` (return
   `[]`/`void` on error).
4. **AcademicYear version gap** — `src/modules/academic/domain/aggregates/AcademicYear.ts`
   (version getter at lines 115–117, `touch()` at 251–255, create sets
   `version = 0`), `src/modules/academic/infrastructure/mappers/academicYearMapper.ts`
   (`academicYearFromRows` hardcodes `version = 0` at line 101;
   `academicYearToRows` never writes version),
   `src/modules/academic/domain/repositories/IAcademicYearRepository.ts`
   (`save(year)` has **no** `expectedVersion` parameter).
5. **AcademicYear status gap** — same mapper (`description: year.status`,
   `is_current: status==='active'`, `is_active: status==='archived'`; reverse
   via `inferYearStatus`), plus the aggregate's `AcademicYearStatusHistory`
   (in-memory only) and all dependents in §11.

**Overlap note:** Blockers 1 and 2 must be resolved as one effort — making the
persistence layer async and routing the frontend through the REST API are the
two halves of the same architectural change. Blockers 4 and 5 are both
"academic aggregate persistence fidelity" gaps and share the mapper/repository
files.

---

## 3. Async Persistence Redesign

### 3.1 Current synchronous chain

```
IDataSource (sync)          src/core/datasource/IDataSource.ts
  query<T>(...): T[]
  queryOne<T>(...): T | null
  execute(...): { changes; lastInsertRowid }
  transaction(queries): { success; error? }
  prepare(sql): { run; free }
  count(...): number
  exists(...): boolean
  beginTransaction/commit/rollback: void
      │
      ▼
SQLiteDataSource            src/core/datasource/SQLiteDataSource.ts
      │  execute uses: SELECT changes() as cnt, last_insert_rowid() as id
      ▼
Domain repositories         e.g. IMasterDataRepository (src/core/repositories/IMasterDataRepository.ts),
                            IAcademicYearRepository (src/modules/academic/domain/repositories/...)
      │
      ▼
Services / use cases        e.g. src/modules/master-data/services/masterDataService.ts,
                            src/modules/academic/application/services/AcademicYearService.ts
      │
      ▼
Controllers                 e.g. src/modules/academic/application/controllers/academicController.ts
                            (all sync handlers)
      │
      ▼
Tests                       scripts/run-*.mjs, verify-*.mjs, InMemoryDataSource
                            implementations in test helpers
```

### 3.2 Minimum safe async architecture

**Step 3.2.1 — Define the async `IDataSource` contract (the foundation).**
Every method becomes Promise-based. This is a single, isolated change to one
interface file and is the only way to avoid partial-async conversion traps:

```ts
// Proposed target shape (exact change to src/core/datasource/IDataSource.ts)
export interface IDataSource {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }>;
  transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<{ success: boolean; error?: string }>;
  prepare(sql: string): { run: (params?: any[]) => Promise<void>; free: () => void };
  count(sql: string, params?: any[]): Promise<number>;
  exists(sql: string, params?: any[]): Promise<boolean>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
```

**Step 3.2.2 — Update `SQLiteDataSource`** (`src/core/datasource/SQLiteDataSource.ts`)
to implement the async contract (wrap the synchronous sql.js calls in Promises).
No behaviour change for SQLite beyond the return type; this keeps SQLite as a
temporary fallback while PostgreSQL is introduced.

**Step 3.2.3 — Update `DataSourceFactory`** (`src/core/datasource/DataSourceFactory.ts`)
to uncomment/wire the `'postgresql'` implementation and keep `'sqlite'` behind
the same `ConfigService`-driven switch.

**Step 3.2.4 — Update `UnitOfWork`** (`src/core/datasource/UnitOfWork.ts`):
`register()` stays sync (just accumulates), `commit()` becomes async
(`await dataSource.transaction(queries)`).

**Step 3.2.5 — Repositories become async.** Each repository method that calls a
sync `IDataSource` method becomes `async` and `await`s. This propagates to
interfaces (`IMasterDataRepository`, `IAcademicYearRepository`, the 3 other
academic repo interfaces) and their implementations
(`SQLiteAcademicYearRepository`, `MasterDataRepository`,
`SQLiteCurriculumRepository`, `SQLiteCourseAssignmentRepository`,
`SQLiteAcademicCalendarRepository`).

**Step 3.2.6 — Services/use cases become async.** e.g.
`src/modules/master-data/services/masterDataService.ts` (all public methods),
`src/modules/academic/application/services/AcademicYearService.ts`,
`src/modules/academic/application/use-cases/AcademicYearUseCases.ts`
(notably the `createWithTerms` per-term loop), curriculum/assignment/calendar
use cases.

**Step 3.2.7 — Controllers.** Verify each controller handler in
`src/modules/academic/application/controllers/academicController.ts`; Express
already supports async handlers via `async (req, res) => ...` plus a try/catch
(no Express 5 requirement). Confirm whether any handler already awaits (they
currently do not — all synchronous).

**Step 3.2.8 — EventBus.** `src/core/events/EventBus.ts` is an in-memory
singleton and events are already dispatched **after** a successful
`unitOfWork.commit()` (`SQLiteAcademicYearRepository.ts:129–133`). Events
themselves do not need to become async; only the dispatch call sites that sit
after an async `commit()` need to be inside the async flow. Keep `publish`
sync, keep the `EventBus.getInstance()` singleton.

**Step 3.2.9 — Tests.** Audit `scripts/run-*.mjs` and `verify-*.mjs` plus any
`InMemoryDataSource` test helpers: add `async` and `await` where they call the
async contract; the `InMemoryDataSource` classes must be updated to return
`Promise`s. No new test framework exists in `package.json`, so tests stay in
the existing `.mjs`/verify-script style.

**Step 3.2.10 — DI.** `src/core/bootstrap/index.ts` wires the singletons;
constructor-based DI (already used) means the wiring file mostly needs `await`
at startup (`bootstrap()` becomes async) and the async repository instances
must be constructed before controllers start serving.

### 3.3 Decision required (no invention)

Do NOT invent a mixed sync/async bridge (e.g. a `deasync` shim). The audit and
this plan assume **full async conversion**, not a polyfill. Any shim would be a
new runtime dependency and a new correctness risk.

---

## 4. Repository Impact Matrix

| Repository (interface → implementation) | File(s) | Async methods to convert | Notes |
|---|---|---|---|
| `IDataSource` → `SQLiteDataSource` | `src/core/datasource/IDataSource.ts`, `SQLiteDataSource.ts` | all 10 methods | foundation of every repo below |
| `IMasterDataRepository` → `MasterDataRepository` | `src/core/repositories/IMasterDataRepository.ts`, `src/modules/master-data/repository/masterDataRepository.ts` | getAll, getAllFlat, getById, isFieldUnique, create, update, delete, bulkDelete, getParentRecords, getFieldOptions, logAudit, getAuditLogs, generateNextNumber, getPermission | also touches `system_numbering` + `master_data_audit_log` + `master_data_permissions` tables (§9) |
| `IAcademicYearRepository` → `SQLiteAcademicYearRepository` | `src/modules/academic/domain/repositories/IAcademicYearRepository.ts`, `.../infrastructure/repositories/SQLiteAcademicYearRepository.ts` | save, findById, findByCode, getAll, delete | save already dispatches events post-commit |
| `ICurriculumRepository` → `SQLiteCurriculumRepository` | `src/modules/academic/domain/repositories/ICurriculumRepository.ts`, `.../SQLiteCurriculumRepository.ts` | all (uses `subjects_master`) | |
| `ICourseAssignmentRepository` → `SQLiteCourseAssignmentRepository` | `.../ICourseAssignmentRepository.ts`, `.../SQLiteCourseAssignmentRepository.ts` | all | |
| `IAcademicCalendarRepository` → `SQLiteAcademicCalendarRepository` | `.../IAcademicCalendarRepository.ts`, `.../SQLiteAcademicCalendarRepository.ts` | all | uses `academic_calendar_days` |
| Academic service layer | `src/modules/academic/application/services/*.ts`, `.../use-cases/AcademicYearUseCases.ts` | all methods that call repos | `createWithTerms` loops terms |
| Academic controller | `src/modules/academic/application/controllers/academicController.ts` | all handlers | Express async |
| Master-data service | `src/modules/master-data/services/masterDataService.ts` | getPaginated, getAll, getById, create, update, delete, bulkDelete, importData, exportData, logAudit, getAuditLogs | calls `masterDataRepository` |
| Student aggregate skeleton | `src/modules/student/domain/aggregates/Student.ts`, `src/modules/student/infrastructure/repositories/StudentRepository.ts` | already async: `findById`, `findByStudentNumber`, `save(_student, _expectedVersion): Promise<void>`, `exists` | **precedent** for Blocker 4 contract (§10) |

> **UnitOfWork consumers** (`src/core/datasource/UnitOfWork.ts`):
> `SQLiteAcademicYearRepository` (save), `MasterDataRepository` (bulkDelete).
> All other repos call `execute`/`query` directly. See §5.

---

## 5. UnitOfWork Impact

`UnitOfWork` (`src/core/datasource/UnitOfWork.ts`) batches queries and calls
`dataSource.transaction(queries)` (auto-commit/rollback).

**Exact changes:**
1. `register(sql, params)` — unchanged (sync accumulator).
2. `commit()` — becomes `async commit(): Promise<{ success: boolean; error?: string }>`
   that `await dataSource.transaction(queries)` and resets the queue.
3. `rollback()`/`clear()` — unchanged or async-void as convenient.
4. Constructor stays `new UnitOfWork(dataSource)` (already DI-based).

**Impact on callers:**
- `SQLiteAcademicYearRepository.save()` (line 120–123): `unitOfWork.commit()`
  becomes `await`, and the post-commit event dispatch (lines 129–133) moves
  inside the async method.
- `MasterDataRepository.bulkDelete()` (line 251): `await
  dataSource.transaction(queries)`.

No transaction semantics change: SQLite `transaction()` still auto-commits on
success and rolls back on failure; PostgreSQL `transaction()` will use
`BEGIN/COMMIT/ROLLBACK`.

---

## 6. Dual Database Analysis

### 6.1 The two databases

| Aspect | Browser DB | Server DB |
|---|---|---|
| Engine | `sql.js` (WASM) persisted to `localStorage` | SQLite file `data/al-salam-server.db` |
| Access | `getRealmDB()` / `saveRealmDB()` via `src/lib/db.ts` | REST API (`server.ts`), only the Academic module uses it |
| Role today | Authoritative for legacy screens (students, teachers, classes, grades, attendance, finance, library, …) | Authoritative for the Academic module only |
| Sync | **Never** | **Never** |
| Result | Two divergent copies of school data | |

### 6.2 Full frontend inventory (files that read/write the browser DB)

`src/lib/db.ts` is the single import point. Its used exports are:
`getRealmDB`, `saveRealmDB`, `subscribeRealmDB`, `addAuditLog`,
`addSavedReportLog`, `deleteSavedReportLog`, `getCurrentUser`,
`setCurrentUser`.

Screens (`src/screens/*.tsx`) — 28 files:
`AdminDashboard`, `AIInsightsScreen`, `AttendanceScreen` (8 refs),
`CalendarScreen`, `CertificatesScreen`, `ClassesScreen` (11 refs),
`DocumentCenterScreen`, `FinancialScreen` (9 refs), `GradesScreen` (10 refs),
`LibraryScreen` (27 refs), `ParentDashboard`, `ReportsScreen`,
`SettingsScreen`, `StudentDashboard`, `StudentsScreen`, `SubjectsScreen`,
`TeacherDashboard`, `TeachersScreen`, `TimetableScreen`.

Components (`src/components/*.tsx`) — 10 files:
`AIChatAssistant`, `GlobalSearchBar`, `LoginScreen`,
`NotificationCenter` (8 refs), `ReportPreviewModal`,
`StudentProfileDashboard`, `SwitchUserModal`, `TeacherProfileDashboard`,
`UnifiedPrintLayout`.

Plus `src/App.tsx` (1 comment-only reference; already cleaned of `db` state).

**`getCurrentUser`/`setCurrentUser`** (`src/lib/db.ts`) are auth-session
helpers used by `src/App.tsx:7,44,62,69,76,152` — these are acceptable to keep
as a browser **session cache only**, and must not be treated as a data store.

**The four legacy repositories** (`src/modules/dashboard`, `financial`,
`students`, `teachers` …) mention `getRealmDB` only inside
"Violation fixed" comments — they already route through services/repositories.
The remaining direct `getRealmDB`/`saveRealmDB` calls in the 38 screen/component
files above are the migration surface for §8.

### 6.3 The migration target

1. Decommission browser DB reads for **business data**. No screen should hold a
   mutable authoritative copy of students/teachers/classes/grades/fees/library
   data in `localStorage`/`sql.js`.
2. All reads/writes flow to the REST API, which owns the Application →
   Repository → PostgreSQL path.
3. Keep `getRealmDB`/`saveRealmDB` available only inside a thin compatibility
   shim during the transition (if at all); remove them once every screen has a
   repository-backed path.
4. `data/al-salam-server.db` (REST-only SQLite) becomes the **temporary**
   server-side fallback DB; PostgreSQL replaces it.
5. **Do NOT change the UI** in this remediation. The plan is to change the data
   access layer under the existing screens. (A future UI refactor is out of
   scope; the requirement explicitly forbids modifying the UI now.)

---

## 7. Canonical Data Ownership Model

After remediation, data ownership is:

| Data domain | Owning layer | Access path |
|---|---|---|
| Legacy school data (students, teachers, classes, grades, attendance, finance, library, reports, certificates, documents, calendar) | Server repositories | Screen → REST → service → repository → PostgreSQL |
| Academic module (academic years, terms, curriculum/subjects, course assignments, calendar days) | Server academic repositories (already REST-first) | Screen → REST controller → service → use case → repository → PostgreSQL |
| Master data (33 entities, §9) | Server master-data service | Screen → service → repository → PostgreSQL |
| Auth session | Browser cache only (`getCurrentUser`/`setCurrentUser`) | SPA keeps current user id/token in `localStorage` for session continuity |
| Audit logs (`addAuditLog`, `addSavedReportLog`) | Server audit repository | Screen → REST → server audit log table |

Rules:
- **No browser-writable business tables.** `saveRealmDB` is eliminated as a
  business persistence path.
- **One write path per aggregate.** AcademicYear is the pilot: aggregate →
  repo → UnitOfWork → DataSource. All other domains converge on this pattern.
- **No `querySqlSync`/`runSqlSync` direct imports in feature code.** Currently
  `ReferenceDataProvider` and `useReferenceData` import `querySqlSync` directly
  (`src/lib/reference-data/ReferenceDataProvider.tsx:10`,
  `src/lib/reference-data/useReferenceData.ts:10`) — these must be routed
  through the master-data service (async) instead.

---

## 8. Frontend Persistence Migration

This section is the **data-access-layer plan** (not UI changes) for the 38
frontend files in §6.2.

**Phase 8.1 — Inventory & shim.** Enumerate every
`getRealmDB()/saveRealmDB()/querySqlSync()` call site in the 38 files. Replace
each direct DB call with a repository/service call:
- Reads → a `read` service method (async) per domain.
- Writes → a `write` service method (async).
- `subscribeRealmDB` → a repository change-notification subscription (already
  partially modeled by `invalidateEntityCaches` in
  `src/lib/reference-data/referenceDataCache.ts`).

**Phase 8.2 — Audit & report logs.**
`addAuditLog`, `addSavedReportLog`, `deleteSavedReportLog` currently write to
the browser DB (`audit_logs`, `saved_reports`). Route them to REST endpoints on
`server.ts` that write to the server-side audit/report repositories.

**Phase 8.3 — Reference data.** Convert `ReferenceDataProvider` and
`useReferenceData` (`src/lib/reference-data/*`) from `querySqlSync` to the
async master-data service, removing the two direct `sqlite-engine` imports.

**Phase 8.4 — Master Data Center.** `MasterDataCenter.tsx` and
`useMasterData.ts`/`useMasterDataLookup.ts` already call
`masterDataService` (sync). After §3/§4, these become async calls; the 80 ms
`setTimeout` in `useMasterData.fetchData` (`src/modules/master-data/hooks/useMasterData.ts:44`)
is replaced by awaiting the real async result.

**Phase 8.5 — Decommission.** Remove `getRealmDB`/`saveRealmDB`/`querySqlSync`
business usage from the 38 files; delete the `sql.js`-based browser DB path
once no screen references it. `src/lib/sqlite-engine.ts` and
`src/lib/sqlite-repository.ts` become server-side-only (used by the temporary
SQLite DataSource), or are removed.

---

## 9. Master Data Runtime Schema Gap

### 9.1 Ground truth

- Runtime schema `src/lib/sqlite-schema.sql` — **27 tables**. Only **3** of the
  master-data `TABLE_MAP` tables exist at runtime:
  `academic_years`, `academic_terms`, `subjects_master`.
- `src/modules/master-data/repository/masterDataRepository.ts` `TABLE_MAP` —
  **33 entries**.
- `migrations/001_master_data.sql` — **35 tables** (the 33 + `master_data_audit_log`
  + `master_data_permissions`). **Never executed at runtime.**
- `src/lib/sqlite-engine.ts` `querySqlSync` returns `[]` on error, `runSqlSync`
  returns `void` on error → every query against a missing table silently yields
  empty results.

**Missing at runtime: 30 of 33.** These 30 exist only in
`migrations/001_master_data.sql`:

`education_stages, grade_levels, sections_master, exam_types,
certificate_types, attendance_types, leave_types, academic_statuses,
nationalities, countries, governorates, districts, cities, identity_types,
employee_types, qualifications, specializations, job_titles, departments,
buildings, rooms, laboratories, libraries, fee_categories, payment_methods,
discount_types, currencies, system_numbering, school_branches, document_types`.

**Additionally referenced at runtime but missing:** `master_data_audit_log`
(queried by `logAudit`/`getAuditLogs` in `masterDataRepository.ts:290–336`,
displayed by the MasterDataCenter audit modal) and `master_data_permissions`
(queried by `getPermission`, `masterDataRepository.ts:358–373`).

**Dangling (referenced by code, exist nowhere):** `class_rooms`
(`ReferenceDataProvider.tsx:49` prewarm + `useClassRooms`), `book_categories`
(`useBookCategories`), `payment_statuses` (`usePaymentStatuses`) — these are in
`useReferenceData.ts` hooks and prewarm list but are NOT in `TABLE_MAP`, NOT in
any migration, NOT in the runtime schema. No screen currently consumes the
reference-data hooks (only `src/App.tsx:38,201` mounts `ReferenceDataProvider`).

### 9.2 Per-table classification (A / B / C / D / E)

Legend:
- **A** — Required by existing production screens (Master Data Center is
  reachable: `src/App.tsx:35,136–137` renders `<MasterDataCenter />` for route
  `'master-data'`, sidebar entry `src/components/Sidebar.tsx:45`; `useMasterData`
  + `masterDataService` drive the CRUD UI; `ReferenceDataProvider` prewarms
  these on app mount).
- **B** — Required by the Academic module.
- **C** — Required by the Student module.
- **D** — Unused / legacy / dangling references.
- **E** — Ambiguous.

| Table | Class | Evidence |
|---|---|---|
| `education_stages` | **A** | Prewarm (`ReferenceDataProvider.tsx:48`), `MASTER_DATA_CATEGORIES`, parent of `grade_levels` (`utils/index.ts:141`). |
| `grade_levels` | **A** | Prewarm, categories, parent of `sections_master`/`subjects_master`; curriculum filters `subjects_master.grade_level_id`. |
| `sections_master` | **A** | Categories + `getParentConfig` (`utils/index.ts:142`). |
| `subjects_master` | **B** (exists at runtime) | Academic curriculum repo (`SQLiteCurriculumRepository.ts`). Already in runtime schema — not missing. |
| `exam_types` | **A** | Prewarm, categories, `useExamTypes`. |
| `certificate_types` | **A** | Prewarm, categories, `useCertificateTypes`. |
| `attendance_types` | **A** | Prewarm, categories, `useAttendanceTypes`. |
| `leave_types` | **A** | Prewarm, categories, `useLeaveTypes`. |
| `academic_statuses` | **A** | Prewarm, categories, `useStatusLookup`. |
| `nationalities` | **A** | Prewarm, categories, parent of `countries`. |
| `countries` | **A** | Prewarm, categories, parent of `governorates`. |
| `governorates` | **A** | Prewarm, categories, parent of `districts`/`cities`. |
| `districts` | **A** | Prewarm, categories. |
| `cities` | **A** | Prewarm, categories. |
| `identity_types` | **A** | Prewarm, categories, `useIdentityTypes`. |
| `employee_types` | **A** | Prewarm, categories, parent of `job_titles`. |
| `qualifications` | **A** | Prewarm, categories, `useQualifications`. |
| `specializations` | **A** | Prewarm, categories, `useSpecializations`. |
| `job_titles` | **A** | Prewarm, categories, `getParentConfig`. |
| `departments` | **A** | Prewarm, categories, self-parent (`parent_department_id`). |
| `buildings` | **A** | Categories, parent of `rooms`/`laboratories`/`libraries` (`getChildRelations`). |
| `rooms` | **A** | Categories, `getParentConfig` (`building_id`), `ROOM_TYPE_LABELS`. |
| `laboratories` | **A** | Categories, `LAB_TYPE_LABELS`. |
| `libraries` | **A** | Categories. |
| `fee_categories` | **A** | Prewarm, categories, `useFeeCategories`, self-parent (`parent_category_id`). |
| `payment_methods` | **A** | Prewarm, categories, `usePaymentMethods`. |
| `discount_types` | **A** | Categories. |
| `currencies` | **A** | Categories. |
| `system_numbering` | **A** | Categories + `generateNextNumber` (`masterDataRepository.ts:338`). |
| `school_branches` | **A** | Categories. |
| `document_types` | **A** | Categories + `useDocumentTypes`. |
| `master_data_audit_log` | **A** | Audit modal calls `masterDataService.getAuditLogs` (`MasterDataCenter.tsx:727`); written by `logAudit`. |
| `master_data_permissions` | **E** | `getPermission` defined + implemented but **no caller anywhere** (`grep` confirmed). |
| `class_rooms` | **D** | Prewarm + `useClassRooms` only; exists in **no** schema/migration. |
| `book_categories` | **D** | `useBookCategories` only; exists nowhere. |
| `payment_statuses` | **D** | `usePaymentStatuses` only; exists nowhere. |

**Student module (C):** no master-data tables are required by the Student
module (skeleton has no DB access). No **C** rows.

### 9.3 Remediation rules (do NOT auto-execute migrations)

1. **Do not** change `src/lib/sqlite-schema.sql` and **do not** auto-run
   `migrations/001_master_data.sql` from application code.
2. Instead, make the migration **explicit and versioned**: introduce a proper
   migration runner that executes `001_master_data.sql` (and 002/003) against
   the **server-side** database during bootstrap/startup, with idempotency
   checks, so the tables exist before any repository runs. This is the same
   mechanism the PostgreSQL tier will use.
3. Master-data tables become owned by the server DB; the browser never creates
   them.
4. Decision needed (§15): whether the 30 missing tables are seeded with the
   reference rows from `migrations/001_master_data.sql` (the file contains
   INSERT data) or left empty for user entry.

---

## 10. AcademicYear Version Gap

### 10.1 Lifecycle trace (where version is created / persisted / read / reconstructed)

1. **Created:** `AcademicYear.create` sets `version = 0`
   (`src/modules/academic/domain/aggregates/AcademicYear.ts:86`).
2. **Mutated:** every mutating method calls `private touch(changedAt)` which
   does `this._version += 1` (`AcademicYear.ts:251–255`); events are emitted
   with `this.version`.
3. **Persisted:** `academicYearToRows` (`academicYearMapper.ts:51–83`) writes
   `id, code, name_ar, name_en, description, start_date, end_date, is_current,
   is_active, display_order` — **version is never written**; the `academic_years`
   table has no `version` column.
4. **Reconstructed:** `academicYearFromRows` (`academicYearMapper.ts:100–101`)
   hardcodes `const version = 0;` then passes it to `AcademicYear.rehydrate`
   (which accepts `snapshot.version`).
5. **Contract:** `IAcademicYearRepository.save(year)` has **no**
   `expectedVersion` parameter (`IAcademicYearRepository.ts:14`). There is no
   optimistic concurrency in the academic repo contract.

### 10.2 Gap summary

- Version exists in the domain model but is **not durable** and **not checked**.
- After any write-then-read round trip, every aggregate is `version = 0`, so
  concurrent edits cannot be detected.

### 10.3 Remediation

1. **Add a `version` column** to `academic_years` (and the future
   `academic_terms` if term-level versioning is desired — decision in §15;
   today only the year aggregate carries a version).
2. `academicYearToRows` writes `year.version`; `academicYearFromRows` reads the
   column instead of `0`.
3. Change the contract to the **Student-module precedent** — already async and
   optimistic-ready:
   `save(year: AcademicYear, expectedVersion?: number): Promise<void>` with a
   guarded UPDATE `... WHERE id = ? AND version = ?`, throwing a concurrency
   error when `changes === 0`. (`StudentRepository.ts` already declares
   `save(_student, _expectedVersion: number): Promise<void>`.)
4. Decide the semantics of "no expectedVersion supplied" (blind save vs.
   read-verify) in §15.
5. **Do not invent** a concurrency policy beyond the existing aggregate
   version increment + the student-module signature.

---

## 11. AcademicYear Status Gap

### 11.1 Current representation (lossy)

- Domain status: `'draft' | 'approved' | 'active' | 'closed' | 'archived'`
  (`AcademicYear` aggregate) and term status
  `'planned' | 'open' | 'locked' | 'closed'`.
- Persisted via **3 lossy flags/strings**:
  - `description = year.status` (`academicYearMapper.ts:60`) — status smuggled
    into a free-text description column.
  - `is_current = year.status === 'active' ? 1 : 0` (`:63`).
  - `is_active = year.status === 'archived' ? 0 : 1` (`:64`).
- Reconstructed via `inferYearStatus` (`academicYearMapper.ts:129–135`):
  `is_active===0 → archived`; `is_current===1 → active`;
  `description==='approved' → approved`; `description==='closed' → closed`;
  else `draft`.
- `AcademicYearStatusHistory` exists **in memory only** — status transitions are
  never persisted.

### 11.2 Dependents (readers/writers of the status representation)

- `src/modules/academic/infrastructure/mappers/academicYearMapper.ts` — both
  directions (writer + reader).
- `src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository.ts` —
  persistence via `academicYearToRows`, reconstruction via `academicYearFromRows`.
- `src/modules/academic/domain/aggregates/AcademicYear.ts` — status enum +
  transitions (`activate`, `approve`, `close`, `archive`, `reopenDraft`, …),
  `rejectTerminalMutation`.
- `src/modules/academic/application/services/AcademicYearService.ts` and
  `.../use-cases/AcademicYearUseCases.ts` — status-changing use cases.
- `src/modules/academic/application/controllers/academicController.ts` — sync
  handlers expose status to the Academic REST API.
- `src/modules/academic/presentation/screens/AcademicYearsScreen.tsx` +
  `components/StatusBadge.tsx` — render status labels (UI must NOT be changed
  by this remediation, but the API payload they consume is).
- Master Data Center (`MasterDataCenter.tsx` + `getEntityFields`
  `academic_years`/`academic_terms` rows) — edits `is_current`/`is_active` via
  the generic master-data CRUD, which is a **second writer** of the same
  columns and can conflict with the Academic module's status transitions.

### 11.3 Remediation

1. Add a first-class `status` column (`VARCHAR` CHECK-constrained to the 5 year
   / 4 term values, or a `status` FK to `academic_statuses`) to
   `academic_years`/`academic_terms`.
2. `academicYearToRows`/`academicYearFromRows` read/write the real status
   column; keep `description` for actual descriptions; derive `is_current` /
   `is_active` as presentation projections (or keep as denormalized helpers for
   legacy screens).
3. **Single writer rule:** status transitions flow only through
   `AcademicYear` aggregate methods → academic service → repo. The generic
   master-data CRUD must stop being a second writer of status columns for
   academic aggregates (route through the Academic service instead).
4. **Do not invent a new status model.** The 5/4 status values above already
   exist in the aggregate and the mapper's inference logic.

---

## 12. Proposed Remediation Sequence

Ordered so each step unblocks the next with minimal rework:

1. **Async contract** — convert `IDataSource` + `SQLiteDataSource` +
   `DataSourceFactory` + `UnitOfWork` to async (§3.2.1–3.2.4).
2. **Async repositories & services** — convert `MasterDataRepository`,
   academic repos, master-data service, academic services/use cases (§3.2.5–
   3.2.6, §4).
3. **Async controllers + tests + DI** — convert academic controller handlers,
   test scripts / `InMemoryDataSource`, `bootstrap` startup (§3.2.7–3.2.10).
4. **Explicit migration runner** — execute `001_master_data.sql` (and 002/003)
   on the server DB at startup with idempotency, before any repository runs
   (§9.3). Unblocks the empty master-data UI.
5. **Master-data ownership** — convert `ReferenceDataProvider` /
   `useReferenceData` off `querySqlSync`; route through async master-data
   service; resolve the 3 dangling refs (`class_rooms`, `book_categories`,
   `payment_statuses`) — add to migrations or delete the hooks (§8.3, §9.2 D).
6. **Academic status + version columns** — schema change + mapper + repo +
   contract (`save(year, expectedVersion?)`) (§10, §11).
7. **Frontend decommission of browser DB** — replace `getRealmDB`/
   `saveRealmDB`/`querySqlSync` business usage in the 38 files with async
   service calls (§8.1–8.2); keep auth session cache only.
8. **PostgreSQL DataSource** — add `PostgreSQLDataSource` behind
   `DataSourceFactory` (uncomment `'postgresql'`); config via `ConfigService`
   `type: 'postgresql'` (§3.2.3, §13).
9. **Acceptance** — run the migration readiness checklist (§17).

> **Not in scope (do NOT implement):** Academic Item 2, Phase 6.3, Phase 7.
> No migrations are executed, no PostgreSQL database is created, and no
> production files are modified by this remediation plan document itself.

---

## 13. Files Expected to Change

(Exact files; all exist in the repo today.)

**Core persistence**
- `src/core/datasource/IDataSource.ts` — async contract.
- `src/core/datasource/SQLiteDataSource.ts` — async impl.
- `src/core/datasource/DataSourceFactory.ts` — enable `'postgresql'`.
- `src/core/datasource/UnitOfWork.ts` — async `commit()`.
- `src/core/config/ConfigService.ts`, `src/core/config/AppConfig.ts` — allow
  `DBConfig.type = 'postgresql'` (currently hardcoded `'sqlite'`).
- `src/core/bootstrap/index.ts` — async startup / DI wiring.
- `src/core/events/EventBus.ts` — unchanged (dispatch sites only).

**Repositories**
- `src/core/repositories/IMasterDataRepository.ts`
- `src/modules/master-data/repository/masterDataRepository.ts`
- `src/modules/academic/domain/repositories/IAcademicYearRepository.ts`
- `src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository.ts`
- `src/modules/academic/domain/repositories/ICurriculumRepository.ts`,
  `ICourseAssignmentRepository.ts`, `IAcademicCalendarRepository.ts` + their
  SQLite implementations.
- `src/modules/student/infrastructure/repositories/StudentRepository.ts`
  (already async — template, unchanged unless consolidated).

**Services / use cases / controllers**
- `src/modules/master-data/services/masterDataService.ts`
- `src/modules/academic/application/services/*.ts` (incl. `AcademicYearService.ts`)
- `src/modules/academic/application/use-cases/AcademicYearUseCases.ts` (+ others)
- `src/modules/academic/application/controllers/academicController.ts`

**Mapper / aggregate**
- `src/modules/academic/infrastructure/mappers/academicYearMapper.ts` (version +
  status columns)
- `src/modules/academic/domain/aggregates/AcademicYear.ts` (contract/status use,
  no model change required beyond existing)

**Frontend data-access layer** (no UI changes)
- `src/lib/db.ts`, `src/lib/sqlite-engine.ts`, `src/lib/sqlite-repository.ts`
- `src/lib/reference-data/ReferenceDataProvider.tsx`,
  `src/lib/reference-data/useReferenceData.ts`, `referenceDataCache.ts`
- `src/modules/master-data/hooks/useMasterData.ts`, `useMasterLookup.ts`
- `src/modules/master-data/screens/MasterDataCenter.tsx`
- The 28 `src/screens/*.tsx` and 10 `src/components/*.tsx` files in §6.2
- `src/App.tsx` (already clean; only if session-cache wiring changes)

**Schema / migrations**
- `migrations/001_master_data.sql`, `migrations/002_*.sql`, `migrations/003_*.sql`
  — run via a new explicit runner (files themselves already exist).
- A new `version`/`status` column migration for `academic_years`/`academic_terms`.
- `src/lib/sqlite-schema.sql` — **must not be modified** (canonical legacy
  runtime schema; only the migration runner changes where tables come from).

**Tests**
- `scripts/run-*.mjs`, `verify-*.mjs` (+ any `InMemoryDataSource` test helpers).

**Server**
- `server.ts` — mount async academic/master-data routes; host audit/report
  endpoints consumed by the frontend (§8.2).

---

## 14. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Full-async conversion ripple across 38 frontend files + all repos | High | Do IDataSource→repo→service→controller in one pass; use the already-async Student repo as the template; keep SQLite as a temporary fallback so behaviour is unchanged during transition. |
| Silent empty UIs today because `querySqlSync` swallows errors | High | Add explicit migration runner (§9.3) + make `querySqlSync`/`runSqlSync` throw on error (or add a strict mode) so missing tables surface immediately instead of `[]`. |
| Dual-writer of `is_current`/`is_active` (Master Data Center vs Academic service) | Medium | Single-writer rule (§11.3): generic master-data CRUD routes academic aggregates through the Academic service. |
| Version/status columns absent from current SQLite runtime schema | Medium | Introduced via migration runner + new migration files, not by editing `sqlite-schema.sql`. |
| No `pg` dependency and no test framework in `package.json` | Medium | `pg` added for PostgreSQLDataSource; tests remain in the existing script style (§15 decision). |
| Dangling refs (`class_rooms`, `book_categories`, `payment_statuses`) | Low | Either add the tables to migrations (they're referenced by `useReferenceData` hooks) or delete the unused hooks. |
| `master_data_permissions` table queried but `getPermission` has no caller | Low | Keep table in migration (harmless) and/or drop the unused method in a future cleanup (decision §15). |
| Browser DB decommission risk (data currently only exists in `localStorage` for legacy screens) | High | Migration path must include a data-export/seed step from the browser DB into the server DB before removal (decision §15). |
| Hardcoded insecure secrets in `ConfigService` | Medium (pre-existing) | Unrelated to migration, but should be addressed before production; flag only, do not fix here. |

---

## 15. Decisions Required

These are explicit decisions that must be made (not made here — no invention):

1. **Async conversion policy:** full async everywhere (recommended) vs. any
   hybrid shim (not recommended). §3.3.
2. **SQLite during transition:** keep server-side `data/al-salam-server.db` as
   the temporary fallback DataSource behind `ConfigService.type`, with
   `'postgresql'` behind the same switch. Confirm the switch default for
   non-prod environments.
3. **Master-data seeding:** are the 30 missing tables seeded from the INSERT
   rows in `migrations/001_master_data.sql`, or left empty for user entry?
   §9.3.
4. **Term-level versioning:** version only the `academic_years` aggregate
   (matches today's model) or also `academic_terms`? §10.3.
5. **`expectedVersion` semantics:** blind save vs. read-verify when no
   `expectedVersion` is supplied by a caller. §10.3.
6. **`is_current` / `is_active` projections:** keep as denormalized columns for
   legacy-screen compatibility, or compute at read time from the new `status`
   column. §11.3.
7. **Status storage:** `VARCHAR` + CHECK constraint vs. FK to
   `academic_statuses` (which exists in `001_master_data.sql`). §11.3.
8. **`master_data_permissions`:** keep (harmless) or remove the unused
   `getPermission` method. §9.2 E, §14.
9. **Dangling hooks** (`class_rooms`, `book_categories`, `payment_statuses`):
   add tables to migrations or delete the hooks. §9.2 D.
10. **Browser DB data migration:** how the current `localStorage`/`sql.js`
    business data is exported into the server DB before the browser path is
    decommissioned. §14, §8.5.
11. **`pg` and test tooling:** add `pg` dependency and whether to introduce a
    test framework or keep the script-based tests. §3.2.9, §14.
12. **Migration runner location:** a new `scripts/migrate.mjs` invoked at
    server startup vs. a dedicated CLI. §9.3.

---

## 16. Acceptance Criteria

Each blocker is closed when:

1. **Async persistence:** `IDataSource` is fully Promise-based; every
   repository, service, use case, controller, test, and DI wiring path is async;
   the app compiles and the Academic REST E2E + verify scripts pass with
   `await`-based assertions.
2. **Dual DB:** no screen/component in the §6.2 inventory reads or writes
   business data through the browser DB; `getRealmDB`/`saveRealmDB`/
   `querySqlSync` have zero business call sites; auth session cache remains.
3. **Master data:** all 33 `TABLE_MAP` tables (plus `master_data_audit_log` and
   `master_data_permissions`) exist in the server DB after a clean bootstrap;
   Master Data Center lists records instead of empty/error states; the 3
   dangling refs are resolved (table or hook removal).
4. **AcademicYear version:** `version` survives a save→load round trip; a
   concurrent save with a stale `expectedVersion` is rejected; contract is
   `save(year, expectedVersion?)` matching the Student precedent.
5. **AcademicYear status:** status survives save→load exactly (all 5 year + 4
   term values); status transitions flow only through the aggregate/service;
   Master Data Center no longer mutates status columns directly.
6. **No regression:** the existing `scripts/run-*.mjs` / `verify-*.mjs` checks
   (academic HTTP E2E, API smoke) still pass on the temporary SQLite
   DataSource.
7. **Readiness:** the §17 checklist is fully green.

---

## 17. PostgreSQL Migration Readiness Checklist

Status: **NOT STARTED** (this plan is read-only; nothing below is done).

- [ ] Async `IDataSource` contract merged and all implementers updated
- [ ] All repositories async (master-data, academic ×4, student)
- [ ] All services/use cases/controllers async; Express async handlers verified
- [ ] `UnitOfWork.commit()` async; academic event dispatch after commit
- [ ] `DataSourceFactory` supports `'sqlite'` and `'postgresql'` behind config
- [ ] `ConfigService`/`AppConfig` supports `DBConfig.type = 'postgresql'`
  (and non-hardcoded connection settings)
- [ ] Explicit versioned migration runner executes 001/002/003 at startup
- [ ] All 33 master-data tables + audit log + permissions exist at runtime
- [ ] 3 dangling refs (`class_rooms`, `book_categories`, `payment_statuses`) resolved
- [ ] No business `querySqlSync`/`runSqlSync` in frontend feature code
- [ ] No business `getRealmDB`/`saveRealmDB` call sites in the §6.2 inventory
- [ ] Browser DB business data exported to server DB; browser DB decommissioned
- [ ] `academic_years`/`academic_terms` have durable `version` (+ status) columns
- [ ] `save(year, expectedVersion?)` contract implemented with concurrency guard
- [ ] Single-writer rule enforced for academic status columns
- [ ] `pg` dependency added; `PostgreSQLDataSource` implemented
- [ ] Migration SQL validated on PostgreSQL (types, `CURRENT_TIMESTAMP`, boolean)
- [ ] Legacy SQLite DataSource remains as temporary fallback and passes existing scripts
- [ ] `POSTGRESQL_MIGRATION_READINESS_AUDIT.md` produced (future deliverable)

---

## Verdict

POSTGRESQL MIGRATION:
STILL BLOCKED — REMEDIATION REQUIRED
