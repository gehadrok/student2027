# Kayan School ERP — PostgreSQL PG-1 Dialect & Schema Audit

**Status:** PG-1 STATUS: ✅ READY FOR PG-2 (design audit complete; B-class redesign items flagged for PG-2)
**Date:** 2026-08-23
**Scope:** PostgreSQL schema design + SQL dialect audit (DESIGN + IMPLEMENTATION-FOUNDATION only). No data migration, no DB connection, no code modification in this phase.

---

## §1 Executive Summary

The canonical runtime schema lives in `src/lib/sqlite-schema.sql` (1 canonical DDL file, 1204 lines, ~66 tables including 4 academic runtime + 33 master-data + 24 core + audit). It is loaded at runtime via Vite `?raw` by `src/lib/sqlite-engine.ts`.

SQL is executed through **two disjoint data-access layers**, a fact not visible from a `dataSource.` grep alone:

1. **IDataSource layer (10 files)** — repositories that depend on the generic `IDataSource` interface. These are covered by the PG-0 `PostgreSQLDataSource` abstraction.
2. **Direct `sqlite-engine` layer** — `src/lib/sqlite-repository.ts` (`SQLiteRepository` static class, 18 entity groups) and `src/lib/reference-data/useReferenceData.ts` (React hooks). Both call `querySqlSync`/`runSqlSync` **directly**, bypassing `IDataSource`. `SQLiteRepository` is live: `src/lib/db.ts` (bootstrap/seed/import/export) invokes every `get*/save*` method. `useReferenceData` is live: imported by `ReferenceDataProvider.tsx` and many screens.

**Dialect findings (exact, repo-based):** `INSERT OR REPLACE` ×22, `INSERT OR IGNORE` ×7, `PRAGMA foreign_keys` ×2 (infra), `SELECT changes(), last_insert_rowid()` ×1 (infra), `COALESCE` ×1 (PG-compatible), `LIMIT` ×3 (compatible), `OFFSET` ×1 (compatible). **No** `datetime()/strftime()/date()/julianday()/time()`, **no** `IFNULL`, **no** `AUTOINCREMENT`, **no** `ON CONFLICT`, **no** `RETURNING` are used anywhere in `src/`.

**Placeholder inventory:** 370 static `?` placeholders across 135 enumerated static SQL statements, plus 7 dynamic/undetermined SQL sites (table/column name injection).

**Major design issues (B-class, must be resolved in PG-2, not silently invented here):**
- The direct-engine layer is **synchronous** (`querySqlSync`/`runSqlSync`); PostgreSQL via `pg` is asynchronous. This layer cannot map 1:1 and requires an architectural redesign (route through `IDataSource` or a sync-over-async shim).
- `is_active = 1` / `is_active = 0` comparisons exist in 3 sites. If boolean columns become PG `BOOLEAN`, these comparisons break (`boolean = integer` is a PG error). Decision required (see §14).
- Master-data `created_by`/`updated_by` are sourced from **browser localStorage** (`getCurrentUserId`/`getCurrentUserName`), contradicting server-side-auth decision D4. Resolution deferred to PG-2/RBAC.
- `useReferenceData` references tables `book_categories`, `payment_statuses`, `class_rooms` absent from the canonical schema (schema gap; see §28).

---

## §2 Scope

**In scope:** full schema mapping, dialect audit, type mapping, parameter-binding strategy, repository conversion order, trigger translation, migration-file design, risk register, verification strategy.

**Out of scope (PG-1 must NOT do):** creating/connecting a PostgreSQL DB, running migrations, transferring Al-Salam data, modifying production code, installing packages, converting repositories (that is PG-2).

---

## §3 Canonical SQLite Schema

Source of truth: `src/lib/sqlite-schema.sql`.

- **Core (24 tables):** users, teachers, parents, school_classes, sections, students, subjects, schedule_periods, attendance_records, grade_records, certificates, fee_payments, expense_records, library_books, book_borrowings, app_notifications, audit_logs, school_settings, saved_reports, teacher_subjects, teacher_classes, parent_students, user_linked_students, academic_years/terms/subjects_master/academic_calendar_days (the latter 4 are academic runtime, declared in the same file).
- **Academic runtime (4):** academic_years, academic_terms, subjects_master, academic_calendar_days.
- **Master data (33 + audit):** education_stages, grade_levels, sections_master, exam_types, certificate_types, attendance_types, leave_types, academic_statuses, nationalities, countries, governorates, districts, cities, identity_types, employee_types, qualifications, specializations, job_titles, departments, buildings, rooms, laboratories, libraries, fee_categories, payment_methods, discount_types, currencies, system_numbering, school_branches, document_types, master_data_audit_log, master_data_permissions (the last appears only in `migrations/001_master_data.sql` and `masterDataRepository.getPermission`, NOT in `sqlite-schema.sql` — see §28).
- **Indexes:** ~90 `CREATE INDEX IF NOT EXISTS` statements (core + master-data).
- **Triggers (4, business logic):** `trg_users_updated_at`, `trg_book_borrow_insert`, `trg_book_borrow_return`, `trg_fee_payment_update`.

Runtime loader: `src/lib/sqlite-engine.ts` executes the DDL (`PRAGMA foreign_keys = ON;` then the `?raw` schema). `migrations/001-003` are NOT loaded at runtime (per their own header comment in `002`); they are documentation/ledger of the additive schema changes.

---

## §4 PostgreSQL Target Principles (derived from D1–D9)

- PostgreSQL is the production DB; SQLite/sql.js is transitional. (D2)
- One independent PostgreSQL DB per school deployment. (D2, D3)
- Online-first; no sync engine. (D1)
- Server/API is source of truth; server-side auth + real RBAC. (D4)
- Preserve Al-Salam data via copy→validate→verify (PG-2+). (D5)
- No Al-Salam/Yemen hardcoded defaults in product. (D6) — note `school_settings` seed values are Al-Salam-specific; must be externalized to School Configuration in PG-2.
- Schema must remain 3NF, generic (no embedded school identity), parameterized (no value concatenation).

---

## §5 Complete SQL/Dialect Inventory

See **Appendix A** for the per-statement inventory (135 static statements enumerated, file:line referenced) and **Appendix B** for the token inventory.

Summary of SQLite-specific tokens (exact counts from `src/` grep):

| Token | Count | Files | Class | PG action |
|-------|-------|-------|-------|-----------|
| `INSERT OR REPLACE` | 22 | sqlite-repository.ts(18), teacherRepository.ts(1), studentRepository.ts(1), financialRepository.ts(2) | A | `INSERT … ON CONFLICT (id) DO UPDATE SET …` |
| `INSERT OR IGNORE` | 7 | sqlite-repository.ts(4), studentRepository.ts(1), teacherRepository.ts(2) | A | `INSERT … ON CONFLICT (…) DO NOTHING` |
| `PRAGMA foreign_keys` | 2 | sqlite-engine.ts(124,134) | A (infra) | Remove (PG enforces FK) |
| `SELECT changes(), last_insert_rowid()` | 1 | sqlite-engine.ts(233) | A (infra) | Use pg `rowCount`; drop `lastInsertRowid` (IDs app-generated) |
| `COALESCE` | 1 | masterDataRepository.ts(86) | C (compatible) | Keep |
| `LIMIT` | 3 | sqlite-repository.ts(734), masterDataRepository.ts(110,321) | C | Keep |
| `OFFSET` | 1 | masterDataRepository.ts(110) | C | Keep |
| `datetime/strftime/date/julianday/time` | 0 (actual) | — | — | None present (23 grep hits were false positives: `date(` matched `update(`/`validate(`/`invalidate(`) |
| `IFNULL` / `AUTOINCREMENT` / `ON CONFLICT` / `RETURNING` | 0 | — | — | None present |

