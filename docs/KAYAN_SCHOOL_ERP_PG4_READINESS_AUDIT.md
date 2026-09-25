# Kayan School ERP — PG-4 Readiness Audit (PG-4.0 Preflight)

> **Phase:** PG-4.0 (READ-ONLY PREFLIGHT). No production code, SQL, schema, migration, UI, `package.json`, or config was modified while producing this document.
> **Only artifact:** this file (`docs/KAYAN_SCHOOL_ERP_PG4_READINESS_AUDIT.md`).
> **Upstream status:** PG-0 / PG-1 / PG-2 / PG-3 = `PASS`. PG-3 verdict: **READY FOR PG-4** (live PostgreSQL 16.13 verified; 14/14 live tests pass; full regression 121 pass / 0 fail; build exit 0; `tsc` exit 2 = exactly 12 pre-existing baseline type errors, none new).
> **Governing decisions:** `docs/KAYAN_SCHOOL_ERP_DECISION_RECORD_D1_D9_FINAL.md` (D1–D9 FINAL), `docs/KAYAN_SCHOOL_ERP_POSTGRESQL_IMPLEMENTATION_READINESS_GATE.md`, `docs/KAYAN_SCHOOL_ERP_R4_3_TARGET_ARCHITECTURE.md`.

---

## 0. Executive Verdict

**`PG-4.0: READY_TO_IMPLEMENT`**

Rationale:
1. **No outstanding PO decision.** D1–D9 are `FINAL`; the only previously `NEEDS_PO` item (PG-2 I/U/X) was resolved to `DEFERRED` (UUID PKs + Al-Salam copy fidelity deferred to full-schema phase). No external blocker remains.
2. **Architecture is proven on live PostgreSQL.** PG-3 established `IDataSource` + `PostgreSQLDataSource` + `sqlDialect` and live-validated the academic repositories (AcademicYear, CourseAssignment) end-to-end against a real PostgreSQL instance. The boundary (Frontend → REST API → Application → Domain → Repository → PostgreSQL) exists and the repository layer already runs on PG.
3. **Repository SQL is dialect-compatible.** Module repositories use only `IDataSource.query/queryOne/execute` with `?` placeholders and `INSERT OR REPLACE` / `INSERT OR IGNORE`. No repository uses SQLite-only functions (`strftime`, `datetime()`, `date()`, `julianday`, `last_insert_rowid`, `typeof`). The dialect layer already translates these constructs. The single reconciliation gap (`DEFAULT_CONFLICT_TARGETS` completeness for composite-PK tables) is a normal PG-4 implementation task, not a blocker.
4. **DDL translation policy is settled (D7/D8/D9 + pilot).** Type mapping (`TEXT` PK, `SMALLINT` flags, `TIMESTAMP`, `NUMERIC(18,2)`, `DATE`, `INTEGER`) is documented and proven by `migrations/postgres/001_kayan_pilot_schema.sql`.

Open items below are **DESIGN_REQUIRED *within* PG-4 execution** (catalog authoring, seed classification per D6, conflict-target mapping, school-identity entity per D3, `users`/RBAC DDL). They are explicitly surfaced here and must be resolved by the PG-4 implementer — they are **not** silently decided.

---

## 1. Inventories A–O (code-grounded)

### A. Repositories emitting SQLite-specific SQL
- **Direct SQLite access (legacy path, NOT PG-4 scope):** `src/lib/sqlite-repository.ts` (`SQLiteRepository` base class; uses `querySqlSync`/`runSqlSync`/`persistSQLiteDB`), `src/lib/db.ts` (`getRealmDB`/`saveRealmDB` + `querySqlSync` import), `src/lib/reference-data/ReferenceDataProvider.tsx`, `src/lib/reference-data/useReferenceData.ts`.
- **Module repositories (use `IDataSource`, PG-4 target via dialect):** see B.
- **SQLite-only SQL functions in repo code:** NONE (grep `strftime|datetime(|date(|julianday|last_insert_rowid|typeof|random()|AUTOINCREMENT|PRAGMA` matched only `sqlite-engine.ts` internals and UI `Math.random()` id generation, which is portable).

