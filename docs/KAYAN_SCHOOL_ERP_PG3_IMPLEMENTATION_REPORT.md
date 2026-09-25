# Kayan School ERP — PG-3 Implementation & Verification Report

**Phase:** PG-3 — LIVE POSTGRESQL INTEGRATION
**Date:** 2026-08-24
**Status:** **PG-3: PASS — READY FOR PG-4**
**Constraints preserved:** no Al-Salam data migration, SQLite untouched,
`getRealmDB()`/`saveRealmDB()` preserved, no tenant_id, no offline sync, no
business-rule changes, no PG-4 start, password never hardcoded/printed/exposed.

---

## 1. Connection Verification
Credentials were supplied **only** through the environment (User-scope
`PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`). `PGPASSWORD` was used exclusively
via `getPostgresConfig()` and was **never printed, echoed, logged, or asserted**
in any output. Live probe:

```
PostgreSQL 16.13, compiled by Visual C++ build 1944, 64-bit
Host: localhost   Port: 5432   User: postgres   (password: from env, hidden)
```

The dedicated test datasource targets the `kayan_school_erp` database
(overridden in the live test so the default `postgres` DB is never touched).

---

## 2. Database Inspection (pre-existing, NOT modified)
Inspected `pg_database`. Existing databases present in the server instance
(`ERP`, `kayan_erp`, `military_*`, `accounting_ai`, `erp_ai`,
`future_school_erp`, `postgres`, `template0/1`, …) were **inspected only and left
untouched**. The system `postgres` database was **not** modified or dropped.
PG-3 created exactly one new dedicated database: `kayan_school_erp`.

---

## 3. Schema Application
- Created `kayan_school_erp` **only because it did not exist** (`CREATE DATABASE`
  was conditional).
- Applied `migrations/postgres/001_kayan_pilot_schema.sql` (`psql -v
  ON_ERROR_STOP=1 -f …`) → **APPLY_EXIT=0**.
- Result: **7 tables** (`academic_years`, `academic_terms`, `subjects_master`,
  `academic_calendar_days`, `education_stages`, `grade_levels`, `subjects`),
  **28 indexes** (PK, UNIQUE keys, and the custom `idx_*` indexes), and **21
  constraints**: PK on every table, UNIQUE(`code`) on each, FK
  `grade_levels→education_stages` (SET NULL), `academic_terms→academic_years`
  (CASCADE), `subjects_master→grade_levels` (SET NULL), and CHECK constraints
  (`max_score > 0`, `0 <= pass_score <= max_score`, `weekly_hours > 0`).
- Verified column types: `is_active/is_current` → **smallint**,
  `created_at/updated_at` → **timestamp without time zone**, `max_score/
  pass_score` → **numeric** (D7/D8/D9 confirmed live).

---

## 4. Live DataSource Verification (real PostgreSQL 16)
`PostgreSQLDataSource` exercised against the live server:
- `query()` / `queryOne()` return real rows with correct columns (verified the 7
  pilot tables exist via `information_schema`).
- `execute()` returns correct affected-row count (`changes`).
- `count()` / `exists()` return correct booleans/numbers.
- `transaction()` commits on success and rolls back on error.
- `? → $N` placeholder translation verified through the real datasource path
  (single and multi-parameter).
- `close()` releases the `pg` pool so the test process exits cleanly.

**Two genuine PostgreSQL incompatibilities were found and fixed at the single
dialect boundary (no repository/business logic changed):**
1. `COUNT(*)` returns a `string` from `pg` (int8). `count()`/`exists()` now
   coerce to `Number` so the `IDataSource` contract (number) holds.
