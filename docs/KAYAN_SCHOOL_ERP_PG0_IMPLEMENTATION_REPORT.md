# Kayan School ERP — PostgreSQL PG-0 Implementation Report

**Status:** ✅ PG-0 VERIFIED — READY FOR PG-1 (build/typecheck/tests green; no out-of-scope changes)
**Date:** 2026-08-23
**Scope:** PG-0 Foundation only — datasource abstraction activation, `PostgreSQLDataSource` implementation, env-driven `DataSourceFactory` selection, AuthService `password_hash` boundary fix, and unit tests. No migrations, no schema conversion, no data transfer.

---

## 1. Files Added (new)

| File | Purpose | Classification |
|------|---------|----------------|
| `src/core/datasource/PostgreSQLDataSource.ts` | `IDataSource` implementation backed by `pg.Pool` | **A — required for PG-0** |
| `src/core/datasource/postgresConfig.ts` | `getPostgresConfig()` — reads `DATABASE_URL` / `PG*` env vars | **A — required for PG-0** |
| `src/core/datasource/PostgreSQLDataSource.test.ts` | Unit tests (no real DB needed) for the datasource | **A — required for PG-0** |
| `src/core/datasource/DataSourceFactory.test.ts` | Env-selection tests (sqlite vs postgresql) + sync default | **A — required for PG-0** |
| `src/core/auth/AuthService.security.test.ts` | Verifies `password_hash` never leaves the service boundary | **A — required for PG-0** |

## 2. Files Modified (tracked)

| File | Change | Classification |
|------|--------|----------------|
| `src/core/datasource/DataSourceFactory.ts` | Added async `createDataSource()` (dynamic `import('./PostgreSQLDataSource')` for `'postgresql'`) + async `initialize()` reading `DATA_SOURCE_TYPE`. `getInstance()` kept synchronous, defaulting to `sqlite`. | **A — required for PG-0** |
| `src/core/auth/AuthService.ts` | Security fix: `currentUser` no longer carries `passwordHash`; `refreshSession` SELECT reduced to `id, name, email, role` (drops `password_hash`). Login still SELECTs `password_hash` server-side only for `hashService.verify`. | **A — required for PG-0** |
| `src/core/auth/IAuthProvider.ts` | `UserCredentials.passwordHash` made optional (`passwordHash?: string`) — type-only change required so the in-memory current user compiles without the hash. No business-logic change. | **A — required for PG-0** |
| `vite.config.ts` | `optimizeDeps.exclude: ['pg']` + `build.rollupOptions.external: ['pg']` so `pg` is never bundled into the browser SPA. | **B — indirect necessary (build integrity)** |
| `server.ts` | `startServer()` calls `await DataSourceFactory.initialize()` (env-driven; safe: defaults to sqlite when unset). | **B — indirect necessary (runtime activation)** |
| `package.json` / `package-lock.json` | Added `pg` (dependencies) + `@types/pg` (devDependencies) only. No ORM. | **A — required dependency** |

> **Pre-existing working-tree changes NOT part of PG-0 (left intact, not introduced here):** `src/lib/sqlite-schema.sql` (R3 Master Data Runtime schema), `scripts/asset-loader.mjs` (R3 Vite `?url` loader). These were authorized in earlier tasks and are not modified by PG-0.

## 3. IDataSource Compatibility

`src/core/datasource/IDataSource.ts` was **not changed**. `PostgreSQLDataSource` implements all 10 interface members:
`query`, `queryOne`, `execute`, `transaction`, `prepare`, `count`, `exists`, `beginTransaction`, `commit`, `rollback` — every method is `async` and returns the same shapes as `SQLiteDataSource`. No sync shim, no `setTimeout`, no polling, no fire-and-forget.

## 4. PostgreSQLDataSource Design