Parameter placeholders: **370 static `?`** (Appendix A) + **7 dynamic sites** (table/column injection in `masterDataRepository` `getAll`/`isFieldUnique`/`create`/`update`/`bulkDelete`/`getChildRelations` and `useReferenceData.fetchSync`).

---

## §6 Repository / Data-Access Inventory

**Layer 1 — IDataSource (async, abstraction-covered):**
1. `src/core/auth/AuthService.ts`
2. `src/modules/master-data/repository/masterDataRepository.ts`
3. `src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository.ts`
4. `src/modules/academic/infrastructure/repositories/SQLiteAcademicCalendarRepository.ts`
5. `src/modules/academic/infrastructure/repositories/SQLiteCourseAssignmentRepository.ts`
6. `src/modules/academic/infrastructure/repositories/SQLiteCurriculumRepository.ts`
7. `src/modules/dashboard/repository/dashboardRepository.ts`
8. `src/modules/financial/repository/financialRepository.ts`
9. `src/modules/students/repository/studentRepository.ts`
10. `src/modules/teachers/repository/teacherRepository.ts`

**Layer 2 — direct `sqlite-engine` (sync, bypasses IDataSource, LIVE):**
11. `src/lib/sqlite-repository.ts` (`SQLiteRepository`) — called by `src/lib/db.ts`.
12. `src/lib/reference-data/useReferenceData.ts` — called by `ReferenceDataProvider.tsx` and screens.

**Infrastructure (not business SQL, but must be reconciled):**
- `src/lib/sqlite-engine.ts` (PRAGMA, `changes()`/`last_insert_rowid()`, `BEGIN/COMMIT/ROLLBACK`, `prepare`).
- `src/core/datasource/SQLiteDataSource.ts` (wraps engine; `BEGIN TRANSACTION` dialect string).
- `src/lib/db.ts` (bootstrap/seed/import/export orchestration via `SQLiteRepository`).

`dataSource.` grep alone returned only Layer 1 — Layer 2 was discovered via `querySqlSync|runSqlSync|sqlite-engine` scan. **This is the single most important PG-1 finding: PG-0's `PostgreSQLDataSource` does NOT cover Layer 2.**

---

## §7 SQLite → PostgreSQL Type Mapping

| SQLite type (in schema) | PG type | Rationale | Notes |
|---|---|---|---|
| `TEXT` (PK/id/code/name/...) | `TEXT` | Preserve app-generated string IDs | IDs are `md_<ts>_<rand>` (see §9), NOT UUIDs |
| `TEXT` (password_hash) | `TEXT` | unchanged | Never returned to client (PG-0/§D4) |
| `INTEGER` (counters, level, capacity, etc.) | `INTEGER` | direct | — |
| `INTEGER` used as boolean (is_active, is_current, notified, is_read, enable_*, is_paid, is_recurring, is_base, status flags) | `SMALLINT` (recommended) **or** `BOOLEAN` | see §14 | `is_active = 1` semantics risk if BOOLEAN |
| `REAL` (max_score, pass_score, gpa, percentage, weight, exchange_rate, discount_percent) | `DOUBLE PRECISION` | IEEE double (SQLite REAL is 8-byte) | non-money |
| `REAL` (money: total_amount, paid_amount, remaining_amount, amount, fee amounts) | `NUMERIC(18,2)` (recommended) | money precision; examine domain first per instruction | DESIGN_REQUIRED (see §15) |
| `DATETIME` (created_at, updated_at, date, start_date, due_date, generated_date, timestamp, ...) | `TIMESTAMP` (recommended) **or** `TIMESTAMPTZ` | app stores `'YYYY-MM-DD HH:MM:SS'`; `CURRENT_TIMESTAMP` valid in PG | `DEFAULT CURRENT_TIMESTAMP` valid |
| `INTEGER PRIMARY KEY CHECK(id = 1)` (school_settings) | `INTEGER PRIMARY KEY CHECK (id = 1)` | single-row settings | keep as INTEGER (exception to TEXT-id rule) |
| `TEXT PRIMARY KEY` (all other tables) | `TEXT PRIMARY KEY` | — | — |
| `CHECK (...)` | `CHECK (...)` | `IN (...)`, `BETWEEN`, `= 1` translate directly | — |
| `UNIQUE (col)` / `UNIQUE (a,b)` | `UNIQUE` | direct | — |
| `REFERENCES t ON DELETE CASCADE/SET NULL/RESTRICT` | `REFERENCES t ON DELETE …` | direct | `RESTRICT` valid in PG |
| `CREATE INDEX IF NOT EXISTS` | `CREATE INDEX IF NOT EXISTS` | PG 9.5+ supports | — |
| Triggers | `CREATE FUNCTION … LANGUAGE plpgsql` + `CREATE TRIGGER` | see §11 | business logic in triggers |

---

## §8 SQLite → PostgreSQL SQL Mapping

| SQLite SQL | PG SQL | Affected | Risk | Class |
|---|---|---|---|---|
| `INSERT OR REPLACE INTO t (…) VALUES (?,…)` | `INSERT INTO t (…) VALUES ($1,…) ON CONFLICT (id) DO UPDATE SET col=$2,…` | Layer1: teacher/student/financial; Layer2: 18 methods | Must enumerate update columns; behavior preserved (upsert by PK) | A→B (design of SET list) |
| `INSERT OR IGNORE INTO t (a,b) VALUES (?,?)` | `INSERT INTO t (a,b) VALUES ($1,$2) ON CONFLICT (a,b) DO NOTHING` | parent_students, teacher_subjects, teacher_classes, user_linked_students | Conflict target must be the UNIQUE/PN key | A |
| `?` placeholder | `$1,$2,…` | all 370 placeholders | Mechanical per-query; must NOT convert `?` inside string literals | A |
| `SELECT * FROM t WHERE is_active = 1` | keep `= 1` if column `SMALLINT`; use `= TRUE` if `BOOLEAN` | masterDataRepository.getAllFlat, useReferenceData.fetchSync | see §14 | B (decision) |
| `COUNT(*) as cnt` / `LIMIT ? OFFSET ?` | identical (PG-compatible) | masterDataRepository, sqlite-repository | C | C |
| `COALESCE(description,'')` | `COALESCE(description,'')` | masterDataRepository | C | C |
| `CURRENT_TIMESTAMP` (in DML defaults) | `CURRENT_TIMESTAMP` | academic/calendar repos | C | C |
| `PRAGMA foreign_keys = ON` | (remove) | sqlite-engine | infra | A |
| `SELECT changes(), last_insert_rowid()` | use `pg` result `rowCount`; `lastInsertRowid` unused (IDs app-generated) | sqlite-engine.runSql | infra | A |

---

## §9 Primary Keys / UUID Strategy

- **All table PKs are `TEXT`** except `school_settings` (`INTEGER`).
- **IDs are NOT UUIDs.** `masterDataRepository.create` uses `generateId()` → `` `md_${Date.now()}_${Math.random().toString(36).substring(2,8)}` `` (verified `src/modules/master-data/utils/index.ts:64`). Audit-log IDs use `` `md_audit_${Date.now()}_${random}` ``. Other repos receive caller-supplied IDs (e.g., aggregates generate their own `id`).
- **Decision (D5-implied, NOT in D1–D9 explicitly):** PostgreSQL should **preserve TEXT PKs** and the existing app-generated ID scheme for backward compatibility with Al-Salam data copy (D5). Introducing `UUID`/`gen_random_uuid()` is **NOT required** and would complicate the copy→verify migration. If a UUID type is desired later, it is a separate decision.
- `pgcrypto`/`uuid-ossp` are **not needed** for PG-1. `gen_random_uuid()` (PG13+ core) is available but unused.
- **Open question:** Should new rows in PG use `gen_random_uuid()` for forward compatibility? NOT DETERMINED FROM CURRENT REPOSITORY EVIDENCE — requires product decision (flagged §28).

