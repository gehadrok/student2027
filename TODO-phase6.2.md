# PHASE 6.2 — Academic Frontend Integration

Status: DONE

## Goal
Connect the existing School Management frontend to the verified Academic REST API
(Phase 6.0/6.1) and make Academic functionality usable from the actual UI.

## Constraints
- NO backend, domain, repository, UnitOfWork, EventBus, schema/SQL changes.
- NO mock/static Academic data — all data flows through the REAL Academic REST API.
- Reuse existing types, API client, hooks, shared UI components, auth/permissions, and error handling.

## Steps

- [x] 1. Audit existing frontend structure (routing, nav, API client, design system, auth/permissions)
- [x] 2. Create typed Academic API model types (`src/modules/academic/presentation/types/`)
- [x] 3. Create Academic API client (`src/modules/academic/presentation/api/academicApiClient.ts`)
- [x] 4. Create hooks:
  - [x] `hooks/useAcademicYears.ts`
  - [x] `hooks/useCurriculums.ts`
  - [x] `hooks/useCourseAssignments.ts`
  - [x] `hooks/useAcademicCalendar.ts`
- [x] 5. Create screens:
  - [x] `screens/AcademicYearsScreen.tsx`
  - [x] `screens/CurriculumsScreen.tsx`
  - [x] `screens/CourseAssignmentsScreen.tsx`
  - [x] `screens/AcademicCalendarScreen.tsx`
  - [x] `screens/AcademicCenter.tsx` (hub / tab container)
- [x] 6. Wire navigation:
  - [x] `src/App.tsx` — add `academic` case
  - [x] `src/components/Sidebar.tsx` — add Academic nav item
- [x] 7. Verification:
  - [x] `npx tsc --noEmit` (TypeScript passes — no NEW errors; only pre-existing baseline errors)
  - [x] `npm run build` (Vite frontend build passes; server esbuild step fails on pre-existing .sql/.wasm loader issue in src/lib — out of scope)
  - [x] Run application, verify Academic Center is reachable from navigation
  - [x] Verify real HTTP calls persist through `/api`
  - [x] Verify CRUD persistence (create / read / update / delete)
  - [x] Verify AcademicYear/Term lifecycle actions
  - [x] Verify loading / empty / error states
- [x] 8. Generate `docs/PHASE6_2_FRONTEND_INTEGRATION_REPORT.md`

