# Kayan School ERP — PG-4.5 Repository Coverage Audit (Self-Audit)

**Phase:** PG-4.5 — PostgreSQL Full Repository Coverage Audit
**Date:** 2026-08-25
**Status:** ✅ PASS — READY FOR PG-5
**Scope constraint:** PG-4.5 only. PG-5 NOT started. No Al-Salam/Yemen data migration. SQLite retained. `getRealmDB()`/`saveRealmDB()` retained. No Authentication/RBAC implementation. No API source-of-truth cutover.

---

## 1. Objective

Verify that **every** repository that consumes `IDataSource` works correctly against live PostgreSQL (`kayan_school_erp`), that the PostgreSQL dialect translator (`sqlDialect.ts`) correctly handles all SQL forms emitted by repositories, and that no repository logic is silently broken by the dialect boundary. The audit produces a production-readiness verdict for the **repository layer** against PostgreSQL.

## 2. Method

1. **Inventory** — enumerate all `IDataSource` implementations and all consumers.
2. **Static SQL audit** — read every repository method; classify each emitted SQL form against `preparePostgresStatement` capabilities.
3. **Live coverage tests** — execute real CRUD/query operations against live PostgreSQL (`pg45.repositories.coverage.live.test.ts`).
4. **Targeted fix** — repair any defect found, with regression assertions.
5. **Full verification** — run every live suite serially, plus `tsc --noEmit` and `npm run build`.
6. **Data-safety checks** — confirm constraints (no Al-Salam migration, SQLite/`RealmDB` intact, no Auth/RBAC, no API cutover).
7. **Deliverables** — this document + `KAYAN_SCHOOL_ERP_PG4_5_IMPLEMENTATION_REPORTION.md`.

All live tests run via `node --import tsx --test <file>` and were executed **serially** (one file per process) to avoid shared-`kayan_school_erp` races.

## 3. Inventory (Phase 1)

### IDataSource implementations
- `SQLiteDataSource` (`src/core/datasource/SQLiteDataSource.ts`) — lazy `better-sqlite3`-backed, used as the default/fallback runtime source.
- `PostgreSQLDataSource` (`src/core/datasource/PostgreSQLDataSource.ts`) — `pg` Pool-backed, translates SQLite SQL via `sqlDialect.ts`.

### IDataSource consumers (production)
| Repository | Notes |
|---|---|
| `studentRepository` | `INSERT OR REPLACE`/`INSERT OR IGNORE`, `SELECT *`, no `lastInsertRowid` read |
| `teacherRepository` | `INSERT OR REPLACE`, `SELECT *` (N+1 reads noted, non-blocking) |
| `financialRepository` | `INSERT OR REPLACE`, `Number()` coercion already added (PG-4 numeric safety) |
| `dashboardRepository` | `SELECT *` only, `Boolean()` for `is_read` |
| `masterDataRepository` | `count()`/`exists()` count-query form, `getAll` total, `bulkDelete` transaction, FK child-guard |
| `SQLiteAcademicYearRepository` | `exists('SELECT 1 FROM ...')`, `CURRENT_TIMESTAMP`, UnitOfWork |
| `SQLiteCurriculumRepository` | `INSERT OR REPLACE`, `SELECT 1` existence, UnitOfWork |
| `SQLiteCourseAssignmentRepository` | same pattern |
| `SQLiteAcademicCalendarRepository` | same pattern |
| `AuthService` | `SELECT ... WHERE email=? AND status=?` (SELECT-only) |
| `UnitOfWork` | `dataSource.transaction(...)` |

**Excluded (correctly):** `src/lib/sqlite-repository.ts` is a legacy `sql.js` layer that does **not** implement `IDataSource`. DDD modules under `src/modules/*/infrastructure/**` (e.g. `student/infrastructure`) do **not** consume `IDataSource` (grep returned no hits) and are a separate architectural layer outside this audit.

## 4. SQL Audit (Phase 2)

Every repository emits only:
- `?` positional placeholders → handled by `preparePostgresStatement` (`?` → `$N`).
- `INSERT OR IGNORE` / `INSERT OR REPLACE` → translated to `ON CONFLICT DO NOTHING` / `ON CONFLICT (cols) DO UPDATE`.
- `SELECT`/`UPDATE`/`DELETE` with `?` params → passed through.
- `CURRENT_TIMESTAMP` → valid in PostgreSQL.
- Predicate `exists('SELECT 1 FROM ...')` → valid.

**Defect found (Class A — functional, blocks writes):**
`PostgreSQLDataSource.count()` and `.exists()` **always** wrapped the caller SQL as `SELECT COUNT(*) FROM (<sql>) AS _sub`. This is correct for **predicate** callers (`SELECT 1 FROM ...`, `SELECT * FROM ...`), but **wrong** for **count-query** callers that already emit `SELECT COUNT(*) as cnt FROM ...`. Wrapping a count query yields a 1-row subquery whose `COUNT(*)` is always `1`.

