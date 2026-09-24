# Academic Calendar INSERT Persistence Fix — Completion Report

**Item 1** of the Academic Calendar remediation roadmap. Date: 2026-08-12.

## Root cause

`SQLiteAcademicCalendarRepository` mapped Academic Calendar school days onto
`schedule_periods`. That table requires timetable FK parents (class/section/
subject/teacher), so saving a brand-new calendar day silently no-op'd:

1. `save()` checked existence by `day`; for a new record the row is missing.
2. The INSERT branch registered `(id, day, academic_week)` without FK parents.
3. The FK-only write accumulated in the UnitOfWork failed its execution, and the
   repository did not surface the failure — `save()` returned `null`, and
   `AcademicCalendarService.save()` fabricated a success DTO from the command.
4. `findById` / `findByDate` returned `null`. Result: **new calendar days could
   never be persisted** from the Academy Calendar UI or API.

## Fix (dedicated table — audit-recommended approach)

Additive change; domain / application / API / UI untouched; no domain logic
modified; no second runtime schema.

| File | Change |
| --- | --- |
| `src/lib/sqlite-schema.sql` | New canonical section 24: `academic_calendar_days` table (`id` PK, `day` UNIQUE ISO date, `academic_week`, `is_instructional`, `created_at`, `updated_at`) + `idx_academic_calendar_days_day` / `idx_academic_calendar_days_week` indexes. |
| `src/modules/academic/infrastructure/mappers/academicCalendarMapper.ts` | Row shape now maps `is_instructional` (1/0) and round-trips `date` ↔ `day`. |
| `src/modules/academic/infrastructure/repositories/SQLiteAcademicCalendarRepository.ts` | New-record `save()` is a real `INSERT INTO academic_calendar_days` inside the repository `UnitOfWork`; existing id → `UPDATE`; commit failure now throws (no silent no-op). Reads (`findById`, `findByDate`, `getByWeek`, `getAll`, `delete`) target the dedicated table. |
| `migrations/003_academic_calendar_days.sql` | Migration LEDGER of the additive schema change (documentation only; not loaded at runtime, per 002 convention). |
| Verification suites | Calendar sections updated to exercise the real INSERT path (create → persisted → find → update → delete) instead of pre-seeding `schedule_periods`; in-memory test doubles gain the `academic_calendar_days` mapping. |

## Verification (all green)

| Suite | Result |
| --- | --- |
| Runtime persistence (REAL sql.js startup path, canonical schema + seed) | **54/54 passed** — includes new-record INSERT persisted, update persisted, findByDate/getByWeek/getAll, delete; schema/column checks for `academic_calendar_days`. |
| Integration tests | **71/71 passed** |
| HTTP E2E (real Express + fetch) | **67/67 passed** — `POST /academic/calendar → 201` + row persisted; PUT/DELETE paths. |
| API smoke | **29/29 passed** |
| Repository smoke | **ALL PASSED** (incl. `save persists new day (INSERT)`) |
| Production build (`npm run build`) | **passed** |

## Notes

- `npx tsc --noEmit` reports 12 errors, all pre-existing and identical to the
  `tsc-audit-live.txt` baseline (`App.tsx`, `ActiveReportPrintView.tsx`,
  `GlobalSearchBar.tsx`). None are in files touched by this fix; they remain a
  separate follow-up outside Item 1 scope.
- No UI changes, no Phase 6.3/7 work, no unrelated blockers implemented.
- Web-browser runtime verification (opening the app in a browser to confirm the
  API round-trip visually) was not part of Item 1; the real-sql.js HTTP E2E
  previously ran in the browser context per the audit. A browser smoke check
  can be scheduled with the next verification pass if required.