# Kayan School ERP — PG-2 Implementation & Verification Report

**Phase:** PG-2 — PostgreSQL SQL Dialect Layer, Repository Compatibility & Pilot Schema (schema/dialect preparation only)
**Date:** 2026-08-24
**Author:** opencode (agent)
**Status decision source:** Finalized Product Owner decisions D1–D9 + the PG-2 directive (SMALLINT / TIMESTAMP / NUMERIC(18,2)).

---

## 1. Objective & Scope

PG-2 delivers the PostgreSQL **dialect layer**, makes the existing `IDataSource`-based
repositories PostgreSQL-compatible **without modifying repository code**, and creates the
**PostgreSQL pilot schema migrations**. Per the directive this is schema/dialect preparation
only:

- **No** Al-Salam data migration.
- **No** PostgreSQL database was created; no live PostgreSQL server is used.
- **No** removal of SQLite; `getRealmDB()` / `saveRealmDB()` and the SQLite schema are untouched.
- **No** multi-school `tenant_id` (D3); **no** offline sync engine (D1); auth/RBAC preserved (D4).

### Schema-type decisions applied (finalized)
| Concern | Decision | Rationale |
|---------|----------|-----------|
| Boolean-like flags (`is_active`, `is_current`, `is_instructional`, …) | **SMALLINT** (0/1) | Preserves existing SQLite 0/1 semantics; no boolean coercion needed. |
| Timestamps (`created_at`, `updated_at`) | **TIMESTAMP** | Preserves stored UTC values without timezone conversion. |
| Money (`max_score`, `pass_score`, …) | **NUMERIC(18,2)** | Exact financial precision. |
| IDs (`id`) | **TEXT** PRIMARY KEY | Preserves existing `md_<ts>_<rand>` identifiers and Al-Salam copy fidelity. UUID generation deferred (NOT DETERMINED for this phase). |
| Calendar columns (`start_date`, `end_date`, `day`) | **DATE** | Values are ISO calendar dates. |

Because flags are SMALLINT (not BOOLEAN), the dialect layer performs **no** boolean
coercion — `0`/`1` are valid for SMALLINT in both engines. This removed the risky boolean
coercion that an earlier BOOLEAN-based draft required.

---

## 2. Files Changed (PG-2)

### 2.1 New files — required for PG-2 (Classification A)
| File | Purpose |
|------|---------|
| `src/core/datasource/sqlDialect.ts` | Pure SQLite→PostgreSQL transforms: `toPostgresPlaceholders`, `convertInsertOrIgnore`, `convertInsertOrReplace`, `resolveConflictTarget`, `preparePostgresStatement`, `DEFAULT_CONFLICT_TARGETS`. |
| `src/core/datasource/sqlDialect.test.ts` | Unit tests for the dialect helpers. |
| `src/core/datasource/pg2RepositorySql.test.ts` | Verifies the pipeline over the **actual SQL shapes** emitted by academic / master-data / student / teacher / financial repositories. |
| `migrations/postgres/001_kayan_pilot_schema.sql` | PostgreSQL pilot schema (education_stages, grade_levels, academic_years, academic_terms, subjects_master, academic_calendar_days, subjects). |
| `migrations/postgres/migrations.test.ts` | Structural validation of the migration files. |

### 2.2 Modified file — required for PG-2 (Classification A)
| File | Change |
|------|--------|
| `src/core/datasource/PostgreSQLDataSource.ts` | Every statement now routes through `preparePostgresStatement()` before reaching `pg`. This is the **single boundary** where dialect differences are resolved, so repositories need no dialect branches. |

### 2.3 Carried from PG-0 (unchanged in PG-2, required for the PG path / tests) — Classification B
`src/core/datasource/postgresConfig.ts`, `src/core/datasource/DataSourceFactory.ts`,
`server.ts`, `vite.config.ts`, `scripts/asset-loader.mjs`, `package.json` /
`package-lock.json` (the `pg` dependency), `src/core/auth/AuthService.ts`,
`src/core/auth/IAuthProvider.ts` (PG-0 security fix: no `password_hash` in client state).

### 2.4 Explicitly NOT modified by PG-2 (verified)
- `src/lib/sqlite-repository.ts`, `src/lib/db.ts`, `src/lib/sqlite-engine.ts` — SQLite runtime untouched.
- `getRealmDB()` / `saveRealmDB()` — preserved.
- All HTTP/API route files — no API-layer source changed in PG-2.
- `src/lib/sqlite-schema.sql` — only changed earlier in R3 (pre-PG-2), not touched by PG-2.

### 2.5 Classification summary
- **A (required for PG-2):** 6 files (5 new + 1 modified) listed in 2.1–2.2.
- **B (indirectly required):** PG-0 scaffolding listed in 2.3.
- **C (unrelated/out-of-scope):** none introduced by PG-2.

---

## 3. SQLite → PostgreSQL Dialect Mappings

