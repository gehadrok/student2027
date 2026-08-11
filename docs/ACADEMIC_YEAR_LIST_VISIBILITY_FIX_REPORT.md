# Academic Year List Visibility - Production Bug Fix Report

## Observed Behavior

From the Academic Years screen UI:

1. A new Academic Year is created/saved through the form.
2. The UI indicates the save succeeded (create modal closes on confirmed success).
3. The Academic Years list remains empty — the newly created year never appears.
4. Screenshot confirmed the empty list.

## Root Cause

**Classification: A — Persistence failure (server-side SQLite engine never initialized).**

The Academic REST API runs inside the Express server, which is bundled to
`dist/server.cjs` and executed by plain `node`. The SQLite engine
(`src/lib/sqlite-engine.ts`) was written browser-only: it persisted the
database binary via `localStorage` and loaded it back via `localStorage.getItem`.
In Node there is no `localStorage`, and nothing in `server.ts` ever initialized
the engine. Consequences on the server:

- `dbInstance` stayed `null` for the lifetime of the process.
- `runTransactionSync()` returned `{ success: false, error: 'Database not initialized' }`.
- `SQLiteAcademicYearRepository.save()` therefore threw
  `AcademicYear save failed: Database not initialized`, and the POST handler
  returned HTTP 400.
- `querySqlSync()` returned `[]` when `dbInstance` was null, so
  `GET /api/academic/years` always returned an empty array.

Evidence from a live repro against the deployed `dist/server.cjs` (before fix):

```
POST /api/academic/years  ->  400
{"error":"AcademicYear save failed: Database not initialized"}
GET  /api/academic/years  ->  200  []
```

This is exactly the "saved but list empty" symptom. The AcademicYear code path
(repository INSERT, mapper, service, controller, frontend hook) was correct; the
failure was entirely at the persistence layer — the server never had a live
database to write to.

### How this differs from the AcademicCalendar (Item 1) fix

Item 1 was a **schema/repository mapping** defect: the calendar repository
mapped days onto `schedule_periods`, which requires timetable FK parents that a
calendar-day record does not have, so INSERTs were invalid. That was fixed by
adding a dedicated `academic_calendar_days` table and pointing the repository at
it.

The Academic Year defect is a **runtime/initialization** defect: `academic_years`
already existed in the canonical schema and the repository already issued a real
INSERT inside a UnitOfWork transaction. The row was never written because the
server-side engine was never initialized in the Node process. No schema change
was needed for this bug, and no domain rule was touched.

## Exact Files Changed

| File | Change |
| --- | --- |
| `src/lib/sqlite-engine.ts` | Added guarded Node runtime support: file persistence under `data/al-salam-server.db`, `require.resolve`-based WASM locator, inlined schema/seed text loading. Browser behavior (localStorage) is unchanged. |
| `server.ts` | Call `await getSQLiteDB()` at server startup so the shared engine (and thus the Academic DataSource) has a live database before serving traffic. |
| `scripts/esbuild-asset-loader.mjs` | Server bundle now inlines the real `.sql` schema/seed text (mirrors Vite `?raw`) and resolves the importer's path via `args.resolveDir` so the `.sql` files are found relative to the importing module. `.wasm?url` stays stubbed (server resolves WASM at runtime via `require.resolve`). |
| `src/core/datasource/SQLiteDataSource.ts` | `exists()` wraps caller predicates in `SELECT COUNT(*) AS cnt FROM (...) AS _sub` so existence checks always read a `cnt` column (defensive; used by `save()` before choosing INSERT vs UPDATE). |
| `.gitignore` | Added `data/` (runtime DB file is not committed). |

No changes were made to the AcademicYear repository, mapper, domain aggregate,
application service, controller, routes, frontend hook, or frontend screen —
those were already correct.

## Exact Fix

1. **Engine Node support** — `sqlite-engine.ts` now detects the Node runtime via
   `typeof window === 'undefined'` + `require`, and:
   - resolves the sql.js WASM binary through `require.resolve('sql.js/dist/sql-wasm.wasm')`;
   - reads/writes the persisted DB binary to `data/al-salam-server.db`
     (`loadPersistedDB()` / `persistSQLiteDB()`), instead of `localStorage`;
   - `resetSQLiteDBToSeed()` removes the file instead of the localStorage key.
2. **Server bootstrap** — `server.ts` awaits `getSQLiteDB()` before serving
   traffic, so `dbInstance` is populated on the server.