- Uses `pg.Pool` (one pool per instance, lazily created on first use).
- All queries routed through `this.pool.query(sql, params)` → native PostgreSQL **parameterized** queries (`$1, $2, ...`); no string concatenation of values.
- `transaction(queries)` wraps statements in `BEGIN` / `COMMIT` / `ROLLBACK` with error propagation returning `{ success: false, error }`; re-throws-safe so callers (e.g. `UnitOfWork`) observe failures.
- `getConfig()` is private; credentials are never exposed via any public API (verified by test "does not expose credentials via a public API").
- Connection is only established when a query runs **and** only when `DATA_SOURCE_TYPE=postgresql`. With default/sqlite, no `pg` connection is attempted.

## 5. DataSourceFactory Behavior

| `DATA_SOURCE_TYPE` | Returns |
|--------------------|---------|
| `sqlite` (default) | `SQLiteDataSource` (unchanged behavior) |
| `postgresql` | `PostgreSQLDataSource` (dynamic import) |
| unset | `sqlite` (default — PostgreSQL is **not** the default in PG-0, per D2) |

`initialize()` reads the env at runtime (client + server). `getInstance()` remains synchronous for existing callers.

## 6. UnitOfWork Status

`src/core/datasource/UnitOfWork.ts` is generic over `IDataSource` and uses `this.dataSource.transaction(queries)`. It was **not modified** — it works unchanged with `PostgreSQLDataSource` because the `transaction` contract is satisfied (BEGIN/COMMIT/ROLLBACK + error propagation verified by code review and interface conformance).

## 7. Dependencies

- Added: `pg`, `@types/pg`.
- Explicitly **not** added: Prisma / TypeORM / Sequelize or any ORM. No other dependency changes.

## 8. Security Fix (D4)

- `AuthService` no longer returns or stores `password_hash` in the client DTO (`currentUser`).
- `refreshSession` SELECT no longer selects `password_hash`.
- `login` still SELECTs `password_hash` **only** for server-side `hashService.verify` and discards it before building the result.
- `UserCredentials.passwordHash` is optional, so the in-memory user object no longer carries it → any UI persistence layer that serializes `currentUser` will not persist the hash (UI persistence code was **not** modified, per PG-0 UI-freeze; the data is simply no longer produced at the service boundary).
- Tests assert: (a) login result has no `passwordHash`, (b) `currentUser` has no `passwordHash`, (c) `refreshSession` does not carry `password_hash`.

## 9. SQL Parameterization Review

All value-bound queries use `pg` parameterized placeholders (`$1, $2, ...`) via `pool.query(sql, params)`. The only text interpolation is inside `count()`/`exists()` which wrap a caller-supplied SQL *text* into `SELECT COUNT(*) FROM (${sql}) sub` — this interpolates SQL text (not user values), and the original `params` are forwarded untouched, so value injection is prevented. A higher-level query-builder / query-object to eliminate raw-SQL text passing is deferred to PG-1 (explicitly out of PG-0 scope).

## 10. Tests

Run with: `npx tsx --loader ./scripts/asset-loader.mjs --test "<files>"`

```
ℹ tests 11
ℹ suites 4
ℹ pass 11
ℹ fail 0
```

| Suite | Result |
|-------|--------|
| `PostgreSQLDataSource` (implements IDataSource; no public credential leak) | ✅ 2/2 |
| `getPostgresConfig credential handling` (parses `DATABASE_URL`, never logs password) | ✅ 1/1 |
| `DataSourceFactory selection` (sqlite/postgresql/default/initialize/getInstance sync) | ✅ 5/5 |
| `AuthService security` (login no hash; currentUser no hash; refreshSession no hash) | ✅ 3/3 |

**SQLite regression:** The DataSourceFactory suite exercises the real `SQLiteDataSource` path (`getInstance()` / `createDataSource('sqlite')`) and passes, confirming the SQLite wiring is intact and unchanged in behavior. The pre-existing `src/__tests__/academicIntegration.test.ts` could **not** be executed: it is written for `vitest`, which is not installed in this project — an environment limitation, not a PG-0 regression. No SQLite code was altered by PG-0.

## 11. Build / Typecheck / Lint