2. `pg` returns `DATE`/`TIMESTAMP` columns as `Date` objects, but the existing
   mappers (written for SQLite's string dates) broke. `PostgreSQLDataSource`
   now registers `types.setTypeParser` for OIDs 1082/1114/1184 to return
   **strings**, keeping the dialect difference contained in one place.

---

## 5. CRUD Verification (real rows, cleaned up after)
Real `INSERT → SELECT → UPDATE → DELETE` on `academic_years` verified:
returned row content, affected-row counts (`changes`), `count()`/`exists()`
behavior, and final deletion. Temporary records used `pg3_*` ids/codes and were
removed in `after()`; a follow-up query confirmed **0 leftover rows** in
`academic_years`/`academic_terms`/`subjects`.

---

## 6. Transaction Verification (real PostgreSQL)
- **COMMIT**: a transaction with one INSERT persisted (`success:true`, row
  present after).
- **ROLLBACK**: a transaction whose second statement violated the PK rolled back
  entirely (`success:false`); the original row remained intact (no partial
  commit).
- **FK constraint**: inserting an `academic_terms` row referencing a
  non-existent year returned `success:false` with a foreign-key error message.
- **ON CONFLICT**:
  - `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`: duplicate key left a single
    unchanged row.
  - `INSERT OR REPLACE` → `ON CONFLICT (id) DO UPDATE SET …`: duplicate key
    updated the existing row (verified new `name_ar`/`is_active`).

---

## 7. DataSourceFactory Verification
- `DATA_SOURCE_TYPE=sqlite` → `SQLiteDataSource` (default unchanged).
- `DATA_SOURCE_TYPE=postgresql` → `PostgreSQLDataSource` (via dynamic import,
  so `pg` never enters the browser bundle).
- PostgreSQL mode was confirmed to **actually reach the live `kayan_school_erp`
  database** (queried `information_schema` and observed ≥7 public tables).

---

## 8. Academic Pilot Results (real persistence)
Used the **existing academic runtime path** (`SQLiteAcademicYearRepository` /
`SQLiteCourseAssignmentRepository` constructed with the live
`PostgreSQLDataSource`) — no new academic code, only the injected datasource.
- **AcademicYearRepository**: `AcademicYear.create` → `save` (INSERT year +
  term) → `findById` (status `draft`, 1 term) → `approve`+`save` (UPDATE, status
  `approved`) → `activate`+`save` (UPDATE, status `active`, `is_current=1`) →
  `delete` (CASCADE removed the term) → `findById` returns `null`.
- **CourseAssignmentRepository**: `save` (INSERT into `subjects`) → `findById`
  → `save` with new `weeklyPeriods` (UPDATE) → `findById` reflects update →
  `delete` → `findById` returns `null`.
Only the explicitly verified pilot scope is reported; the entire application is
**not** claimed to have migrated to PostgreSQL.

---

## 9. Security Verification
- `PGPASSWORD` appears in source **only** as `process.env.PGPASSWORD` reads
  (postgresConfig.ts) and a guard in the test; **no hardcoded credentials**.
- No `PGPASSWORD=` / `DATABASE_URL=` literals anywhere in `src`.
- `AuthService.ts` contains **no `password_hash`** (server-side auth boundary
  intact; sanitized DTOs).
- Live test reads credentials from env and never logs them; no password appears
  in test output, the git diff, or this report.
- `pg` is externalized in `vite.config.ts` and loaded via dynamic `import()`, so
  no PostgreSQL connection/password reaches the browser bundle.

---

## 10. Regression Results (full suite)
```
tests 121   suites 12   pass 121   fail 0   skipped 0   todo 0
```
Includes the 14 new live PostgreSQL integration tests (all passing) plus the
existing 107 (PG-2 dialect/repo-SQL/migration + PG-0 + academic integration +
25 academic/student domain suites). SQLite path remains fully green.

---

## 11. Build Result
`npm run build` → **exit 0**.

---

## 12. TypeScript Baseline Comparison
`npx tsc --noEmit` → **exit 2**, with **exactly the 12 pre-existing baseline
errors** (same files/lines as before PG-3). No new TypeScript errors were
introduced by PG-3. Baseline set:
- `src/App.tsx(82,13)`, `src/App.tsx(148,8)`
- `src/components/ActiveReportPrintView.tsx(305,7)`
- `src/components/GlobalSearchBar.tsx(300,48)`, `(302,17)`, `(308,48)`,
  `(310,17)`, `(316,48)`, `(318,17)`, `(324,48)`, `(326,17)`

Each was compared line-by-line against the established baseline and matches;
none are PG-3 regressions.

---

## 13. Migration / Data-Safety Status
- **No Al-Salam production/customer data was migrated.** PG-3 only applied the
  approved **pilot schema** and exercised **test records** (all cleaned up).
- The original Al-Salam SQLite database was **not read, modified, or deleted**.
- `getRealmDB()` / `saveRealmDB()` are **untouched**.
- The running `postgres` system DB and all other existing databases were
  inspected but **not altered**.
- No destructive cutover was performed.

---

## 14. Git Diff Classification (Phase 10)
PG-3 session changes (the only files modified/added **in this phase**):
- **A — required for PG-3**
  - `src/core/datasource/PostgreSQLDataSource.ts` — added `close()`; DATE/
    TIMESTAMP string normalization at the dialect boundary; `count()`/`exists()`
    numeric coercion (fixes the two genuine PG incompatibilities above).
  - `src/core/datasource/postgres.live.test.ts` — new live integration suite
    (Phases 3–6), env-only credentials, skips gracefully if PG env is absent.
  - `docs/KAYAN_SCHOOL_ERP_PG3_IMPLEMENTATION_REPORT.md` — this report.

Prior-phase working-tree artifacts (R3 / PG-0 / PG-1 / PG-2) present in the
repository and **intentionally NOT reverted** (per directive): `package.json`,
`package-lock.json`, `scripts/asset-loader.mjs`, `server.ts`,
`src/core/auth/AuthService.ts`, `src/core/auth/IAuthProvider.ts`,
`src/core/datasource/DataSourceFactory.ts`, `src/lib/sqlite-schema.sql`,
`vite.config.ts`, and the untracked PG-0/PG-2 docs, tests, `sqlDialect.ts`,
`postgresConfig.ts`, `migrations/postgres/`, and master-data scripts. None were
introduced by PG-3; none contain credentials.

**No secrets in any diff** (verified: no `PGPASSWORD=`/`DATABASE_URL=` literals).

---

## 15. Exact Remaining Blockers
**None.** All PG-3 phases (2–10) completed with live verification. The only
known issues are the 12 **pre-existing, pre-PG-3** TypeScript errors listed in
§12, which are unrelated to PostgreSQL and were not introduced by this phase.

---

# PG-3: PASS — READY FOR PG-4
