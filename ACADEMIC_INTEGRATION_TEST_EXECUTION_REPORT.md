# ACADEMIC INTEGRATION TEST EXECUTION REPORT

## Summary

| Metric     | Value |
|------------|-------|
| **Total**  | 68    |
| **Passed** | 68    |
| **Failed** | 0     |
| **Status** | ✅ 100% passing |
| **Duration** | ~647 ms |

## Execution

- **Command:** `npx tsx scripts/run-academic-integration.mjs`
- **Test file:** `src/modules/academic/tests/integration/academicIntegration.test.ts`
- **Runner:** `scripts/run-academic-integration.mjs`
- The suite uses the **real** Academic repositories (no mocks) combined with a faithful in-memory `IDataSource`, the real `UnitOfWork`, and the real `EventBus`.

## Coverage

The suite validates the full repository → mapper → UnitOfWork → EventBus wiring across these areas:

1. **AcademicYear lifecycle** — draft creation, save/event, reconstruct, approve, activate, close, archive, getAll, delete, and UnitOfWork rollback on aggregate save failure.
2. **AcademicTerm lifecycle** — term add events, persistence as children, reconstruction, open/closed transitions, and term-overlap invariant protection.
3. **Curriculum persistence** — save, findById, findByCode, getByGradeLevel, getAll(active), update, delete.
4. **CourseAssignment persistence** — save, findById, getBySubject, getByTeacher, getByGradeLevel, getAll, update, delete.
5. **AcademicCalendar persistence** — seed, update path, findByDate, getByWeek, getAll, new-record no-op, delete.
6. **Transaction consistency** — multi-row aggregate write (year + term) in one transaction; forced mid-transaction failure yields no partial persistence.
7. **DI resolution** — all four Academic repositories resolve from the infrastructure container.

## Issue Found & Fixed

### Root Cause (initial run)

The first run reported **60 passed / 8 failed**. All 8 failures were caused by a bug in the **test infrastructure** — the `InMemoryDataSource.execute()` method's UPDATE handler.

The repositories emit multi-line `UPDATE` SQL (newlines within the `SET` clause). The UPDATE parser used the regex:

```js
const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
```

Because `.` does **not** match newlines, the regex never matched the multi-line `SET` clause. As a result, `setMatch` was `null`, and the UPDATE wrote **no column values** back to the in-memory table. Every test that relied on an UPDATE persisting a new value (e.g., year status transitions, curriculum update, course-assignment update, term status) failed.

### Fix Applied

Updated the UPDATE `SET` clause matcher to span newlines using `[\s\S]`:

```js
const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
```

This is a fix to the **test double (in-memory data source)** only. It aligns the in-memory persistence backend with the real SQLite behavior so the real repositories' UPDATE statements are faithfully applied.

### Scope of Change

- **No UI modified.**
- **No SQL modified** (production SQL statements in the repositories are untouched).
- **No Domain logic changed.**
- **No new features introduced.**
- The only change is the correction of the test harness's in-memory UPDATE parser.

## Final Result

After applying the fix and re-running the complete suite:

```
=== ACADEMIC INTEGRATION TESTS ===
...
=== RESULT: 68 passed, 0 failed ===
Total duration: 659 ms
```

All 68 tests pass at **100%**.
