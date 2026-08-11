# AcademicCalendar INSERT Persistence - Item 1 Completion Report

## Scope

Fixed only the AcademicCalendar new-record INSERT persistence defect identified in the final audit.

No UI changes were made. No Phase 6.3 / Phase 7 work was started. No domain logic was changed.

## Root Cause

`SQLiteAcademicCalendarRepository.save()` previously treated new AcademicCalendar records as a no-op because it mapped calendar days onto `schedule_periods`.

That table is a timetable table with mandatory class, section, subject, teacher, period, and time data. A calendar day record only has `id`, `date/day`, `academicWeek`, and `isInstructional`, so a real INSERT into `schedule_periods` could not be valid without unrelated timetable parents. As a result, new calendar records could appear successful at the application boundary while not being durably persisted.

## Fix

Added a dedicated canonical runtime table:

- `academic_calendar_days`
- Columns: `id`, `day`, `academic_week`, `is_instructional`, `created_at`, `updated_at`
- Indexes on `day` and `academic_week`

Updated the AcademicCalendar mapper and repository so:

- `save()` checks existence by `academic_calendar_days.id`.
- New records execute a real `INSERT`.
- Existing records execute an `UPDATE`.
- `findById`, `findByDate`, `getByWeek`, `getAll`, and `delete` all use `academic_calendar_days`.
- `isInstructional` is persisted through `is_instructional`.

## Verification Added/Updated

Updated focused AcademicCalendar checks in:

- `scripts/verify-academic-runtime-persistence.ts`
- `src/modules/academic/tests/integration/academicIntegration.test.ts`
- `scripts/verify-academic-http-e2e.ts`

The runtime persistence verification uses real `sql.js`, loads the canonical startup schema and seed from:

- `src/lib/sqlite-schema.sql`
- `src/lib/sqlite-seed.sql`

## Verification Results

| Check | Result |
| --- | --- |
| Real `sql.js` runtime persistence | PASS: 54 passed, 0 failed |
| Academic integration tests | PASS: 71 passed, 0 failed |
| Academic HTTP E2E tests | PASS: 67 passed, 0 failed |
| Academic API smoke | PASS: 29 passed, 0 failed |
| Production build | PASS: `vite build && node scripts/build-server.mjs` |
| TypeScript `tsc --noEmit` | FAIL: existing unrelated UI typing errors |

TypeScript failed on pre-existing UI issues outside this item:

- `src/App.tsx`: missing required `settings` prop for `LoginScreen` and `Navbar`
- `src/components/ActiveReportPrintView.tsx`: report type comparison includes `grades` outside the current union
- `src/components/GlobalSearchBar.tsx`: category values `student`, `teacher`, `subject`, `class` are outside the current `SearchCategory` union

These were not changed because Item 1 explicitly excludes unrelated blockers and UI changes.

Additional note: `scripts/run-academic-smoke.mjs` is not present in this repo. Running
`scripts/verify-academic-smoke.ts` directly through `tsx` fails before test execution
because the direct invocation does not register the Vite asset loader for `.sql`
imports. The required Academic integration, HTTP E2E, real-runtime persistence,
API smoke, and production build verifications were completed as listed above.

## Outcome

AcademicCalendar new-record `save()` now performs a durable INSERT into the real runtime SQLite schema. The repository, application service, and HTTP paths all verify the new row is persisted and retrievable without requiring timetable foreign-key parents.