| SQLite construct | PostgreSQL transform | Implementation | Behavioral equivalence |
|------------------|---------------------|----------------|------------------------|
| `?` positional param | `$1, $2, …` | `toPostgresPlaceholders` (skips string literals, `--` line & `/* */` block comments; preserves order) | Exact 1:1 mapping; order preserved. |
| `INSERT OR IGNORE … VALUES (…)` | `INSERT … VALUES (…) ON CONFLICT DO NOTHING` | `convertInsertOrIgnore` | SQLite ignores the row on any uniqueness violation; `ON CONFLICT DO NOTHING` (no target) does exactly that. |
| `INSERT OR REPLACE INTO t (cols) VALUES (…)` | `INSERT … VALUES (…) ON CONFLICT (pk) DO UPDATE SET <non-pk cols> = EXCLUDED.<col>` | `convertInsertOrReplace(sql, resolveConflictTarget(sql))` | Upsert. `DEFAULT_CONFLICT_TARGETS` maps `teachers/students/fee_payments/expense_records → ['id']`; unknown tables default to `['id']`. |
| `CURRENT_TIMESTAMP`, `COALESCE`, `LIMIT`, `OFFSET`, `=`/`<>`, `AND`/`OR` | Unchanged (natively supported by PostgreSQL) | — | Direct. |
| `PRAGMA`, `changes()`, `last_insert_rowid()` | Not present in repository SQL (only in `sqlite-engine.ts` infra, which is SQLite-only and untouched) | — | N/A — PG path uses `pg` `rowCount`. |
| Boolean flags `0/1` | **No conversion** (SMALLINT accepts `0/1`) | — | Preserves SQLite semantics. |

**Boundary-translation design:** `PostgreSQLDataSource` is the only place that knows it is
talking to PostgreSQL. Repositories still emit SQLite-style SQL; the datasource translates it.
This keeps the `IDataSource` abstraction intact and guarantees SQLite keeps working unchanged.

---

## 4. Schema Decisions (pilot)

`migrations/postgres/001_kayan_pilot_schema.sql` creates, in dependency order:
`education_stages` → `grade_levels` (FK→education_stages) → `academic_years` →
`academic_terms` (FK→academic_years, `ON DELETE CASCADE`) → `subjects_master`
(FK→grade_levels, `ON DELETE SET NULL`) → `academic_calendar_days` → `subjects`.
All id TEXT PK, flags SMALLINT, timestamps TIMESTAMP, money NUMERIC(18,2), calendar DATE,
with `CHECK` constraints (`weekly_hours > 0`, `max_score > 0`, `pass_score BETWEEN 0 AND
max_score`), `UNIQUE` on `code`, and the indexes required by the repositories.

**NOT DETERMINED FROM CURRENT REPOSITORY EVIDENCE (documented, deferred):**
- `subjects` references `school_classes` and `teachers` in the canonical SQLite schema; those
  tables are outside the approved pilot scope, so their FKs are intentionally omitted and will
  be added in the full schema phase.
- UUID PKs deferred; TEXT PKs preserve `md_<ts>_<rand>` identifiers and Al-Salam copy fidelity.

---

## 5. Tests & Exact Results

### 5.1 Discovery
A glob over `src/**/*.test.ts` and `migrations/**/*.test.ts` discovered **32 test files** in
11 top-level suites. All were executed by the single `tsx --test` run.

Discovered suites (grouped):
- **PG-2 specific (6 files):** `sqlDialect.test.ts`, `pg2RepositorySql.test.ts`,
  `migrations/postgres/migrations.test.ts`, `PostgreSQLDataSource.test.ts`,
  `DataSourceFactory.test.ts`, `AuthService.security.test.ts`.
- **Academic regression:** `academic/tests/integration/academicIntegration.test.ts`
  (exercises **real SQLite** persistence through the academic repositories) + 15 academic
  domain value-object suites.
- **Student regression:** 9 student domain value-object suites + `aggregates/Student.test.ts`.

### 5.2 Result
```
ℹ tests   107
ℹ suites  11
ℹ pass    107
ℹ fail    0
ℹ skipped 0
ℹ todo    0
```
- **PG-2 dialect tests:** all pass (placeholder numbering/order, comment/string-literal safety,
  `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`, `INSERT OR REPLACE` → `ON CONFLICT (id) DO
  UPDATE SET …`, full-pipeline idempotency, `is_active = 1` left untouched for SMALLINT).
- **PG-2 repository-SQL tests:** all pass (academic INSERT/SELECT + student/teacher/financial
  `INSERT OR REPLACE`/`INSERT OR IGNORE` shapes produce aligned `$N` params).
- **PG-2 migration tests:** all pass (non-empty, no SQLite-only constructs, SMALLINT/TIMESTAMP/
  NUMERIC(18,2) present, FK references resolve, pilot tables declared).
- **Existing regression:** `academicIntegration.test.ts` (SQLite) passes — confirms SQLite
  repositories/services/runtime persistence are unchanged. All 15 academic + 10 student
  domain suites pass.