### B. Repositories that can operate through `IDataSource` without code modification
All inject `IDataSource` via constructor (`dataSource || DataSourceFactory.getInstance()`), use `?` placeholders and `INSERT OR REPLACE`/`INSERT OR IGNORE`, and were confirmed by read:
- `src/modules/master-data/repository/masterDataRepository.ts` (uses `TABLE_MAP`, 33 entity types).
- `src/modules/students/repository/studentRepository.ts` (uses `INSERT OR REPLACE INTO students`, `INSERT OR IGNORE INTO parent_students`).
- `src/modules/teachers/repository/teacherRepository.ts` (uses `INSERT OR REPLACE INTO teachers`, `INSERT OR IGNORE INTO teacher_subjects/teacher_classes`).
- `src/modules/financial/repository/financialRepository.ts`.
- `src/modules/dashboard/repository/dashboardRepository.ts`.
- `src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository.ts`, `SQLiteCourseAssignmentRepository.ts`, `SQLiteCurriculumRepository.ts`, `SQLiteAcademicCalendarRepository.ts` (live-validated in PG-3).
- `src/modules/student/infrastructure/repositories/StudentRepository.ts`, `StudentReadRepository.ts`, `projections/StudentProjectionRepository.ts`.

These run on PostgreSQL once the corresponding tables exist and the dialect's `INSERT OR REPLACE` conflict targets are populated (see C).

### C. Repositories requiring PG dialect changes / reconciliation
- **Primary gap:** `sqlDialect.ts` `DEFAULT_CONFLICT_TARGETS` must list every table used with `INSERT OR REPLACE` (the PG dialect translates it to `ON CONFLICT (pk_cols) DO UPDATE`). Tables with **composite PKs** (`teacher_subjects`, `teacher_classes`, `parent_students`, `student_subjects`, `course_assignments`, `curriculum`, etc.) are especially sensitive — `INSERT OR REPLACE` requires an explicit conflict target; `DEFAULT_CONFLICT_TARGETS` must include them or the repos will fail on PG.
  - *Verification task (PG-4.5):* enumerate all `INSERT OR REPLACE` target tables across repositories and confirm each has an entry in `DEFAULT_CONFLICT_TARGETS`. `INSERT OR IGNORE` (used by teacher/student repos) maps to `ON CONFLICT DO NOTHING` (no target needed) and is safe.
- **Type compatibility:** repos pass JS numbers into `NUMERIC(18,2)`/`INTEGER` columns and `SMALLINT` into is_* flags — compatible. Repos return `CURRENT_TIMESTAMP`-written `TIMESTAMP` values; `PostgreSQLDataSource` already normalizes `DATE`/`TIMESTAMP`/`TIMESTAMP WITH TZ` to strings via `types.setTypeParser(1082/1114/1184)` (PG-3 fix).
- **No other dialect rewrites required** for the repository layer.

### D. Tables in the applied PG pilot schema (7)
From `migrations/postgres/001_kayan_pilot_schema.sql` (applied to DB `kayan_school_erp` in PG-3):
`education_stages`, `grade_levels`, `academic_years`, `academic_terms`, `subjects_master`, `academic_calendar_days`, `subjects`.
- `subjects` references `class_id`/`teacher_id` but those FKs are **intentionally omitted** (deferred to full-schema phase).
- `course_assignments` and `curriculum` tables are **absent** from the pilot (needed by `SQLiteCourseAssignmentRepository` / `SQLiteCurriculumRepository`).