---

## §10 Foreign Keys

All FKs in `sqlite-schema.sql` use `REFERENCES parent(col) ON DELETE CASCADE|SET NULL|RESTRICT`. PG syntax is identical. Notable:
- `subjects.subject_id` → `subjects_master` is documented as a **plain column, no FK** (per schema comment) — preserved.
- `sections_master.grade_level_id`, `grade_levels.education_stage_id`, `countries.nationality_id`, `governorates.country_id`, `districts.governorate_id`, `cities.governorate_id`, `job_titles.employee_type_id`, `departments.parent_department_id`, `buildings/rooms/laboratories/libraries` FKs, `fee_categories.parent_category_id` (self-ref) → all `ON DELETE SET NULL`. Direct translate.
- `school_settings` has no FK.
- **Self-references:** `departments.parent_department_id`, `fee_categories.parent_category_id` — PG handles identically.

---

## §11 Constraints (CHECK / UNIQUE / Triggers)

- **CHECK:** all `IN (...)`, `BETWEEN`, `>= 0`, `id = 1` translate directly. No SQLite-only CHECK behavior found.
- **UNIQUE:** `code` on every master-data table; composite uniques (`sections(class_id,name)`, `schedule_periods(section_id,day,period_number)`, `teacher_subjects`, `teacher_classes`, `parent_students`, `user_linked_students`, `certificates(student_id,term,academic_year)`, etc.) translate directly.
- **Triggers (4) — business logic, must be reproduced in PG:**
  1. `trg_users_updated_at` — `AFTER UPDATE` sets `updated_at = CURRENT_TIMESTAMP`. → PG trigger function.
  2. `trg_book_borrow_insert` — on insert with `status='borrowed'`, `copies_available = MAX(0, copies_available-1)`. → PG trigger (encodes library business rule).
  3. `trg_book_borrow_return` — on update borrowed→returned, `copies_available = MIN(copies_total, copies_available+1)`. → PG trigger (business rule).
  4. `trg_fee_payment_update` — `AFTER UPDATE OF paid_amount`, recomputes `remaining_amount` and `status` (paid/partial/unpaid). → PG trigger (**business rule**: status derivation). Must be preserved verbatim.
- **Class B:** trigger logic is business behavior; translation must reproduce semantics exactly. Flagged for PG-2 implementation (PL/pgSQL).

---

## §12 Indexes

~90 `CREATE INDEX IF NOT EXISTS idx_… ON t(col,…)`. All translate to PG `CREATE INDEX IF NOT EXISTS …` (supported PG9.5+). Index names are already unique. No partial/filtered indexes used. Mechanical (Class A).

---

## §13 Timestamp / Date Strategy

- Schema uses `DATETIME` columns with `DEFAULT CURRENT_TIMESTAMP`. No `datetime()`/`strftime()` functions are called in application SQL (verified §5). Dates are stored and compared as **text** (`'YYYY-MM-DD'`, `'YYYY-MM-DD HH:MM:SS'`).
- App writes timestamps two ways: (a) `CURRENT_TIMESTAMP` embedded in DML (academic/calendar repos, masterData create), (b) `new Date().toISOString().replace('T',' ').substring(0,19)` in `masterDataRepository`/`AuthService`.
- **Recommendation:** PG column type `TIMESTAMP` (or `TIMESTAMP(0)`) with `DEFAULT CURRENT_TIMESTAMP`. App string format is accepted by PG `TIMESTAMP`. If `TIMESTAMPTZ` is preferred (timezone-correct), the app's naive local strings need a timezone assumption — **DESIGN_REQUIRED**; recommend `TIMESTAMP` to preserve current behavior (Class B decision).

---

## §14 Boolean Strategy

- SQLite has no boolean; columns use `INTEGER` with `0/1` and `CHECK`/`DEFAULT`. Examples: `is_active`, `is_current`, `notified`, `is_read`, `enable_sms_alerts`, `enable_ai_analysis`, `is_paid`, `is_recurring`, `is_base`.
- App reads: `Boolean(r.is_read)`, `r.enable_sms_alerts ? 1 : 0`, `brw.notified ? 1 : 0`. Writes: `? 1 : 0`.
- **Risk:** 3 sites filter `WHERE is_active = 1` (`masterDataRepository.getAllFlat`, `useReferenceData.fetchSync`, and `masterDataRepository.generateNextNumber` uses `is_active = 1`). In PG, `BOOLEAN = 1` is a **type error**.
- **Options (DESIGN_REQUIRED, not invented here):**
  - **(A) Keep `SMALLINT`** for these columns → fully mechanical, `= 1`/`= 0` preserved. Recommended for behavioral fidelity.
  - **(B) Use `BOOLEAN`** → must also change the 3 `is_active = 1` filters to `is_active = TRUE` (and `= 0`→`= FALSE`) in PG-2.
- **Recommendation:** Option A (`SMALLINT`) for minimal-risk mechanical conversion; revisit as `BOOLEAN` in a later cleanup with coordinated SQL updates.

---

## §15 Numeric / Money Strategy

- `REAL` columns split into money vs scalar:
  - **Money** (fee_payments: total/paid/remaining; expense_records.amount; fee_categories.amount; currencies.exchange_rate): recommend `NUMERIC(18,2)` to avoid float rounding on currency. **DESIGN_REQUIRED** but low-risk; must verify no code relies on `REAL` float behavior (app does `total-paid` arithmetic in JS, stores result — compatible).
  - **Scalars** (max_score, pass_score, gpa, percentage, weight, discount_percent, exchange_rate already noted): `DOUBLE PRECISION` (or `NUMERIC` where exactness matters, e.g., `percentage`/`weight`/`discount_percent` could be `NUMERIC`).
- No `SQLite` `NUMERIC` affinity ambiguity: schema explicitly uses `REAL`/`INTEGER`/`TEXT`. No blind `NUMERIC` assumption made.

---

## §16 Transaction Mapping

- `UnitOfWork` (Layer1) calls `dataSource.transaction(queries)` → `PostgreSQLDataSource.transaction` already does `BEGIN/COMMIT/ROLLBACK` (PG-0). ✅ Compatible.
- `SQLiteDataSource.beginTransaction/commit/rollback` use `db.run('BEGIN TRANSACTION;')` etc. → PG equivalent `BEGIN` (PG-0 uses `BEGIN`). ✅ Compatible.
- `sqlite-engine.runTransaction` uses `db.run('BEGIN TRANSACTION;')`/`COMMIT`/`ROLLBACK` — infra; must be mirrored in a PG engine (Class A, infra).
- `LASTINSERT`/`changes()` only in infra (see §5) — not relied upon by business code (IDs app-generated).

---

## §17 Parameter Binding Strategy

- **All 370 static placeholders use `?`.** PostgreSQL uses `$1,$2,…`.
- **Mechanical conversion is required and MUST be centralized** to avoid per-query edits and literal-`?` mishandling:
  - **Recommendation:** add `src/core/datasource/sqlDialect.ts` with `toPostgresPlaceholders(sql: string): string` replacing `?` → `$N` sequentially. Integrate into `PostgreSQLDataSource` (`query/queryOne/execute/transaction/prepare/count/exists`) so every incoming `?` SQL is normalized before `pg.query`. `count`/`exists` wrap SQL in `SELECT COUNT(*) FROM (${sql})` — convert the inner SQL first, then wrap.
  - **Caveat:** `?` inside string literals (e.g., `LIKE '?%'`) must not be converted. Current repo SQL has no such case (verified), but the converter must be aware (Class A, with documented limitation).