### 5.3 Build
```
npm run build  →  BUILD_EXIT=0
```
`vite build` (SPA) + `node scripts/build-server.mjs` (server bundle) both succeed.
`pg` remains externalized (PostgreSQLDataSource emitted as a separate 4.98 kB chunk, `pg` not
in the browser bundle). The only output is a non-fatal chunk-size advisory.

### 5.4 TypeScript (`npx tsc --noEmit`)
```
TSC_EXIT=2
```
Exactly the **11 pre-existing baseline errors** remain — identical to the PG-0 baseline:
`src/App.tsx(82,13)`, `src/App.tsx(148,8)`, `src/components/ActiveReportPrintView.tsx(305,7)`,
and `src/components/GlobalSearchBar.tsx` lines 300/302/308/310/316/318/324/326. **No new errors
were introduced by PG-2.**

### 5.5 Verification that PG-2 did NOT break
| Area | Evidence |
|------|----------|
| SQLiteDataSource | Untouched; `academicIntegration.test.ts` (SQLite) passes. |
| DataSourceFactory default SQLite | `DataSourceFactory.test.ts` passes (`getInstance()` synchronous & sqlite; `initialize()` honors `DATA_SOURCE_TYPE`). |
| Academic repositories/services | `academicIntegration.test.ts` passes. |
| Existing runtime persistence | Same — SQLite integration suite green. |
| HTTP/API behavior | No API-layer source file modified in PG-2; build compiles. No HTTP regression introduced by construction. |

---

## 6. Test-Integrity Checks (no workarounds)
- ✅ No `void out;` (or any meaningless assertion suppressor) remains.
- ✅ No `describe.skip` / `it.skip` / `todo` / `xit` (the only `xit(` substring match was
  `process.exit(` in `academicIntegration.test.ts`, a false positive).
- ✅ No weakened assertions; every dialect test asserts the exact transformed SQL and param
  alignment.
- ✅ No swallowed errors; no fake "PostgreSQL success" tests (the PG datasource tests assert
  method presence / credential non-exposure, not fake DB success).

---

## 7. Known Limitations
1. **No live PostgreSQL integration tests.** This environment has no PostgreSQL server and the
   directive forbids creating one. All PG-2 verification is at the unit/structural level over
   the real repository SQL shapes. Live CRUD integration becomes relevant in PG-3 (data
   migration phase) when a PG environment is provisioned.
2. **`subjects` FKs deferred** (school_classes/teachers) — out of pilot scope; add in full
   schema phase.
3. **UUID PKs deferred** — TEXT PKs chosen to preserve `md_<id>` identifiers and Al-Salam copy
   fidelity.
4. **INSERT OR REPLACE → ON CONFLICT DO UPDATE** updates only the listed columns. Columns
   absent from the INSERT column list (e.g. `created_at`) are **preserved** on update rather
   than reset (behaviorally closer to "update should not reset creation metadata" than
   SQLite's delete-and-reinsert). Documented, not a regression.
5. **Dual data-access layer not yet covered.** `src/lib/sqlite-repository.ts` and
   `src/lib/reference-data/useReferenceData.ts` bypass `IDataSource` and remain SQLite-only.
   They are deferred to the full schema/migration phase and must be routed through
   `IDataSource` before any PostgreSQL adoption.
6. **`created_by`/`updated_by`** still sourced from `localStorage` (D4 nuance) — unchanged in
   PG-2.
7. **11 pre-existing TypeScript errors** unrelated to PG-2 (baseline from PG-0).

---

## 8. Rollback Boundary
PG-2 is **fully additive**:
- New files: `sqlDialect.ts` (+tests), `pg2RepositorySql.test.ts`,
  `migrations/postgres/*`.
- One PG-only file modified: `PostgreSQLDataSource.ts` (dialect wiring).

To roll back: remove `migrations/postgres/` and `src/core/datasource/sqlDialect*`, and revert
`PostgreSQLDataSource.ts` to its PG-0 base (which still compiled and passed). **SQLite is 100%
untouched**, so the application continues on SQLite unchanged. The PostgreSQL path is opt-in via
`DATA_SOURCE_TYPE=postgresql`; the default remains SQLite, so a misconfigured PG environment
does not affect the default runtime.

---

## 9. PG-2 Verdict

**All applicable verification is green:**
- 107/107 tests pass (32 discovered files, 11 suites, 0 failures, 0 skipped).
- `npm run build` → exit 0.
- `tsc --noEmit` → only the 11 pre-existing baseline errors (identical to PG-0); no new errors.
- SQLite regression (academic integration + domain suites) passes.
- No SQLite/API/business code modified; `getRealmDB()`/`saveRealmDB()` preserved.

Live PostgreSQL CRUD integration is explicitly **out of PG-2 scope** (schema/dialect
preparation only; no PG server; data migration deferred to PG-3).

# PG-2 STATUS: READY FOR PG-3

(Integration against a live PostgreSQL database is deferred to PG-3, when a PG environment is
provisioned and the data-migration phase begins — by design, not due to an open implementation
defect.)