### E. Tables required by modules (catalog — source of truth: `src/lib/sqlite-schema.sql`)
Grouped by domain (counts approximate; canonical list is `sqlite-schema.sql`):
- **Master data (33, via `TABLE_MAP` in `masterDataRepository.ts`):** `attendance_statuses`, `certificate_types`, `document_types`, `exam_types`, `section_types`, `student_status`, `system_numbering`, `leave_types`, `identity_types`, `archive_statuses`, `employee_types`, `qualifications`, `specializations`, `job_titles`, `countries`, `governorates`, `districts`, `cities`, `nationalities`, `buildings`, `rooms`, `libraries`, `laboratories`, `academic_years`, `academic_terms`, `education_stages`, `grade_levels`, `sections_master`, `departments`, `fee_types`, `payment_methods`, `currencies` (+ `master_data_audit_log`, `master_data_permissions`).
- **Academic runtime:** `academic_years*`, `academic_terms*`, `education_stages*`, `grade_levels*`, `subjects_master*`, `subjects*`, `course_assignments`, `curriculum`, `academic_calendar_days*` (`*` = already in pilot).
- **Students:** `students`, `parents`, `parent_students`, `school_classes`, `sections`, `enrollment`, `student_documents`, `user_linked_students`, `guardians`.
- **Teachers / HR:** `teachers`, `teacher_subjects`, `teacher_classes`, `teacher_leaves`, `teacher_attendance`, `employees`, `departments`.
- **Finance:** `fee_payments`, `fee_categories`, `expense_records`, `expense_categories`, `employee_salaries`, `payroll`.
- **Attendance / Grades:** `attendance_records`, `attendance_types`, `grade_records`.
- **Library / Certificates / Schedule:** `library_books`, `book_borrowings`, `book_categories`, `certificates`, `schedule_periods`.
- **System / Settings / Auth:** `users` (has `password_hash`, `role`), `app_notifications`, `saved_reports`, `school_settings`, `school_branches`, `system_settings`, `audit_logs`, `master_data_audit_log`, `master_data_permissions`.

### F. Tables missing in PostgreSQL vs SQLite
SQLite (`src/lib/sqlite-schema.sql`) defines ~67 tables. PG pilot has **7**. Gap ≈ **60 tables**. PG-4 first migrations cover **master_data (33) + academic remainder**, leaving ~25+ tables for later phase migrations (catalogued in §3 as FUTURE).

### G. FK dependency / load order
From `sqlite-schema.sql` and the pilot:
- `education_stages` → (root). `grade_levels` → `education_stages` (`ON DELETE SET NULL`). `subjects_master` → `grade_levels` (`SET NULL`). `academic_years` → (root). `academic_terms` → `academic_years` (`CASCADE`).
- Runtime: `students` → `school_classes`/`sections`/`parents`; `teacher_subjects`/`teacher_classes` → `teachers`; `fee_payments` → `students`; `grade_records` → `students`/`subjects`; `attendance_records` → `students`.
- **Load order requirement (D5):** reference/master data first (countries→governorates→districts→cities; education_stages→grade_levels→subjects_master), then academic years/terms, then runtime tables. The PG migration runner must apply DDL in dependency order and seed in the same order.

### H. Seed / reference data (and Al-Salam specificity — D6 conflict)
`migrations/001_master_data.sql` embeds extensive seed data. Two classes exist:
1. **Generic product reference data** (portable): `education_stages`, `grade_levels`, `exam_types`, `certificate_types`, `attendance_statuses`, `student_status`, `system_numbering`, `leave_types`, `identity_types`, `archive_statuses`, `employee_types`, `qualifications`, `specializations`, `job_titles`, `payment_methods`, `document_types`, `section_types`, `fee_types` (non-geographic).
2. **Al-Salam / Yemen-specific data (D6 conflict):** `countries` includes `cnt_yemen`; `governorates` includes `gov_dhale 'محافظة الضالع'` and `gov_jahaf 'مديرية جحاف'`; `districts` includes `dist_jahaf`; `currencies` includes `cur_yer 'ريال يمني'`; `nationalities` includes `nat_yemen`. Per **D6**, these are *customer/school-specific configuration*, NOT product defaults, and must not be shipped as generic seed.
   - **DESIGN_REQUIRED (PG-4.6):** split seed into (a) generic reference seed (PG-4 product default) and (b) Al-Salam customer seed that is loaded only during the Al-Salam data migration (later phase), not as product default. Do not silently bake Yemen/Dhale/Jahaf into the generic migration.

