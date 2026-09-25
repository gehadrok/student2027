# Kayan School ERP — PG-4.5 Implementation Report

**Phase:** PG-4.5 — PostgreSQL Full Repository Coverage Audit
**Date:** 2026-08-25
**Fixes applied:** 1 (defect-class A)
**Build/Test status:** ✅ 49/49 live tests pass, `npm run build` passes

---

## 1. Defect

**Component:** `PostgreSQLDataSource.count()` / `.exists()`
**File:** `src/core/datasource/PostgreSQLDataSource.ts`
**Severity:** Class A (functional — blocks writes & breaks pagination for `masterDataRepository`)

### Root cause
Both methods unconditionally wrapped the caller's SQL:

```ts
const result = await this.queryOne<{ cnt: number }>(
  `SELECT COUNT(*) AS cnt FROM (${pg.sql}) AS _sub`,
  pg.params,
);
```

Repositories call these with **two different SQL shapes**:

1. **Predicate form** — `SELECT 1 FROM ...` / `SELECT * FROM ...`
   Wrapping is correct: `SELECT COUNT(*) FROM (SELECT 1 FROM ...) AS _sub` returns 0/1. ✅

2. **Count-query form** — `SELECT COUNT(*) as cnt FROM ...`
   Wrapping yields `SELECT COUNT(*) FROM (SELECT COUNT(*) as cnt FROM ...) AS _sub`
   — a 1-row subquery whose outer `COUNT(*)` is **always `1`**. ❌

`masterDataRepository` uses the **count-query form** for:
- `getAll()` total (pagination) → always `1`.
- `isFieldUnique()` → `exists()` always `true` → reports every code as "not unique" → **blocks all creates/updates**.
- `getChildRelations()` → over-reports children (latent delete-blocking).

## 2. Fix

Detect the call form at the single dialect boundary and only wrap when needed:

```ts
async count(sql: string, params?: any[]): Promise<number> {
  const pg = this.toPg(sql, params);
  const isCountQuery = /\bcount\s*\(/i.test(sql);
  const result = await this.queryOne<{ cnt: number }>(
    isCountQuery ? pg.sql : `SELECT COUNT(*) AS cnt FROM (${pg.sql}) AS _sub`,
    pg.params,
  );
  return Number(result?.cnt ?? 0);
}

async exists(sql: string, params?: any[]): Promise<boolean> {
  const pg = this.toPg(sql, params);
  const isCountQuery = /\bcount\s*\(/i.test(sql);
  const result = await this.queryOne<{ cnt: number }>(
    isCountQuery ? pg.sql : `SELECT COUNT(*) AS cnt FROM (${pg.sql}) AS _sub`,
    pg.params,
  );
  return Number(result?.cnt ?? 0) > 0;
}
```

### Why this approach (Option B)
- **No caller or schema changes** — the dialect boundary absorbs the difference, consistent with the PG-2/PG-4 design (all SQLite↔PostgreSQL differences resolved in `sqlDialect.ts` / `PostgreSQLDataSource.ts`).
- **Backward compatible** — predicate-form callers (`academic_*` repositories, `postgres.live.test.ts`) keep wrapping and still pass.
- **Low risk** — a count-query that happens to contain a subquery `count(` is correctly detected as already-aggregated.

## 3. Regression coverage

`src/core/datasource/pg45.repositories.coverage.live.test.ts`:
- T1 `count()` count-query form returns the real row count (fails before fix, passes after).
- T2 `exists()` count-query form returns `false` for a non-matching row (fails before fix, passes after).
- T5 `isFieldUnique()` returns `false` for an existing code and `true` for a unique code.

## 4. Verification

- All 5 live suites pass serially: **49/49** (`pg4.migrations` 14, `pg4.repositories` 5, `pg4.sweep` 3, `postgres.live` 14, `pg45.coverage` 9).
- `npm run build` → passes.
- `tsc --noEmit` → only pre-existing, unrelated frontend errors remain.

## 5. Files changed

| File | Change |
|---|---|
| `src/core/datasource/PostgreSQLDataSource.ts` | `count()`/`exists()` conditional wrap (the fix) |
| `src/core/datasource/pg45.repositories.coverage.live.test.ts` | **NEW** live coverage + regression suite |

No other source files were modified for PG-4.5. SQLite, `getRealmDB()`/`saveRealmDB()`, Auth/RBAC, and API routes are all untouched.
