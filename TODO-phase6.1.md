# PHASE 6.1 — HTTP End-to-End API Verification

Phase 6.0 delivered the Academic Application Layer (REST endpoints, controllers,
services, DTOs, mappers, use-cases). This phase verifies **all** real HTTP
endpoints through the full Express routing stack using real `fetch` requests —
NOT direct service calls.

Objective: verify the complete HTTP path:

```
Client → HTTP → Express → Router → Controller → Application Service
       → Repository → UnitOfWork → EventBus → HTTP Response
```

## Scope

- Start a real HTTP server on an ephemeral port.
- Exercise the real Express routing stack with real HTTP requests (`fetch`).
- Verify **every** academic endpoint:
  - AcademicYear full lifecycle (create, list, getById, getByCode, addTerm,
    approve, activate, close, archive, term open/lock/close, delete).
  - Curriculum CRUD (post, get by id, get by code, list, put update, delete).
  - CourseAssignment CRUD (post, get by id, list, put update, delete).
  - AcademicCalendar CRUD (post, get by id, get by date, list, put update, delete).
- Verify HTTP status codes, response envelopes, CRUD behavior, error handling,
  repository persistence, and event dispatch.

## Constraints

- NO production code modifications.
- NO UI changes.
- NO SQL schema changes.
- NO architecture changes.

## Steps

- [x] 1. Create `scripts/verify-academic-http-e2e.ts` — real HTTP test suite
- [x] 2. Create `scripts/run-academic-http-e2e.mjs` — runner (registers asset loader)
- [x] 3. Verify: run `npx node scripts/run-academic-http-e2e.mjs` (66 passed, 0 failed)
- [x] 4. Generate `docs/PHASE6_1_HTTP_VERIFICATION_REPORT.md`