### I. Remaining direct SQLite access (transitional — PG-9 cutover, NOT PG-4)
`getRealmDB()` / `saveRealmDB()` are called directly by ~30 screens/components, e.g. `LoginScreen.tsx:20`, `GlobalSearchBar.tsx:33`, `AIChatAssistant.tsx:26`, `ReportPreviewModal.tsx:39`, `NotificationCenter.tsx:12,41,50,55,73`, `CertificatesScreen.tsx`, `CalendarScreen.tsx`, `AttendanceScreen.tsx`, `AIInsightsScreen.tsx`, `FinancialScreen.tsx`, `DocumentCenterScreen.tsx`, `ClassesScreen.tsx`, `GradesScreen.tsx`, `LibraryScreen.tsx`, `StudentProfileDashboard.tsx`, `SwitchUserModal.tsx`, `ParentDashboard.tsx`, `ReportsScreen.tsx`, `UnifiedPrintLayout.tsx`, `TeacherProfileDashboard.tsx`, `StudentsScreen.tsx`, `StudentDashboard.tsx`, `SettingsScreen.tsx`. Plus `SQLiteRepository` / `reference-data` (querySqlSync). These are the PG-9 cutover surface (reroute through `RestApiDataSource`). **Out of PG-4 scope.**

### J. Belongs to PG-4 vs later cutover
- **PG-4:** master_data + academic DDL (idempotent), seed (generic split), `schema_migrations` table, dialect `DEFAULT_CONFLICT_TARGETS` completion, `users`/RBAC base DDL.
- **Later (PG-5/6/7/8/9):** API/source-of-truth (`RestApiDataSource`), `getRealmDB`/screen cutover (PG-9), RBAC enforcement + AuthService server-side (PG-6/P-7), audit logging redirection (PG-7), remaining domain migrations (students/teachers/finance/attendance/grades/library/certificates/schedule), Al-Salam data migration, SQLite removal.

### K. API / source-of-truth boundaries (current)
Per `R4_3_TARGET_ARCHITECTURE.md`: Frontend → REST API → Application → Domain → Repository → PostgreSQL. **Current reality:** only `/api/academic/*` and `/api/ai/*` exist (`server.ts` minimal). The ~30 screens in I still read browser SQLite. PG-4 is **schema-only**; it does not build the API. The schema it produces is the contract the future API/repositories will use.

### L. Auth / RBAC status (after PG-0)
- PG-0 removed `password_hash` exposure from `AuthService`. `users` table exists (SQLite) with `role` (`admin|teacher|student|parent`).
- **Inline RBAC is pervasive in the client:** grep `role === 'admin'` / `'teacher'` / `'student'` / `'parent'` matched 12+ files: `AttendanceScreen.tsx`, `FinancialScreen.tsx`, `GradesScreen.tsx`, `ReportsScreen.tsx`, `StudentsScreen.tsx`, `TimetableScreen.tsx`, `NotificationCenter.tsx`, `ActiveReportPrintView.tsx`, `sqlite-repository.ts:148`, plus `masterDataRepository`/service permission checks. This is **client-side RBAC** and must be replaced by **server-side RBAC** (real RBAC per D-req).
  - **DESIGN_REQUIRED (PG-4.8):** PG-4 must at minimum define the `users` table DDL for PG (preserving existing ids/roles). The RBAC permission/role schema (e.g., `roles`, `role_permissions`) is **not yet designed** — `master_data_permissions` exists for master-data only. Full RBAC schema + enforcement is PG-6/P-7 (FUTURE), but its base (`users`) should be created in PG-4 to avoid a later schema split.

