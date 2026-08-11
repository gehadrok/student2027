# R1 — Async `IDataSource` Conversion: STOP REPORT

> Status: **BLOCKED — architectural ambiguity exposed by `IDataSource` async conversion.**
> The R1 task instructions require me to STOP and document when converting `IDataSource`
> to an async contract exposes an architectural ambiguity that cannot be resolved without
> violating an explicit constraint. That is exactly the situation here.

## 1. What R1 asked for (constraints that conflict)

| # | Requirement | Source |
|---|---|---|
| R1.1 | Convert `IDataSource` to async contract (`query`/`execute`/`transaction` return Promises) | Task step 1 |
| R1.2 | Propagate async: repository → service → use case → controller | Task step 4 |
| R1.3 | Keep SQLite working via an async-compatible adapter | Task step 2 |
| R1.4 | Pass `npm run lint` (`tsc --noEmit`) | Task step 7 |
| R1.5 | Pass verify scripts (`scripts/verify-academic-*`) | Task step 6 |
| R1.6 | Do NOT touch the 28 browser-DB screens | Task constraint |
| R1.7 | Do NOT change frontend persistence yet | Task constraint |
| R1.8 | Do NOT touch the 30 missing Master Data tables | Task constraint |
| R1.9 | Do NOT invent a mixed sync/async bridge (`deasync` shim) | Remediation plan §3.2 |

## 2. The root cause of the conflict

`IDataSource` (`src/core/datasource/IDataSource.ts`) is a **single, shared contract** consumed
by two disjoint layers that the R1 task treats differently:

- **Layer A — Server-side Academic stack (in scope).** `SQLiteAcademicYearRepository`,
  `SQLiteCurriculumRepository`, `SQLiteCourseAssignmentRepository`,
  `SQLiteAcademicCalendarRepository` → academic services → use cases → controller → routes.
  No screens consume these repos directly (academic screens use `academicApiClient` over HTTP).
  Converting this layer to async is safe and is the intended target.

- **Layer B — Browser-bundle legacy repos (out of scope).** `studentRepository`,
  `teacherRepository`, `financialRepository`, `masterDataRepository`, `dashboardRepository`.
  All five call `this.dataSource.query/queryOne/execute/transaction/count/exists` **synchronously**
  and are consumed synchronously by their services and React hooks, which feed browser screens:
  - `dashboardService` → `AdminDashboard.tsx` (sync calls at lines 22–29, 62)
  - `masterDataService` → `MasterDataCenter.tsx` (sync calls at 727, 813) and `useMasterData`/`useMasterLookup`
  - `studentService`/`teacherService`/`financialService` → hooks (sync) → screens

## 3. Why the conversion cannot be contained

The lint gate `npm run lint` is `tsc --noEmit` over a **single tsconfig with no project
references** — the whole `src/` compiles as one unit. If `IDataSource.query()` returns
`Promise<T[]>`, then every consumer in Layer B fails type-checking:

```
studentRepository.getAll(): Student[]      → this.dataSource.query<any>(...)  // now Promise
teacherRepository.*                        → same
financialRepository.*                      → same
masterDataRepository.*                     → same (also uses count/exists/transaction)
dashboardRepository.*                      → same (9 query sites)
UnitOfWork.commit()                        → dataSource.transaction(...)       // now Promise
dashboardService.* (sync)                  → AdminDashboard.tsx                // screen, FORBIDDEN
masterDataService.* (sync)                 → MasterDataCenter.tsx, hooks       // screen, FORBIDDEN
```

To make `tsc --noEmit` pass (R1.4) the propagation **must** cascade through Layer B repos →
services → hooks → screens (`AdminDashboard.tsx`, `MasterDataCenter.tsx`). That directly violates
R1.6 (do not touch the 28 browser-DB screens) and R1.7 (do not change frontend persistence).
There is no way to satisfy R1.1+R1.4 while honoring R1.6+R1.7, and R1.9 forbids the obvious escape
hatch (a sync shim for the browser repos).

## 4. Affected surface (full map)

### Core (in scope — must change)
- `src/core/datasource/IDataSource.ts` — async contract
- `src/core/datasource/SQLiteDataSource.ts` — async impl (wrap `querySqlSync`/`runSqlSync`/`runTransactionSync`)
- `src/core/datasource/UnitOfWork.ts` — `commit()` async (consumes `transaction()`)
- `src/core/datasource/DataSourceFactory.ts` — returns async impl
- `src/core/auth/AuthService.ts` — already `await`s `query()`; compatible as-is

### Academic server layer (in scope — must change)
- 4 × `SQLite*Repository` (`academic/infrastructure/repositories/`)
- 4 × academic services (`application/services/`), use cases, `academicController.ts`, routes
- `src/modules/academic/tests/integration/academicIntegration.test.ts` + the 4 `scripts/verify-academic-*.ts`
  (each defines an `InMemoryDataSource implements IDataSource` that must become async)

### Browser-bundle layer (out of scope — would be FORCED to change)
- `src/modules/{students,teachers,financial,dashboard,master-data}/repository/*.ts` (5 repos)
- Their services: `studentService`, `teacherService`, `financialService`, `dashboardService`, `masterDataService`
- Hooks: `useStudents`, `useTeachers`, `useFinancial`, `useMasterData`, `useMasterLookup`
- **Screens that would break and must be edited**: `src/screens/AdminDashboard.tsx`,
  `src/modules/master-data/screens/MasterDataCenter.tsx`

## 5. Resolution options (need a decision)

1. **Expand scope: full async sweep including Layer B** — convert all 5 legacy repos, their
   services, hooks, and the two screens. Passes tsc + verify scripts, matches the remediation
   plan's own §3.2 (it lists master-data/dashboard/students/teachers/financial repos in the async
   table). Requires lifting R1.6/R1.7 for this phase. **Recommended if "async everywhere" is the goal.**
2. **Introduce a separate server-only async seam** — new `IAsyncDataSource` (or async variant of
   the 4 academic repos) that Layer A uses while Layer B keeps the sync `IDataSource`. This
   isolates the change but is a partial/split contract — arguably a "mixed bridge", needs sign-off.
3. **Defer the async conversion** — document it as blocked; keep everything sync this phase.

## 6. Recommendation

Option 1 (full sweep, lift the screen-touch constraint) is the only path that satisfies R1.1–R1.5
with a single consistent contract and no invented bridge. It must be approved because it touches
`AdminDashboard.tsx` and `MasterDataCenter.tsx`.

No code was modified during this investigation.