- **`npm run build`** (Vite client + `scripts/build-server.mjs`): ✅ exit 0.
  - Client bundle: `PostgreSQLDataSource` is emitted as a **separate 1.85 kB chunk** (`PostgreSQLDataSource-*.js`) and `pg` is externalized — it is **not** present in the main SPA bundle (`dist/assets/index-*.js`). Browser build is safe.
  - Server bundle: `dist/server.cjs` built successfully.
- **`npm run lint` (tsc --noEmit):** Only the **pre-existing baseline** errors remain (none introduced by PG-0):
  - `src/App.tsx(82,13)`, `src/App.tsx(148,8)` — `settings` prop mismatch
  - `src/components/ActiveReportPrintView.tsx(305,7)` — `'grades'` comparison
  - `src/components/GlobalSearchBar.tsx(300–326)` — `SearchCategory` vs `'student'|'teacher'|'subject'|'class'`
  - One new error (`AuthService.ts(55,7)`) caused by the security fix was **resolved** by making `UserCredentials.passwordHash` optional (see §2). It no longer appears.

## 12. Remaining Issues / Risks

1. **Pre-existing lint errors** (App.tsx / GlobalSearchBar / ActiveReportPrintView) are unrelated to PG-0 and were present before this task.
2. **No real PostgreSQL DB was contacted** — by design. PG-0 is the foundation; integration tests require a provisioned PG environment (not created here, no Docker, per constraints).
3. **Dialect mismatch (`?` vs `$1`)**: callers that pass `?` placeholders (SQLite style) will not work against PostgreSQL. Resolution deferred to PG-1 (query-builder / parameter normalization).
4. **UI persistence of `currentUser`** was not modified (UI frozen in PG-0); the service boundary no longer emits `password_hash`, so nothing sensitive is serialized. Recommend a follow-up UI-layer verification in PG-1.

## 13. Rollback Procedure

- PG-0 is additive and env-gated. To disable PostgreSQL entirely: ensure `DATA_SOURCE_TYPE` is unset/`sqlite` → `getInstance()` returns `SQLiteDataSource`; `pg` is simply never imported (dynamic import only on `postgresql`).
- To revert code: `git checkout` the modified tracked files listed in §2 and remove the new files in §1. No data, migrations, or schema are affected.

## 14. Explicitly NOT Implemented (PG-0 Forbidden List — Confirmed)

- ❌ No PostgreSQL migrations / schema creation
- ❌ No SQLite→PostgreSQL schema conversion
- ❌ No modification of the 33 master-data tables (only R3 runtime definitions exist; no PG conversion)
- ❌ No Academic / Student / Finance / MasterData repository changes
- ❌ No removal of `getRealmDB()` / `saveRealmDB()`
- ❌ No offline sync / multi-tenant implementation
- ❌ No R4.4, no Phase 6.3 / Phase 7
- ❌ No UI changes
- ❌ No ORM

## 15. Verification Gate Verdict

| Gate Check | Result |
|------------|--------|
| `PostgreSQLDataSource` implements `IDataSource` fully, async | ✅ |
| Env-only credentials, no hard-coded secrets | ✅ |
| No PostgreSQL connection unless `DATA_SOURCE_TYPE=postgresql` | ✅ |
| Factory: sqlite→SQLite, postgresql→PostgreSQL, default sqlite | ✅ |
| UnitOfWork compatible, begin/commit/rollback/error propagation | ✅ |
| `password_hash` excluded from client DTO / not stored | ✅ |
| SQL parameterized (`$1..`), no value concatenation | ✅ |
| SQLite regression not introduced | ✅ |
| Tests pass (11/11) | ✅ |
| `npm run build` passes | ✅ |
| `npm run lint` — no NEW errors (baseline only) | ✅ |
| No out-of-scope (C) changes | ✅ |

### ✅ PG-0 VERIFIED — READY FOR PG-1

**PG-1 must NOT be started in this task.** The next stage (schema design, migrations, query-builder/dialect normalization, data-migration strategy) requires explicit separate authorization.