### M. School identity / config (D3)
`src` has **no `school_id`/`tenant_id`/`organization_id`** (grep empty) — consistent with D3 (v1 = one PostgreSQL DB per school; no per-row school scoping). Current config is `school_settings` (single row, `id=1`) + `school_branches`.
- **DESIGN_REQUIRED (PG-4.7):** D3 implies a formal `schools`/`organizations` config entity for provisioning/config (school name, academic config, branding). It must be added **without** injecting `school_id` into other tables. Decision: does PG-4 add a `schools` config table (single row per deployment) or defer to full-schema phase? This must be resolved by the implementer, not silently omitted or added.

### N. Audit (D8)
`AuditService.ts` currently writes to `localStorage`. Tables `audit_logs` (server SQL) and `master_data_audit_log` (master_data seed) exist in SQLite.
- PG-4 should include `audit_logs` + `master_data_audit_log` DDL so the schema is complete.
- **Redirection of AuditService to server-side store = PG-7 (FUTURE).** Not PG-4.

### O. Backup / restore (D7)
Official PG backup/restore is PG-10 (FUTURE). D7 allows manual `pg_dump`/`pg_restore` for v1. Does **not** block PG-4 start. PG-4 migrations should be idempotent and reversible (see rollback in §3).

---

## 2. Existing Migration Assets (code-grounded)

| File | Status | PG-4 relevance |
|---|---|---|
| `migrations/postgres/001_kayan_pilot_schema.sql` | **Real PG DDL** (7 tables, applied in PG-3) | **Template to follow** for type mapping & style |
| `migrations/001_master_data.sql` | SQLite-flavored (`DATETIME`, `REAL`, `PRAGMA foreign_keys`, `TRIGGERS`, `INSERT OR IGNORE` seed) | Must be **ported** to PG DDL (TIMESTAMP, NUMERIC(18,2), no PRAGMA/triggers) — NOT reused as-is |
| `migrations/002_academic_runtime_schema.sql` | Documentation ledger (references `sqlite-schema.sql`; creates `schema_migrations` in SQLite syntax) | Provides FK/order notes; DDL must be re-authored for PG |
| `migrations/003_academic_calendar_days.sql` | Documentation ledger (`TEXT`/`INTEGER`/`DATETIME`) | Re-author for PG |
| `src/lib/sqlite-schema.sql` | ~67-table canonical SQLite schema | **Source of truth** for the full PG table catalog (PG-4 + later) |

**Conclusion:** The only runnable PG DDL today is the 7-table pilot. PG-4 must author `0001_master_data` + `0002_academic` as **new PostgreSQL DDL files** (not copies of the SQLite `.sql` ledgers), following the pilot's style and D7/D8/D9 type policy.

---

## 3. PG-4 Execution Plan (classified)

Classification vocabulary (`READY_TO_IMPLEMENT` / `DESIGN_REQUIRED` / `BLOCKED` / `FUTURE`) per item. Each item lists file/table/dependency/change/verification/rollback.

### PG-4.1 — Author `migrations/postgres/002_master_data_ddl.sql` (master data tables)
- **Classification:** `READY_TO_IMPLEMENT`
- **Files:** new `migrations/postgres/002_master_data_ddl.sql` (mirrors `TABLE_MAP` 33 tables + `master_data_audit_log` + `master_data_permissions`).
- **Tables:** all 33 master-data tables from `TABLE_MAP` (`masterDataRepository.ts`).
- **Dependency:** none (roots: countries, education_stages, etc.).
- **Change:** PG DDL using pilot type policy (`TEXT` PK, `SMALLINT` flags, `TIMESTAMP`, `NUMERIC(18,2)`, `DATE`, `INTEGER`), `CREATE TABLE IF NOT EXISTS`, FKs per `sqlite-schema.sql` order, indexes. **Drop SQLite `TRIGGER`/`PRAGMA`.** `updated_at` handled by repository `CURRENT_TIMESTAMP` (no trigger needed).
- **Verification:** live PG test (pattern of `postgres.live.test.ts`) — apply, assert all 33 tables exist via `information_schema`, run a sample `INSERT OR REPLACE` through `masterDataRepository` against live PG.
- **Rollback:** `DROP TABLE IF EXISTS` for each (idempotent re-create safe).