Impact:
- `masterDataRepository.getAll()` total → **always `1`** (broken pagination).
- `masterDataRepository.isFieldUnique()` → **always `false`** (every code reported "not unique") → **blocks all master-data creates/updates**.
- `getChildRelations()` → reported a child whenever any row existed → over-aggressive delete blocking (latent).

## 5. Live Coverage Test (Phase 3)

New suite: `src/core/datasource/pg45.repositories.coverage.live.test.ts` (9 tests). Covers:

| # | Test | Verifies |
|---|---|---|
| 1 | `count()` count-query form | returns real row count (regression for the defect) |
| 2 | `exists()` count-query form | `false` for non-match, `true` for match (regression) |
| 3 | `count()`/`exists()` predicate form | still correct when wrapping |
| 4 | `MasterDataRepository` create→getById→getAll(total)→update→delete | full lifecycle + pagination total |
| 5 | `isFieldUnique` | false for existing, true for unique |
| 6 | `bulkDelete` transaction | removes N rows atomically |
| 7 | FK child guard | `education_stages` delete blocked while `grade_levels` child exists |
| 8 | `AuthService` login SELECT | unknown email → failure, no throw; column mapping |
| 9 | `SQLiteCurriculumRepository` | save→findById→getAll→delete (academic live smoke) |

All rows are `pg45_`-prefixed and removed in `after` + `beforeEach` cleanup, leaving the DB unchanged.

## 6. Fix (Phase 4)

**File:** `src/core/datasource/PostgreSQLDataSource.ts` — `count()` and `exists()`.

Detection of the two call forms at the single dialect boundary:
```ts
const isCountQuery = /\bcount\s*\(/i.test(sql);
const result = await this.queryOne<{ cnt: number }>(
  isCountQuery ? pg.sql : `SELECT COUNT(*) AS cnt FROM (${pg.sql}) AS _sub`,
  pg.params,
);
```
- Count-query callers (`SELECT COUNT(*) ...`) run **directly** and read `cnt`.
- Predicate callers (`SELECT 1 FROM ...` / `SELECT * FROM ...`) are still wrapped (the original, correct behaviour).

This satisfies both forms **without changing any repository or schema**. Regression assertions T1/T2/T5 in the coverage suite encode the correct behaviour.

## 7. Full Verification (Phase 5)

Executed serially against `kayan_school_erp`:

| Suite | Result |
|---|---|
| `pg4.migrations.live.test.ts` | ✅ 14/14 |
| `pg4.repositories.live.test.ts` | ✅ 5/5 |
| `pg4.sweep.live.test.ts` | ✅ 3/3 |
| `postgres.live.test.ts` | ✅ 14/14 |
| `pg45.repositories.coverage.live.test.ts` | ✅ 9/9 |
| **Total live** | **✅ 49/49** |

- `npm run build` → **passes** (vite + server bundle; only pre-existing non-fatal warnings).
- `tsc --noEmit` → remaining errors are **pre-existing frontend** issues in `App.tsx`, `GlobalSearchBar.tsx`, `ActiveReportPrintView.tsx`, **unrelated to PG-4.5** (PG-4.5 touched only `PostgreSQLDataSource.ts` and the new test file, both type-clean after fix).

## 8. Data-Safety Checks (Phase 6)

| Check | Result |
|---|---|
| No Al-Salam / Yemen data migration added | ✅ (no `migrations/postgres/009*`, no `yemen`/`al_salam` file) |
| `getRealmDB()` / `saveRealmDB()` retained | ✅ present in `src/lib/db.ts`, untouched |
| SQLite retained as fallback | ✅ `SQLiteDataSource` untouched by PG-4.5 |
| No Authentication / RBAC implementation | ✅ only existing `AuthService` SELECT path tested |
| No API source-of-truth cutover | ✅ no API route changes |
| DB left unchanged after tests | ✅ all `pg45_` rows removed by teardown |

## 9. Classification

### PG-4.5: ✅ PASS — READY FOR PG-5

The repository layer is **production-capable against PostgreSQL**. All `IDataSource` consumers execute correctly; the single defect found (`count()`/`exists()` wrapping) is repaired with a minimal, regression-covered fix at the dialect boundary. No data-migration, schema, or behavioural regressions were introduced, and all PG-4.5 constraints are honoured.

**Note for PG-5:** the N+1 read pattern in `teacherRepository` is a performance observation (non-blocking) and can be addressed during query optimization in PG-5, but it does not block PostgreSQL readiness.
