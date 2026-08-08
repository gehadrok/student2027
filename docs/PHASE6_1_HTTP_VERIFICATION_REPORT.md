# PHASE 6.1 — HTTP End-to-End API Verification Report

## Summary

Phase 6.1 verified the **real** HTTP endpoints of the Academic Application Layer
through the complete Express routing stack using real `fetch` HTTP requests —
**not** direct service calls. All Academic REST endpoints were exercised over a
live HTTP server bound to an ephemeral port.

**Result: 66 passed, 0 failed.**

## Verification Method

- Started a real Express HTTP server on `127.0.0.1` (ephemeral port).
- Issued real `fetch()` HTTP requests (GET / POST / PUT / DELETE) against the
  live server.
- The full HTTP path was exercised end-to-end:

```
Client → HTTP → Express → Router → Controller → Application Service
       → Repository → UnitOfWork → EventBus → HTTP Response
```

- An in-memory `IDataSource` was installed via `DataSourceFactory.setInstance()`
  **before** the service singleton modules loaded, so the complete stack resolved
  against the in-memory store. **No production code was modified.**
- Domain events dispatched through the `EventBus` were subscribed and counted.

## Endpoints Verified

### 1. AcademicYear lifecycle
- `POST /api/academic/years` → 201 (returns draft)
- `GET /api/academic/years/:id` → 200
- `GET /api/academic/years` → 200 (list + summary `termCount`)
- `GET /api/academic/years/code/:code` → 200
- `POST /api/academic/years/:id/terms` → 201 (add term)
- `POST /api/academic/years/:id/terms/:termId/open` → 200
- `POST /api/academic/years/:id/terms/:termId/lock` → 200
- `POST /api/academic/years/:id/terms/:termId/close` → 200
- `POST /api/academic/years/:id/approve` → 200
- `POST /api/academic/years/:id/activate` → 200
- `POST /api/academic/years/:id/close` → 200
- `POST /api/academic/years/:id/archive` → 200
- `DELETE /api/academic/years/:id` → 204
- GET after DELETE → 400 (not found) with error envelope

### 2. Error handling / validation
- Activate without terms → 400 (domain validation)
- Close a draft year (invalid transition) → 400
- GET non-existent id → 400 not found

### 3. Curriculum CRUD
- `POST /api/academic/curriculums` → 201
- `GET /api/academic/curriculums/:id` → 200
- `GET /api/academic/curriculums/code/:code` → 200
- `GET /api/academic/curriculums` → 200 (list)
- `PUT /api/academic/curriculums/:id` → 201 (upsert persists change)
- `DELETE /api/academic/curriculums/:id` → 204

### 4. CourseAssignment CRUD
- `POST /api/academic/course-assignments` → 201
- `GET /api/academic/course-assignments/:id` → 200
- `GET /api/academic/course-assignments` → 200 (list)
- `GET /api/academic/course-assignments?teacherId=...` → 200 (filter)
- `PUT /api/academic/course-assignments/:id` → 201 (upsert persists change)
- `DELETE /api/academic/course-assignments/:id` → 204

### 5. AcademicCalendar CRUD
- `POST /api/academic/calendar` → 201
- `GET /api/academic/calendar/date/:date` → 200
- `GET /api/academic/calendar/:id` → 200
- `GET /api/academic/calendar` → 200 (list)
- `GET /api/academic/calendar?week=1` → 200 (filter)
- `PUT /api/academic/calendar/:id` → 201
- `DELETE /api/academic/calendar/:id` → 204

### 6. Use-case path
- `POST /api/academic/years/with-terms` → 201 (creates year + 2 terms)

## Outcome

- **66 assertions passed, 0 failed.**
- All HTTP status codes, response envelopes, CRUD behavior, error handling,
  repository persistence, and event dispatch were verified through real HTTP.
- Term lifecycle (open → lock → close) was correctly exercised while the year
  was still in `draft` state, respecting the aggregate's `assertEditable()` rule.

## Constraints Honored

- No production code modifications.
- No UI changes.
- No SQL schema changes.
- No architecture changes.

## Artifacts

- `scripts/verify-academic-http-e2e.ts` — real HTTP test suite
- `scripts/run-academic-http-e2e.mjs` — runner (registers the asset loader)
- `TODO-phase6.1.md` — phase checklist (all steps complete)

## Run Command

```
npx node scripts/run-academic-http-e2e.mjs