### PG-4.2 — Author `migrations/postgres/003_academic_ddl.sql` (academic remainder)
- **Classification:** `READY_TO_IMPLEMENT` (with DESIGN note on `course_assignments`/`curriculum`)
- **Files:** new `migrations/postgres/003_academic_ddl.sql`.
- **Tables:** `course_assignments`, `curriculum` (+ any academic tables not in the 7-table pilot). `subjects` already in pilot; its deferred FKs (`school_classes`, `teachers`) remain deferred (full-schema phase).
- **Dependency:** `academic_years`, `academic_terms`, `subjects_master`, `subjects` (pilot). `course_assignments` → `subjects`/`academic_terms`; `curriculum` → `subjects_master`/`grade_levels`.
- **Change:** PG DDL + indexes; resolve PK shape for `course_assignments`/`curriculum` (TEXT PK consistent with pilot).
- **Verification:** live test — `SQLiteCourseAssignmentRepository` / `SQLiteCurriculumRepository` run against live PG (extend PG-3 live test).
- **Rollback:** drop tables.

### PG-4.3 — `schema_migrations` table + idempotent runner
- **Classification:** `READY_TO_IMPLEMENT`
- **Files:** new `migrations/postgres/000_schema_migrations.sql` (idempotent tracker table).
- **Tables:** `schema_migrations(version TEXT PK, applied_at TIMESTAMP)`.
- **Dependency:** none.
- **Change:** standard migration-tracking table; the runner applies `002`/`003`/`004` only once (idempotent via `CREATE TABLE IF NOT EXISTS` + a tracked-versions check).
- **Verification:** apply twice; assert second run is a no-op (table exists, no duplicate rows).
- **Rollback:** `DROP TABLE IF EXISTS schema_migrations`.

### PG-4.4 — Dialect `DEFAULT_CONFLICT_TARGETS` completion (reconciliation)
- **Classification:** `DESIGN_REQUIRED` (resolve during PG-4; verification is concrete)
- **Files:** `src/core/datasource/sqlDialect.ts` (`DEFAULT_CONFLICT_TARGETS`).
- **Tables:** every table targeted by `INSERT OR REPLACE` in repositories — at minimum: `students`, `teachers`, `master_data` entities (33), `academic_years`, `academic_terms`, `subjects_master`, `subjects`, `course_assignments`, `curriculum`, `parent_students`, `teacher_subjects`, `teacher_classes`, `user_linked_students`, and any composite-PK join tables.
- **Dependency:** PG-4.1/4.2 DDL (must know final PK columns).
- **Change:** populate `DEFAULT_CONFLICT_TARGETS` with table → `[pk columns]`. For single-column TEXT PKs this is the `id` column; for composite PKs list all PK columns so `ON CONFLICT (...) DO UPDATE` is valid.
- **Verification:** PG-4.5 test — for each `INSERT OR REPLACE` table, execute an insert then a second `INSERT OR REPLACE` with changed fields and assert the row is updated (not duplicated) on live PG.
- **Rollback:** revert `sqlDialect.ts` to prior state.

### PG-4.5 — Live PostgreSQL reconciliation test (extends PG-3 harness)
- **Classification:** `READY_TO_IMPLEMENT`
- **Files:** extend `src/core/datasource/postgres.live.test.ts` (or add `pg4.live.test.ts`).
- **Tables:** all PG-4.1/4.2 tables.
- **Dependency:** PG-4.1, PG-4.2, PG-4.4.
- **Change:** apply new migrations against a fresh `kayan_school_erp`-like DB; assert every expected table exists in `information_schema.tables`; exercise `masterDataRepository` + academic repos (`SQLiteCourseAssignmentRepository`, `SQLiteCurriculumRepository`) with `INSERT OR REPLACE`/`INSERT OR IGNORE`/`query`/`queryOne` against live PG; assert `count()`/`exists()` return numbers (PG-3 fix) and DATE/TIMESTAMP come back as strings.
- **Verification:** 14+ new live assertions pass; existing 14 PG-3 live tests still pass; full `npm test` regression 121/121; `npm run build` exit 0; `tsc` no new errors beyond the 12 baseline.
- **Rollback:** drop PG-4.1/4.2 tables; revert test file.