- **Layer 2 (`sqlite-repository`, `useReferenceData`)** bypass `PostgreSQLDataSource`, so they need either (a) the same converter if kept on a sync shim, or (b) refactoring to route through `IDataSource` (preferred). See §18/B-items.

---

## §18 Repository Conversion Order

| Order | Repository | Layers | PG changes | Risk | Class |
|---|---|---|---|---|---|
| 1 | `PostgreSQLDataSource` + new `sqlDialect` helper | infra | add `?`→`$N` converter | Low | A |
| 2 | `masterDataRepository` | L1 | `INSERT OR REPLACE/IGNORE` absent here; `is_active=1` if BOOLEAN; dynamic SQL reviewed | Med | A/B |
| 3 | Academic repos (Year/Calendar/Course/Curriculum) | L1 | `INSERT OR REPLACE`→`ON CONFLICT(id)`; `CURRENT_TIMESTAMP` kept | Low | A |
| 4 | `studentRepository`, `teacherRepository`, `financialRepository` | L1 | `INSERT OR REPLACE/IGNORE`→`ON CONFLICT` | Low | A |
| 5 | `AuthService` | L1 | already PG-safe (parameterized; no `?`-incompatible SQL) | Low | C |
| 6 | `dashboardRepository` | L1 | no params; PG-safe | Low | C |
| 7 | `sqlite-repository.ts` (`SQLiteRepository`) | L2 | **major**: sync→async, `INSERT OR REPLACE/IGNORE`→`ON CONFLICT`, route via `IDataSource` | High | B |
| 8 | `useReferenceData.ts` | L2 | **major**: sync hook→async; dynamic table; missing tables | High | B |
| 9 | `db.ts` bootstrap/seed/import-export | L2 | depends on #7 | High | B |
| 10 | `sqlite-engine.ts` | infra | PRAGMA removal; `changes()` handling; PG engine or SQLite-only | Med | A |

**Recommended PG-2 architecture decision (flagged, not enacted):** Consolidate ALL data access through `IDataSource`/`PostgreSQLDataSource`; deprecate direct `sqlite-engine` calls in `SQLiteRepository`/`useReferenceData`/`db.ts`. This removes the dual-path risk.

---

## §19 Academic Pilot Scope

Pilot tables (per PG-1 instruction): `academic_years`, `academic_terms`, `subjects_master`, `academic_calendar_days` — all present in `sqlite-schema.sql` (lines 357, 375, 398, 422) plus their FKs (`academic_terms.academic_year_id → academic_years`). PG DDL is straightforward (TEXT PK, TEXT columns, TIMESTAMP dates, `is_active`/`is_current` SMALLINT, audit cols). Repositories (`SQLiteAcademicYear/Calendar/Curriculum/CourseAssignment`) already use `IDataSource` + `UnitOfWork` and parameterized `?` SQL → mechanically convertible via the §17 converter + `ON CONFLICT` for their `INSERT OR REPLACE`-style upserts (they currently use explicit `UPDATE`/`INSERT` branches keyed on `exists()`, which is already PG-compatible; `CourseAssignment`/`Curriculum` use `subjects`/`subjects_master` directly — also fine). **Conclusion: Academic pilot is the lowest-risk first PG-2 target.**

---

## §20 Master Data Scope

33 master-data tables + `master_data_audit_log` + `master_data_permissions` (the latter only via `migrations/001` and `masterDataRepository.getPermission`, **absent from `sqlite-schema.sql`** — see §28). All use `TEXT` PK `id`, `code UNIQUE`, `is_active`, `display_order`, audit cols (`created_at/updated_at/created_by/updated_by`), and optional parent FKs. PG DDL is mechanical per §7. `masterDataRepository` builds dynamic SQL (`${table}`) — conversion must preserve table-name whitelisting (the `TABLE_MAP`) and only convert `?` placeholders, never the table identifier. **Class A for DDL; Class B for the dynamic SQL builder** (must ensure `?`→`$N` only, table names untouched).

---

## §21 Student Scope

`students`, `user_linked_students`, `parent_students` (junction), `teacher_students`? — tables present: students, parent_students, user_linked_students. `studentRepository` uses `INSERT OR REPLACE` + `INSERT OR IGNORE`. PG-2 converts via `ON CONFLICT`. No domain-rule change. **Class A.**

---

## §22 Finance Scope

`fee_payments`, `expense_records`, `fee_categories`, `payment_methods`, `discount_types`, `currencies`. `financialRepository` uses `INSERT OR REPLACE` (×2). Money columns → `NUMERIC(18,2)` (§15). The `trg_fee_payment_update` trigger encodes fee status business rule → must be reproduced (§11). **Class A (SQL) + B (trigger).**

---

## §23 Migration / Data Preservation Implications