3. **Server bundle asset loading** — `esbuild-asset-loader.mjs` inlines the real
   `sqlite-schema.sql` + `sqlite-seed.sql` content into `dist/server.cjs`
   (previously the imports resolved to empty strings, so even a fresh engine
   could not create the tables) and fixes path resolution via `args.resolveDir`.

## Persistence Verification

All checks below were run against the **real** production server
(`node dist/server.cjs`) and the **real** runtime database file
(`data/al-salam-server.db`), using the real HTTP API.

1. POST `{id, code, schoolScopeId, startDate, endDate, createdBy}` →
   `201` with the AcademicYear DTO (`status: draft`, ID returned).
2. Row actually present in the runtime sql.js database file:
   `SELECT id, code, name_ar, start_date, end_date, is_current, is_active, description FROM academic_years`
   returned the row with all fields persisted correctly
   (`start_date='2027-09-01'`, `end_date='2028-06-30'`, `is_active=1`, `description='draft'`).
3. Commit confirmed — the write path runs through
   `UnitOfWork.commit() → runTransactionSync() → BEGIN/COMMIT + persistSQLiteDB()`.
4. Server restart (stop + `node dist/server.cjs`) → the record is still present
   (loaded from the file, not re-seeded).

## API Verification

- `GET /api/academic/years` returns the newly created year in the list
  (`termCount: 0`, correct code/status).
- `GET /api/academic/years/:id` returns the created year.
- `GET /api/academic/years/code/:code` returns the created year.
- Both POST and GET operate on the same runtime database/table
  (`dbInstance` singleton in the server process).
- `getAll()` maps DB rows back into AcademicYear aggregates via
  `academicYearFromRows()` correctly (code/dateRange/status verified).

## Frontend Verification

- The `useAcademicYears` hook's `create()` performs `await academicYearApi.create(payload)`
  and then `await fetchYears()` — the list query IS refetched after a successful
  create (`src/modules/academic/presentation/hooks/useAcademicYears.ts`).
- There is no stale-cache layer and no client-side filtering that could hide a
  new year; the list renders straight from the refetched response.
- The create modal only closes when the POST returned a success DTO, so the UI
  does not claim success before backend persistence is confirmed.
- Real-browser check (patchright/Chromium): login as admin →
  المركز الأكاديمي → السنوات الدراسية → create a year via the form.
  The table row count went 2 → 3 after create, and stayed 3 after a full page
  reload (fresh login + navigation). The new year was rendered in the table.
- No console errors during the browser flow.

## Regression Test Results

| Check | Command | Result |
| --- | --- | --- |
| Academic runtime persistence (REAL SQLite) | `npx tsx scripts/run-academic-runtime-persistence.mjs` | PASS: 54 passed, 0 failed |
| Academic integration tests | `npx tsx scripts/run-academic-integration.mjs` | PASS: 71 passed, 0 failed |
| Academic HTTP E2E | `npx tsx scripts/run-academic-http-e2e.mjs` | PASS: 67 passed, 0 failed |
| Academic API smoke | `npx tsx scripts/run-academic-api-smoke.mjs` | PASS: 29 passed, 0 failed |
| TypeScript `tsc --noEmit` | `npm run lint` | FAIL: pre-existing unrelated UI typing errors only |

The TypeScript errors are the same pre-existing issues documented in earlier
reports and are outside Academic code:

- `src/App.tsx` (2): missing `settings` prop for `LoginScreen` / `Navbar`.
- `src/components/ActiveReportPrintView.tsx` (1): report type union overlap.
- `src/components/GlobalSearchBar.tsx` (8): `SearchCategory` union overlap.

No errors are reported in any Academic file or in the files changed by this fix.

## Build Result

```
npm run build   # vite build && node scripts/build-server.mjs
```

PASS. Client bundle (`dist/`) and server bundle (`dist/server.cjs`) both built.
`dist/server.cjs` was verified to contain the new server-side engine bootstrap
(`await getSQLiteDB()` and `data/al-salam-server.db`).

## Remaining Blockers

- The pre-existing UI TypeScript errors listed above (outside Academic scope;
  not introduced by this fix).
- `scripts/verify-academic-smoke.ts` cannot be executed directly through `tsx`
  without the asset loader (known pre-existing limitation documented in the
  Item 1 report); the equivalent coverage is provided by the API smoke runner
  which passes.

## Stop Condition

This report covers only the Academic Year list-visibility bug. Item 2, Phase
6.3, and Phase 7 were not started.