### PG-4.6 — Seed data classification (D6)
- **Classification:** `DESIGN_REQUIRED`
- **Files:** new `migrations/postgres/004_master_data_seed.sql` (generic only) + (later phase) Al-Salam customer seed file.
- **Tables:** all 33 master-data tables.
- **Dependency:** PG-4.1.
- **Change:** port generic reference seed from `migrations/001_master_data.sql` using `INSERT INTO ... ON CONFLICT DO NOTHING` (replaces SQLite `INSERT OR IGNORE`). **Exclude** Al-Salam/Yemen-specific rows (`cnt_yemen`, `gov_dhale`, `gov_jahaf`, `dist_jahaf`, `cur_yer`, `nat_yemen`); those move to the Al-Salam data-migration bundle (later phase). Owner must confirm the generic-vs-customer split; do not silently ship Yemeni geo data as default.
- **Verification:** apply seed on clean DB; assert generic rows present; assert Al-Salam-specific ids absent.
- **Rollback:** `DELETE FROM` seeded tables (or drop/recreate).

### PG-4.7 — `users` / RBAC base DDL
- **Classification:** `DESIGN_REQUIRED` (base table `READY`; full RBAC schema `FUTURE`)
- **Files:** new `migrations/postgres/005_users_ddl.sql`.
- **Tables:** `users` (id TEXT PK, username, password_hash, role SMALLINT/ENUM-mapped, name_ar/en, status SMALLINT, created_at/updated_at TIMESTAMP, created_by/updated_by). Preserve existing SQLite `users` column shape so Al-Salam accounts migrate cleanly.
- **Dependency:** none.
- **Change:** PG-port the `users` table. Defer `roles`/`role_permissions` design to PG-6/P-7 (note in doc). PG-0 already removed `password_hash` from `AuthService` responses; keep `password_hash` column server-side only.
- **Verification:** table exists; a sample insert + `AuthService` login path against live PG succeeds (extend live test).
- **Rollback:** drop `users`.

### PG-4.7b — School identity / config entity (D3)
- **Classification:** `DESIGN_REQUIRED` (decision required)
- **Files:** either new `migrations/postgres/006_school_config_ddl.sql` (`schools` table) or defer to full-schema phase.
- **Tables:** proposed `schools(id TEXT PK, name_ar, name_en, code UNIQUE, ...config..., created_at, updated_at)` — **no `school_id` injected elsewhere** (per D3). Existing `school_settings`/`school_branches` remain single-tenant config rows.
- **Dependency:** none.
- **Change:** owner decides whether to include in PG-4 or defer. If included, must not add `school_id` to other tables. Document the decision in the PG-4 implementation report.
- **Verification:** N/A until decision; if included, table exists assertion.
- **Rollback:** drop `schools` (if added).

### PG-4.8 — Audit tables DDL (D8)
- **Classification:** `READY_TO_IMPLEMENT`
- **Files:** new `migrations/postgres/007_audit_ddl.sql`.
- **Tables:** `audit_logs` (server SQL table), `master_data_audit_log` (already referenced by `masterDataRepository` audit rows).
- **Dependency:** none.
- **Change:** PG-port both tables (TEXT PK, TIMESTAMP, SMALLINT flags). AuditService **redirection** to server store is PG-7 (FUTURE) — out of scope here.
- **Verification:** tables exist; `masterDataRepository` audit insert path works on live PG.
- **Rollback:** drop both tables.