- PG-1 produces **schema-only** migration files (`migrations/postgres/0NN_*.sql`): extensions (none strictly required; optionally `pgcrypto`), master-data DDL, academic DDL, core DDL, triggers, indexes. **No INSERT/data migrations** (per PG-1 constraints).
- Al-Salam data copy (D5) is a **PG-2+** activity: copy SQLite → PG via matching TEXT IDs, validate, verify. PG-1 must NOT create INSERTs.
- `getRealmDB()`/`saveRealmDB()` are NOT modified (explicit PG-1 constraint satisfied — not touched).
- The dual-layer issue (§6) means a data-copy tool must write through the same path used at runtime; until Layer 2 is consolidated (§18 #7-9), the copy target path is ambiguous → **flagged for PG-2**.

---

## §24 Risks

1. **Dual data-access layer** (Layer 2 bypasses `IDataSource`) — highest risk; not visible to a `dataSource.` grep. (B)
2. **Synchronous direct-engine calls** cannot serve async pg. (B)
3. **`is_active = 1` on BOOLEAN** would error. (B, §14)
4. **Trigger business logic** (fee status, book copies) must be reproduced exactly. (B, §11)
5. **`created_by`/`updated_by` from localStorage** contradicts D4 server-side auth. (B, §28)
6. **Missing reference tables** (`book_categories`, `payment_statuses`, `class_rooms`) referenced by `useReferenceData` but absent from schema. (schema gap, §28)
7. **Al-Salam seed defaults** in `SQLiteRepository.getSchoolSettings`/`db.ts` violate D6 (no hardcoded school identity) — must move to School Configuration. (B, §28)
8. **Placeholder converter** must not convert `?` inside literals — current code has none, but converter needs guarding. (A, §17)
9. **Money rounding** if `REAL`→`NUMERIC` without verification. (B, §15)

---

## §25 Files Expected To Change in PG-2

**Infrastructure / new:**
- `src/core/datasource/PostgreSQLDataSource.ts` — add `?`→`$N` conversion (or call `sqlDialect` helper).
- `src/core/datasource/sqlDialect.ts` — **NEW** placeholder/SQL converter helper (recommended).
- `migrations/postgres/001_extensions.sql` — **NEW** (optional `pgcrypto`).
- `migrations/postgres/002_master_data_schema.sql` — **NEW** (33 + audit + permissions DDL).
- `migrations/postgres/003_academic_schema.sql` — **NEW** (academic_years/terms/subjects_master/calendar_days + FKs).
- `migrations/postgres/004_core_schema.sql` — **NEW** (24 core tables).
- `migrations/postgres/005_triggers.sql` — **NEW** (4 triggers as PL/pgSQL).
- `migrations/postgres/006_indexes.sql` — **NEW** (indexes).

**Modified (Layer 1 — mechanical A):**
- `src/core/auth/AuthService.ts` (likely none; already compatible)
- `src/modules/master-data/repository/masterDataRepository.ts`
- `src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository.ts`
- `src/modules/academic/infrastructure/repositories/SQLiteAcademicCalendarRepository.ts`
- `src/modules/academic/infrastructure/repositories/SQLiteCourseAssignmentRepository.ts`
- `src/modules/academic/infrastructure/repositories/SQLiteCurriculumRepository.ts`
- `src/modules/dashboard/repository/dashboardRepository.ts` (likely none)
- `src/modules/financial/repository/financialRepository.ts`
- `src/modules/students/repository/studentRepository.ts`
- `src/modules/teachers/repository/teacherRepository.ts`

**Modified (Layer 2 — B redesign, highest effort):**
- `src/lib/sqlite-repository.ts`
- `src/lib/reference-data/useReferenceData.ts`
- `src/lib/db.ts`
- `src/lib/sqlite-engine.ts` (PG engine or SQLite-only isolation)

---

## §26 Verification Strategy

- **Placeholder converter unit test:** `toPostgresPlaceholders('SELECT * FROM t WHERE a = ? AND b = ?') === 'SELECT * FROM t WHERE a = $1 AND b = $2'`; literal-`?` guard test.
- **SQL generation test (no real PG):** assert `PostgreSQLDataSource` receives `$N` SQL (mock `pg.Pool`); assert `count`/`exists` wrapping preserves numbering.
- **Schema consistency test (no real PG):** parse `migrations/postgres/*.sql` and assert every `sqlite-schema.sql` table/column has a PG counterpart; assert no `INSERT OR REPLACE`/`INSERT OR IGNORE`/`PRAGMA`/`?` remains in PG migration files.
- **Master-data coverage test:** every `TABLE_MAP` key resolves to a PG `CREATE TABLE`.
- **Academic pilot coverage test:** the 4 pilot tables + FKs present.
- **Repository compatibility tests:** for each Layer-1 repo, a test asserting generated SQL uses `$N` and `ON CONFLICT`.
- **Real PostgreSQL environment:** REQUIRED for integration tests (run migrations, round-trip). **Not created in PG-1** (explicit constraint). Document: `REAL POSTGRESQL ENVIRONMENT REQUIRED`.
- **SQLite regression:** existing tests (academic integration, etc.) must still pass; `sqlite-schema.sql` unchanged.

---

## §27 Rollback Strategy

- PG-1 is documentation-only; no code/schema deployed. Rollback = discard the audit doc and any un-merged PG migration files.
- PG-2 rollback: PG migrations are additive/schema-only; if PG activation fails, `DATA_SOURCE_TYPE` remains `sqlite` and the system runs on SQLite unchanged (PG-0 guarantee). No data loss (no INSERT migrations in PG-1/PG-2 schema phase).

---

## §28 Open Questions / Unsupported Patterns (NOT DETERMINED FROM CURRENT REPOSITORY EVIDENCE)

1. **`master_data_permissions` table** is referenced by `masterDataRepository.getPermission` and defined in `migrations/001_master_data.sql` (line 628) but **missing from `sqlite-schema.sql`** (the canonical runtime source). → Schema gap; must be added to PG DDL or the query corrected. **NOT DETERMINED** which is authoritative.
2. **Missing reference tables** `book_categories`, `payment_statuses`, `class_rooms` are queried by `useReferenceData` hooks but absent from `sqlite-schema.sql`. → Either schema gap or dead hooks. **NOT DETERMINED** without product decision.
3. **`created_by`/`updated_by` provenance:** sourced from browser `localStorage` (`getCurrentUserId`/`getCurrentUserName`), contradicting D4 server-side auth. PG-2/RBAC must define server-injected actor. **NOT DETERMINED** how.
4. **UUID vs TEXT id:** no UUIDs used; introducing `gen_random_uuid()` is undecided. **NOT DETERMINED**.
5. **`TIMESTAMP` vs `TIMESTAMPTZ`:** undecided. **NOT DETERMINED**.
6. **`BOOLEAN` vs `SMALLINT`** for flag columns: undecided (§14). **NOT DETERMINED**.
7. **Al-Salam data preservation path** (copy→validate→verify) execution plan is PG-2+, not specified here. **NOT DETERMINED** (intentionally out of PG-1).
8. **Layer-2 consolidation** (route `SQLiteRepository`/`useReferenceData`/`db.ts` through `IDataSource`) is recommended but not mandated by D1–D9. **NOT DETERMINED** as final architecture.

---

## §29 PG-1 Acceptance Criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Canonical schema fully inventoried | ✅ (§3) |
| 2 | All data-access files found (both layers) | ✅ (§6) — Layer 2 discovered beyond `dataSource.` grep |
| 3 | Exact dialect token counts | ✅ (§5/App.B) |
| 4 | Type mapping documented | ✅ (§7) |
| 5 | Parameter strategy defined | ✅ (§17) |
| 6 | PK/UUID strategy | ✅ (§9) |
| 7 | FK/CHECK/UNIQUE/index/trigger mapping | ✅ (§10/11/12) |
| # | Criterion | Status |
| 8 | Repository conversion order | ✅ (§18) |
| 9 | No production code modified | ✅ |
| 10 | No PG DB created/connected | ✅ |
| 11 | No data migration | ✅ |
| 12 | B-class items flagged, not invented | ✅ (§24/§28) |
| 13 | Final verdict issued | ✅ |

---

## §30 Final Verdict

**PG-1 STATUS: READY FOR PG-2**

The audit is complete and grounded entirely in repository evidence. The IDataSource path (Layer 1) is **mechanically convertible** (Class A) once the §17 placeholder converter is added and `INSERT OR REPLACE/IGNORE` → `ON CONFLICT` is applied. The **B-class architectural items** (dual synchronous direct-engine layer, boolean `=1` semantics, trigger reproduction, localStorage actor, missing/Al-Salam tables) are explicitly flagged in §18/§24/§28 and **must be resolved as design decisions in PG-2** — they are not blockers to *completing the PG-1 audit*, but they are mandatory PG-2 work and must not be silently implemented.

**Do NOT start PG-2 in this task. Do NOT create PostgreSQL migrations or a database.**

---

# Appendix A — SQL Inventory (static statements; file:line cited)

Counting method: each distinct SQL string template present in source = 1 statement; `?` count = placeholder occurrences. Dynamic sites (table/column injection) listed separately as DYNAMIC.

**A. Layer 1 — IDataSource repos (80 static statements, 175 placeholders)**

| ID | File | Method | Type | SQL (abbrev) | `?` | SQLite feat | PG action | Class |
|---|---|---|---|---|---|---|---|---|
| A1 | AuthService.ts:33 | login | SELECT | `SELECT id,name,email,role,password_hash FROM users WHERE email=? AND status=?` | 2 | param | keep `$1,$2` | C |
| A2 | AuthService.ts:94 | refreshSession | SELECT | `SELECT id,name,email,role FROM users WHERE id=? AND status=?` | 2 | param | keep | C |
| M2 | masterDataRepository.ts:94-97 | getAll(count) | SELECT COUNT | `SELECT COUNT(*) as cnt FROM ${table} ${where}` | 2 | dyn table/`is_active=?`/`LIKE ?`×4 | convert `?`→`$N`; table whitelisted | A/B |
| M3 | :109-112 | getAll(query) | SELECT | `SELECT * FROM ${table} ${where} ${order} LIMIT ? OFFSET ?` | 2 | dyn+LIMIT/OFFSET | convert; keep LIMIT/OFFSET | A/C |
| M5 | :141 | getById | SELECT | `SELECT * FROM ${table} WHERE id=?` | 1 | param | convert | A |
| M9 | :223 | delete | DELETE | `DELETE FROM ${table} WHERE id=?` | 1 | param | convert | A |
| M10 | :244 | bulkDelete | DELETE | `DELETE FROM ${table} WHERE id=?` | 1 | param | convert | A |
| M11 | :294-296 | logAudit | INSERT | `INSERT INTO master_data_audit_log (...) VALUES (?,×10)` | 10 | param | convert | A |
| M12 | :313-322 | getAuditLogs | SELECT | `SELECT * FROM master_data_audit_log [WHERE entity_type=?] ORDER BY performed_at DESC LIMIT ?` | 2 | param+LIMIT | convert | A/C |
| M13 | :340-343 | generateNextNumber(q) | SELECT | `SELECT * FROM system_numbering WHERE code=? AND is_active=1` | 1 | param | convert | A |
| M14 | :351-354 | generateNextNumber(u) | UPDATE | `UPDATE system_numbering SET next_number=next_number+? WHERE code=? AND is_active=1` | 2 | param | convert | A |
| M15 | :369-372 | getPermission | SELECT | `SELECT can_view,... FROM master_data_permissions WHERE entity_type=?` | 1 | param (table gap §28) | convert | A |
| Y1 | SQLiteAcademicYearRepository.ts:43 | exists | SELECT | `SELECT 1 FROM academic_years WHERE id=?` | 1 | param | convert | A |
| Y2 | :51-55 | save(UPDATE) | UPDATE | `UPDATE academic_years SET code=?,name_ar=?,...,updated_at=CURRENT_TIMESTAMP WHERE id=?` | 10 | param+CURRENT_TIMESTAMP | convert | A |
| Y3 | :71-74 | save(INSERT) | INSERT | `INSERT INTO academic_years (...) VALUES (?,×10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)` | 10 | param+CURRENT_TIMESTAMP | convert | A |
| Y4 | :93 | save(del terms) | DELETE | `DELETE FROM academic_terms WHERE id=?` | 1 | param | convert | A |
| Y5 | :99-103 | save(ins terms) | INSERT | `INSERT INTO academic_terms (...) VALUES (?,×13,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)` | 13 | param | convert | A |
| Y6 | :137 | findById(year) | SELECT | `SELECT * FROM academic_years WHERE id=?` | 1 | param | convert | A |
| Y7 | :143 | findById(terms) | SELECT | `SELECT * FROM academic_terms WHERE academic_year_id=?` | 1 | param | convert | A |
| Y8 | :153 | findByCode(year) | SELECT | `SELECT * FROM academic_years WHERE code=?` | 1 | param | convert | A |
| Y9 | :159 | findByCode(terms) | SELECT | `SELECT * FROM academic_terms WHERE academic_year_id=?` | 1 | param | convert | A |
| Y10 | :167 | getAll(years) | SELECT | `SELECT * FROM academic_years ORDER BY start_date ASC` | 0 | — | keep | C |
| Y11 | :173 | getAll(terms) | SELECT | `SELECT * FROM academic_terms WHERE academic_year_id=?` | 1 | param | convert | A |
| Y12 | :183 | delete | DELETE | `DELETE FROM academic_years WHERE id=?` | 1 | param | convert | A |
| C1 | SQLiteAcademicCalendarRepository.ts:29 | exists | SELECT | `SELECT 1 FROM academic_calendar_days WHERE id=?` | 1 | param | convert | A |
| C2 | :35-39 | save(UPDATE) | UPDATE | `UPDATE academic_calendar_days SET day=?,academic_week=?,is_instructional=?,updated_at=CURRENT_TIMESTAMP WHERE id=?` | 4 | param | convert | A |
| C3 | :43-46 | save(INSERT) | INSERT | `INSERT INTO academic_calendar_days (...) VALUES (?,×4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)` | 4 | param | convert | A |
| C4 | :60 | findById | SELECT | `SELECT * FROM academic_calendar_days WHERE id=?` | 1 | param | convert | A |
| C5 | :68 | findByDate | SELECT | `SELECT * FROM academic_calendar_days WHERE day=?` | 1 | param | convert | A |
| C6 | :76 | getByWeek | SELECT | `SELECT * FROM academic_calendar_days WHERE academic_week=?` | 1 | param | convert | A |
| C7 | :84 | getAll | SELECT | `SELECT * FROM academic_calendar_days ORDER BY day ASC` | 0 | — | keep | C |
| C8 | :91 | delete | DELETE | `DELETE FROM academic_calendar_days WHERE id=?` | 1 | param | convert | A |
| CA1 | SQLiteCourseAssignmentRepository.ts:29 | exists | SELECT | `SELECT 1 FROM subjects WHERE id=?` | 1 | param | convert | A |
| CA2 | :35-39 | save(UPDATE) | UPDATE | `UPDATE subjects SET subject_id=?,teacher_id=?,class_id=?,weekly_hours=?,updated_at=CURRENT_TIMESTAMP WHERE id=?` | 5 | param | convert | A |
| CA3 | :43-47 | save(INSERT) | INSERT | `INSERT INTO subjects (...) VALUES (?,×5,100.0,50.0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)` | 5 | param | convert | A |
| CA4 | :61 | findById | SELECT | `SELECT * FROM subjects WHERE id=?` | 1 | param | convert | A |
| CA5 | :69 | getBySubject | SELECT | `SELECT * FROM subjects WHERE subject_id=?` | 1 | param | convert | A |
| CA6 | :77 | getByTeacher | SELECT | `SELECT * FROM subjects WHERE teacher_id=?` | 1 | param | convert | A |
| CA7 | :85 | getByGradeLevel | SELECT | `SELECT * FROM subjects WHERE class_id=?` | 1 | param | convert | A |
| CA8 | :93 | getByCurriculum | SELECT | `SELECT * FROM subjects` | 0 | — | keep | C |
| CA9 | :98 | getAll | SELECT | `SELECT * FROM subjects` | 0 | — | keep | C |
| CA10 | :103 | delete | DELETE | `DELETE FROM subjects WHERE id=?` | 1 | param | convert | A |
| CU1 | SQLiteCurriculumRepository.ts:28 | exists | SELECT | `SELECT 1 FROM subjects_master WHERE id=?` | 1 | param | convert | A |
| CU2 | :34-38 | save(UPDATE) | UPDATE | `UPDATE subjects_master SET code=?,name_ar=?,name_en=?,description=?,grade_level_id=?,is_active=?,display_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?` | 8 | param | convert | A |
| CU3 | :52-55 | save(INSERT) | INSERT | `INSERT INTO subjects_master (...) VALUES (?,×8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)` | 8 | param | convert | A |
| CU4 | :79 | findById | SELECT | `SELECT * FROM subjects_master WHERE id=?` | 1 | param | convert | A |
| CU5 | :87 | findByCode | SELECT | `SELECT * FROM subjects_master WHERE code=?` | 1 | param | convert | A |
| CU6 | :95 | getByStage | SELECT | `SELECT * FROM subjects_master ORDER BY display_order ASC` | 0 | — | keep | C |
| CU7 | :103 | getByGradeLevel | SELECT | `SELECT * FROM subjects_master WHERE grade_level_id=? ORDER BY display_order ASC` | 1 | param | convert | A |
| CU8 | :111 | getAll(active) | SELECT | `SELECT * FROM subjects_master WHERE is_active=1 ORDER BY display_order ASC` | 0 | `is_active=1` (§14) | keep/decide | B |
| CU9 | :113 | getAll(all) | SELECT | `SELECT * FROM subjects_master ORDER BY display_order ASC` | 0 | — | keep | C |
| CU10 | :119 | delete | DELETE | `DELETE FROM subjects_master WHERE id=?` | 1 | param | convert | A |
| D1 | dashboardRepository.ts:51 | getKpis | SELECT | `SELECT * FROM attendance_records ORDER BY date DESC` | 0 | — | keep | C |
| D2 | :126 | getTopStudents | SELECT | `SELECT * FROM certificates ORDER BY percentage DESC` | 0 | — | keep | C |
| D3 | :130 | getTopStudents | SELECT | `SELECT * FROM school_classes` | 0 | — | keep | C |
| D4 | :153 | getStruggling | SELECT | `SELECT * FROM school_classes` | 0 | — | keep | C |
| D5 | :201 | getMostAbsent | SELECT | `SELECT * FROM school_classes` | 0 | — | keep | C |
| D6 | :205 | getMostAbsent | SELECT | `SELECT * FROM attendance_records` | 0 | — | keep | C |
| D7 | :235 | getClassDistribution | SELECT | `SELECT * FROM school_classes` | 0 | — | keep | C |
| D8 | :259 | getNotifications | SELECT | `SELECT * FROM app_notifications ORDER BY created_at DESC` | 0 | — | keep | C |
| D9 | :319 | getSettings | SELECT | `SELECT ... FROM school_settings WHERE id=1` | 0 | literal id=1 | keep | C |
| F1 | financialRepository.ts:25 | getAllPayments | SELECT | `SELECT id,... FROM fee_payments ORDER BY due_date DESC` | 0 | — | keep | C |
| F2 | :49 | getAllExpenses | SELECT | `SELECT id,... FROM expense_records ORDER BY date DESC` | 0 | — | keep | C |
| F3 | :72 | savePayment | INSERT OR REPLACE | `INSERT OR REPLACE INTO fee_payments (...) VALUES (?,×12)` | 12 | **OR REPLACE** | →`ON CONFLICT(id) DO UPDATE` | A/B |
| F4 | :97 | saveExpense | INSERT OR REPLACE | `INSERT OR REPLACE INTO expense_records (...) VALUES (?,×9)` | 9 | **OR REPLACE** | →`ON CONFLICT(id) DO UPDATE` | A/B |
| S1 | studentRepository.ts:25 | getAll | SELECT | `SELECT id,... FROM students ORDER BY name ASC` | 0 | — | keep | C |
| S2 | :51 | getById | SELECT | `SELECT id,... FROM students WHERE id=?` | 1 | param | convert | A |
| S3 | :79 | getByClass | SELECT | `SELECT id,... FROM students WHERE class_id=? ORDER BY name ASC` | 1 | param | convert | A |
| S4 | :106 | save | INSERT OR REPLACE | `INSERT OR REPLACE INTO students (...) VALUES (?,×15)` | 15 | **OR REPLACE** | →`ON CONFLICT(id) DO UPDATE` | A/B |
| S5 | :132 | save(link) | INSERT OR IGNORE | `INSERT OR IGNORE INTO parent_students (parent_id,student_id) VALUES (?,?)` | 2 | **OR IGNORE** | →`ON CONFLICT(parent_id,student_id) DO NOTHING` | A |
| S6 | :141 | delete | DELETE | `DELETE FROM students WHERE id=?` | 1 | param | convert | A |
| T1 | teacherRepository.ts:25 | getAll | SELECT | `SELECT id,... FROM teachers ORDER BY name ASC` | 0 | — | keep | C |
| T2 | :32 | getAll(subj) | SELECT | `SELECT subject_id FROM teacher_subjects WHERE teacher_id=?` | 1 | param | convert | A |
| T3 | :36 | getAll(cls) | SELECT | `SELECT class_id FROM teacher_classes WHERE teacher_id=?` | 1 | param | convert | A |
| T4 | :59 | getById | SELECT | `SELECT id,... FROM teachers WHERE id=?` | 1 | param | convert | A |
| T5 | :83 | save | INSERT OR REPLACE | `INSERT OR REPLACE INTO teachers (...) VALUES (?,×10)` | 10 | **OR REPLACE** | →`ON CONFLICT(id) DO UPDATE` | A/B |
| T6 | :101 | save(del ts) | DELETE | `DELETE FROM teacher_subjects WHERE teacher_id=?` | 1 | param | convert | A |
| T7 | :104 | save(ins ts) | INSERT OR IGNORE | `INSERT OR IGNORE INTO teacher_subjects (teacher_id,subject_id) VALUES (?,?)` | 2 | **OR IGNORE** | →`ON CONFLICT DO NOTHING` | A |
| T8 | :111 | save(del tc) | DELETE | `DELETE FROM teacher_classes WHERE teacher_id=?` | 1 | param | convert | A |
| T9 | :114 | save(ins tc) | INSERT OR IGNORE | `INSERT OR IGNORE INTO teacher_classes (teacher_id,class_id) VALUES (?,?)` | 2 | **OR IGNORE** | →`ON CONFLICT DO NOTHING` | A |
| T10 | :124 | delete | DELETE | `DELETE FROM teachers WHERE id=?` | 1 | param | convert | A |

**B. Layer 2 — `sqlite-repository.ts` (54 static statements, 195 placeholders)** — pattern: `getX` = `SELECT <cols> FROM x ORDER BY …`; `saveX` = `INSERT OR REPLACE INTO x (…) VALUES (?,…)`; child links = `DELETE … WHERE fk=?` + `INSERT OR IGNORE INTO link (a,b) VALUES (?,?)`.

| Group | Method(s) | Statement type | `?` | SQLite feat | PG action | Class |
|---|---|---|---|---|---|---|
| SR0 | getSchoolSettings | SELECT `… FROM school_settings WHERE id=1` | 0 | literal id=1 | keep | C |
| SR0b | updateSchoolSettings | `INSERT OR REPLACE INTO school_settings (…) VALUES (1,?,×13)` | 14 | **OR REPLACE** | →`ON CONFLICT(id) DO UPDATE` | A/B |
| SR1 | getUsers / saveUser(+subq/del/ins links) | SELECT users; `SELECT student_id FROM user_linked_students WHERE user_id=?`; `INSERT OR REPLACE users (?,×11)`; `DELETE user_linked_students WHERE user_id=?`; `INSERT OR IGNORE user_linked_students (?,?)` | 1+11+1+2 | **OR REPLACE/IGNORE** | convert + `ON CONFLICT` | A/B |
| SR2 | getTeachers / saveTeacher(+2 subq + del/ins teacher_subjects + del/ins teacher_classes + deleteTeacher) | as above for teachers/teacher_subjects/teacher_classes | 1+10+1+2+1+2+1 | **OR REPLACE/IGNORE** | convert + `ON CONFLICT` | A/B |
| SR3 | getParents(+subq) | SELECT parents; `SELECT student_id FROM parent_students WHERE parent_id=?` | 1 | param | convert | A |
| SR4 | getClasses(+sec subq)/saveClass(+sec) | SELECT school_classes; `SELECT … FROM sections WHERE class_id=?`; `INSERT OR REPLACE school_classes (?,?,?)`; `INSERT OR REPLACE sections (?,×6)` | 1+3+6 | **OR REPLACE** | convert + `ON CONFLICT` | A/B |
| SR5 | getStudents/saveStudent(+ins parent_students)/deleteStudent | SELECT students; `INSERT OR REPLACE students (?,×15)`; `INSERT OR IGNORE parent_students (?,?)`; `DELETE students WHERE id=?` | 15+2+1 | **OR REPLACE/IGNORE** | convert + `ON CONFLICT` | A/B |
| SR6 | getSubjects/saveSubject/deleteSubject | SELECT subjects; `INSERT OR REPLACE subjects (?,×9)`; `DELETE subjects WHERE id=?` | 9+1 | **OR REPLACE** | convert + `ON CONFLICT` | A/B |
| SR7 | getSchedulePeriods/saveSchedulePeriod/deleteSchedulePeriod | `INSERT OR REPLACE schedule_periods (?,×9)` | 9+1 | **OR REPLACE** | convert | A/B |
| SR8 | getAttendanceRecords/saveAttendanceRecord/deleteAttendanceRecord | `INSERT OR REPLACE attendance_records (?,×9)` | 9+1 | **OR REPLACE** | convert | A/B |
| SR9 | getGradeRecords/saveGradeRecord/deleteGradeRecord | `INSERT OR REPLACE grade_records (?,×10)` | 10+1 | **OR REPLACE** | convert | A/B |
| SR10 | getCertificates/saveCertificate | `INSERT OR REPLACE certificates (?,×10)` | 10 | **OR REPLACE** | convert | A/B |
| SR11 | getFeePayments/saveFeePayment | `INSERT OR REPLACE fee_payments (?,×12)` | 12 | **OR REPLACE** | convert | A/B |
| SR12 | getExpenses/saveExpense | `INSERT OR REPLACE expense_records (?,×9)` | 9 | **OR REPLACE** | convert | A/B |
| SR13 | getLibraryBooks/saveLibraryBook | `INSERT OR REPLACE library_books (?,×11)` | 11 | **OR REPLACE** | convert | A/B |
| SR14 | getBookBorrowings(JOIN)/saveBookBorrowing | `INSERT OR REPLACE book_borrowings (?,×9)` | 9 | **OR REPLACE** | convert | A/B |
| SR15 | getNotifications/saveNotification | `INSERT OR REPLACE app_notifications (?,×9)` | 9 | **OR REPLACE** | convert | A/B |
| SR16 | getAuditLogs(`LIMIT 100`)/saveAuditLog | `INSERT OR REPLACE audit_logs (?,×8)` | 8 | **OR REPLACE**+LIMIT | convert; LIMIT kept | A/B/C |
| SR17 | getSavedReports/saveSavedReport/deleteSavedReport | `INSERT OR REPLACE saved_reports (?,×9)`; `DELETE saved_reports WHERE id=?` | 9+1 | **OR REPLACE** | convert | A/B |

**C. Layer 2 — `useReferenceData.ts`**
| RD1 | fetchSync | SELECT | `SELECT * FROM ${tableName} WHERE is_active=1 ORDER BY ${orderBy}` | 0 | **DYNAMIC table/orderBy**; `is_active=1` (§14) | DYNAMIC / NOT DETERMINED (table injection) |

**DYNAMIC / NOT DETERMINED SQL sites (7):**
- `masterDataRepository.getAll` (count + query), `isFieldUnique`, `create`, `update`, `bulkDelete`, `getChildRelations` — table/column/fk injected via `${}`.
- `useReferenceData.fetchSync` — table name injected via `${tableName}`.

**Totals:** 135 static statements enumerated; **370 `?` placeholders** (Layer1 175 + Layer2 195 + RD 0); **7 dynamic sites**.

---

# Appendix B — SQLite Dialect Token Inventory

| Token | Exact count | Files | Classification | Required action |
|---|---|---|---|---|
| `INSERT OR REPLACE` | 22 | sqlite-repository.ts(18), teacherRepository.ts(1), studentRepository.ts(1), financialRepository.ts(2) | A (must change) | `INSERT … ON CONFLICT (id) DO UPDATE SET …` |
| `INSERT OR IGNORE` | 7 | sqlite-repository.ts(4), studentRepository.ts(1), teacherRepository.ts(2) | A (must change) | `INSERT … ON CONFLICT (key) DO NOTHING` |
| `PRAGMA foreign_keys` | 2 | sqlite-engine.ts(124,134) | A (infra) | Remove (PG enforces FK) |
| `SELECT changes(), last_insert_rowid()` | 1 | sqlite-engine.ts(233) | A (infra) | Use pg `rowCount`; drop `lastInsertRowid` (IDs app-generated) |
| `COALESCE` | 1 | masterDataRepository.ts(86) | C (compatible) | Keep |
| `LIMIT` | 3 | sqlite-repository.ts(734), masterDataRepository.ts(110,321) | C (compatible) | Keep |
| `OFFSET` | 1 | masterDataRepository.ts(110) | C (compatible) | Keep |
| `datetime`/`strftime`/`date`/`julianday`/`time` | 0 (actual) | — | — | None present (23 grep hits false positives from `date(` matching `update(`/`validate(`/`invalidate(`) |
| `IFNULL` | 0 | — | — | None |
| `AUTOINCREMENT` | 0 | — | — | None |
| `ON CONFLICT` | 0 | — | — | None (target syntax, not present in SQLite) |
| `RETURNING` | 0 | — | — | None |
| `?` placeholder | 370 (static) + 7 dynamic sites | all repos + sqlite-repository + useReferenceData | A (convert) | `?`→`$1,$2,…` via `sqlDialect` helper |

---

# Appendix C — Repository Conversion Matrix

| Repository | Tables | SQL stmts | FG change | Risk | Order |
|---|---|---|---|---|---|
| PostgreSQLDataSource (+sqlDialect) | — | — | add `?`→`$N` | Low | 1 |
| masterDataRepository | 33 master + audit + permissions | 9 static + 6 dyn | `ON CONFLICT` n/a; `is_active=1` if BOOLEAN; dynamic builder | Med | 2 |
| SQLiteAcademicYearRepository | academic_years, academic_terms | 12 | `INSERT/UPDATE` branches already PG-compatible; `CURRENT_TIMESTAMP` kept | Low | 3 |
| SQLiteAcademicCalendarRepository | academic_calendar_days | 8 | compatible | Low | 3 |
| SQLiteCurriculumRepository | subjects_master | 10 | compatible; `is_active=1` if BOOLEAN | Low/Med | 3 |
| SQLiteCourseAssignmentRepository | subjects | 10 | compatible | Low | 3 |
| studentRepository | students, parent_students | 6 | `INSERT OR REPLACE/IGNORE`→`ON CONFLICT` | Low | 4 |
| teacherRepository | teachers, teacher_subjects, teacher_classes | 10 | `INSERT OR REPLACE/IGNORE`→`ON CONFLICT` | Low | 4 |
| financialRepository | fee_payments, expense_records | 4 | `INSERT OR REPLACE`→`ON CONFLICT` | Low | 4 |
| AuthService | users | 2 | none (compatible) | Low | 5 |
| dashboardRepository | attendance_records, certificates, school_classes, app_notifications, school_settings | 9 | none (compatible) | Low | 6 |
| **sqlite-repository.ts** | 18 entity groups (core) | 54 | **sync→async; OR REPLACE/IGNORE→ON CONFLICT; route via IDataSource** | **High** | 7 (B) |
| **useReferenceData.ts** | master-data ref tables (+missing) | 1 dyn | **sync hook→async; dynamic table; missing tables** | **High** | 8 (B) |
| **db.ts** | orchestrates SQLiteRepository | — | depends on #7 | **High** | 9 (B) |
| **sqlite-engine.ts** | infra | — | PRAGMA removal; changes() handling; PG engine or SQLite-only | Med | 10 (A infra) |

---

**END OF PG-1 AUDIT — READY FOR PG-2. No code modified. No PostgreSQL database created. No data migrated.**