### PG-4.9 — Remaining domain migrations (catalogued, FUTURE)
- **Classification:** `FUTURE` (not PG-4; listed for completeness)
- **Tables:** students, parents, parent_students, school_classes, sections, enrollment, student_documents, user_linked_students, guardians, teachers, teacher_subjects, teacher_classes, teacher_leaves, teacher_attendance, employees, departments, fee_payments, fee_categories, expense_records, expense_categories, employee_salaries, payroll, attendance_records, attendance_types, grade_records, library_books, book_borrowings, book_categories, certificates, schedule_periods, app_notifications, saved_reports, school_settings, school_branches, system_settings.
- **Dependency:** depends on API (`RestApiDataSource`) and the PG-9 cutover plan; sequenced after PG-4 in later phases (PG-5/6/7/8).

### PG-4.10 — API / source-of-truth / screen cutover (FUTURE)
- **Classification:** `FUTURE` (explicitly out of PG-4)
- **Scope:** build `RestApiDataSource`; reroute the ~30 `getRealmDB`/`saveRealmDB` screens (inventory I) through it; replace client-side RBAC (inventory L) with server-side RBAC. Owned by PG-5/PG-7/PG-9.

---

## 4. Testing Requirements (PG-4 gate)
1. **Idempotency:** each migration applies N times with identical end state.
2. **Live PG validation:** against a dedicated DB (mirroring PG-3 `kayan_school_erp` approach, credentials from env only). Assert all new tables present in `information_schema`; exercise repository CRUD through `IDataSource` on live PG.
3. **Dialect reconciliation:** `INSERT OR REPLACE` on every composite-PK table updates in place (PG-4.4/4.5).
4. **Regression:** `npm test` 121/121; `npm run build` exit 0; `tsc` ≤ 12 baseline errors (no new).
5. **Seed integrity (D6):** generic seed present, Al-Salam-specific rows absent from product default.
6. **Rollback drill:** each migration's rollback path verified on a throwaway DB.

## 5. git Status Classification (pre-existing vs future)
- **Pre-existing (committed in PG-0/PG-2/PG-3, leave intact):**
  - `src/core/datasource/PostgreSQLDataSource.ts` (PG-3 edits: `close()`, DATE parsers, `count()` Number coercion).
  - `src/core/datasource/postgres.live.test.ts` (PG-3, 14 live tests).
  - `migrations/postgres/001_kayan_pilot_schema.sql` (PG-2, 7 tables).
  - `docs/KAYAN_SCHOOL_ERP_PG3_IMPLEMENTATION_REPORT.md` (PG-3 PASS report).
  - `docs/KAYAN_SCHOOL_ERP_DECISION_RECORD_D1_D9_FINAL.md`, `..._READINESS_GATE.md`, `..._R4_3_TARGET_ARCHITECTURE.md` (planning docs).
- **Future (created in PG-4 implementation, NOT in this preflight):** `migrations/postgres/002_master_data_ddl.sql`, `003_academic_ddl.sql`, `000_schema_migrations.sql`, `004_master_data_seed.sql`, `005_users_ddl.sql`, `006_school_config_ddl.sql` (if decided), `007_audit_ddl.sql`, `sqlDialect.ts` `DEFAULT_CONFLICT_TARGETS` update, `pg4.live.test.ts` extension.
- **This document** (`docs/KAYAN_SCHOOL_ERP_PG4_READINESS_AUDIT.md`) is the **only** artifact of PG-4.0.

## 6. Final Verdict
**`PG-4.0: READY_TO_IMPLEMENT`**

No PO decision is outstanding (D1–D9 FINAL). The IDataSource + PostgreSQLDataSource + sqlDialect boundary is proven on live PostgreSQL (PG-3), and all module repositories already use `IDataSource` with dialect-compatible SQL. The only open items — full table-catalog authoring, D6 seed split, `DEFAULT_CONFLICT_TARGETS` completeness, D3 school-identity entity, and `users`/RBAC base DDL — are explicit DESIGN_REQUIRED tasks **within** PG-4 (surfaced above, not silently resolved) and do not block the start of PG-4. PG-4 scope is schema-only (master_data + academic DDL + seed + tracking table), with API/screen cutover and full RBAC/audit enforcement intentionally deferred to later phases (PG-5/6/7/9).
