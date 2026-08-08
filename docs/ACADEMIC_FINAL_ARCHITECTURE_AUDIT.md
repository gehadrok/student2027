# Academic Module — Final Architecture Audit

**Type:** READ-ONLY final audit of the complete Academic module.
**Scope:** Domain → VO → Aggregates → Events → Policies → Repositories → Mappers → UnitOfWork → EventBus → DI → Application Services → CQRS → Use Cases → DTOs/Mappers → Controllers → REST Routes → HTTP E2E → Frontend API Client → Hooks → Screens → Navigation → Production Build.
**Authoritative reference:** `docs/domain/academic-domain-official-architecture.md`
**Audit date:** Phase 6.2 closure review.
**Constraint honored:** No files modified. No implementation added. Phase 6.3 / Phase 7 not started.

---

## 1. Executive Summary

The Academic module implements a **clean, well-structured layered skeleton** for the **AcademicYear aggregate** end-to-end (Domain → Application → Controller → REST → Frontend), with the **correct dependency direction** and **no business logic duplication**. The frontend → API → controller → service → repository wiring is **consistent and endpoint-complete**.

However, the module is **not runtime-functional for persistence**. The four SQLite repositories target tables and columns that **do not exist in the schema actually loaded at runtime** (`src/lib/sqlite-schema.sql` + `src/lib/sqlite-seed.sql`). The tables `academic_years`, `academic_terms`, `subjects_master`, and the columns `subjects.subject_id`, `schedule_periods.academic_week`/date-based `day` only exist in `migrations/001_master_data.sql`, which **is never loaded**. Because `sqlite-engine.ts` silently swallows query/run errors, every Academic persistence operation either returns an empty result or is rolled back / no-op'd, so the Academic production paths cannot durably persist data at runtime.

Additionally, only **one of the six** specified aggregates (`AcademicYear`) is implemented. Curriculum, CourseAssignment, and AcademicCalendar are **CRUD-only record passthroughs with no domain aggregate, no invariants, no events, and no lifecycle**. `AcademicStructure` and `ClassSchedule` are entirely absent. The `policies/`, `specifications/`, and `domain/services/` layers prescribed by the architecture are **not implemented**.

---

## 2. Findings

### 2.1 Architectural dependency direction — **PASS**

- `presentation → application → domain`, `infrastructure → domain` is respected.
- `academicController.ts` is a thin HTTP adapter with no repository access; it delegates to Application Services.
- `academicRoutes.ts` contains no business logic.
- `academicApiClient.ts` performs only serialization/deserialization and surfaces backend error envelopes (no business logic).
- Value objects are immutable (`Object.freeze`), validate, compare equality, and serialize. Confirmed in `DateRange`, `CodeValue`, `AcademicCalendarDate`, `AcademicYearCode`.
- Application Services (`AcademicYearService`, `CurriculumService`, `CourseAssignmentService`, `AcademicCalendarService`) are orchestration-only.

### 2.2 No duplicated business logic — **PASS (with note)**

- `AcademicYear` invariants live only in the domain aggregate (`AcademicYear.ts`): term-in-year, non-overlapping terms, unique term code, status machine transitions, terminal-mutation rejection, editable-only-in-draft.
- Application services do not re-implement these rules.
- **Note:** For Curriculum / CourseAssignment / AcademicCalendar, there is **no domain logic at all** to duplicate — they are record passthroughs. This is a completeness gap (see §2.13), not a duplication.

### 2.3 No mock/demo data in Academic production paths — **PASS**

- Academic screens, hooks, and the API client use the **real REST API** (`academicApiClient.ts`). No mock/static data in the presentation layer.
- Seed data (`src/lib/sqlite-seed.sql`) is the app's demo seed, not Academic production path logic.
- Tiny concern: `CURRENT_USER = 'admin'` is hard-coded in `AcademicYearsScreen.tsx` rather than derived from session/auth (see §2.15).

### 2.4 API endpoints match frontend API calls — **PASS**

Verified pairwise between `academicRoutes.ts` and `academicApiClient.ts`:

| Feature | Route | Client method | Match |
|---|---|---|---|
| Create year | `POST /academic/years` | `academicYearApi.create` | ✅ |
| Create year + terms | `POST /academic/years/with-terms` | `createWithTerms` | ✅ |
| Add term | `POST /academic/years/:id/terms` | `addTerm` | ✅ |
| Approve / Activate / Close / Archive | `POST /academic/years/:id/{approve\|activate\|close\|archive}` | ✅ | ✅ |
| Open / Lock / Close term | `POST /academic/years/:id/terms/:termId/{open\|lock\|close}` | ✅ | ✅ |
| List / GetById / GetByCode / Delete year | GET `years`, GET `years/:id`, GET `years/code/:code`, DELETE `years/:id` | ✅ | ✅ |
| Curriculum save/update/list/get/delete | `POST/PUT /academic/curriculums...` | ✅ | ✅ |
| CourseAssignment save/update/list/get/delete | `POST/PUT /academic/course-assignments...` | ✅ | ✅ |
| Calendar save/update/list/get/date/delete | `.../academic/calendar...` | ✅ | ✅ |

All paths, methods, and query params line up. Frontend `course-assignments` and `calendar` `list()` do not pass optional filters the backend supports, which is not a mismatch.

### 2.5 Repository persistence and aggregate reconstruction — **BLOCKER**

- **AcademicYear:** `SQLiteAcademicYearRepository` writes to `academic_years` / `academic_terms` and reconstructs via `academicYearFromRows` → `AcademicYear.rehydrate`. The mapper implements a clever status-inference scheme (`is_current`/`is_active`/`description`). **However, the targets are runtime-missing.** `sqlite-engine.ts` loads only `sqlite-schema.sql`+`sqlite-seed.sql`; neither creates `academic_years`/`academic_terms`. `migrations/001_master_data.sql` (which does) is **not loaded**. `exists()` returns false (error swallowed), `runTransactionSync` throws `no such table` → rolls back → `save()` throws. **Create/save of an AcademicYear cannot persist at runtime.**
- **Curriculum:** writes to `subjects_master` — **not present** in the runtime schema. Not persisted.
- **CourseAssignment:** writes to `subjects` with column `subject_id`. The runtime `subjects` table has `id,name,code,class_id,teacher_id,weekly_hours,max_score,pass_score,color` — **no `subject_id` column**, and `name`/`code`/`class_id`/`teacher_id` are NOT NULL. Insert/update fails at runtime.
- **AcademicCalendar:** writes to `schedule_periods` keyed by date in `day`. Runtime `schedule_periods.day` is a CHECK-restricted Arabic weekday name (`'الأحد'…'الخميس'`), and there is **no `academic_week` column**. New-record insert is explicitly a **no-op** (`SQLiteAcademicCalendarRepository.save` else-branch), and `AcademicCalendarService.save` returns a fabricated DTO on "success". Data is **ephemeral / lost**.
- **Aggregate reconstruction:** `AcademicYear.rehydrate` is correct structurally, but `version` is always reset to `0` on load and never persisted — **optimistic concurrency is not actually implemented** (the architecture mandates `expectedVersion` on save for mutable aggregates).

**Impact:** The presentation layer is fully wired, but every Academic write path is non-durable (either throws or silently no-ops) with the schema actually loaded at startup.

### 2.6 UnitOfWork transaction boundaries — **WARNING**

- Mechanism is correct: each repository `save()` registers all queries and commits once via `UnitOfWork.commit()` → `runTransactionSync` (BEGIN/COMMIT/ROLLBACK). Error on commit throws. ✅
- `AcademicYearUseCases.createWithTerms` calls `create()` **then** `addTerm()` in **two separate transactions** — not atomic. If the second fails, a partially-created year persists. ⚠️
- `AcademicCalendarRepository.save` **commits an UPDATE and then returns success even when the new-record branch is a no-op**, so the transaction boundary provides no real durability. ⚠️

### 2.7 Domain event dispatch — **WARNING**

- `AcademicYear` collects domain events and `SQLiteAcademicYearRepository.save` publishes them **after a successful commit** via `eventBus.publish(event.constructor.name, event)`. ✅ Correct ordering.
- **No subscriber is registered** anywhere for `AcademicYearCreated/Approved/Activated/Closed/Archived` or the term events — events are dispatched into the void. Publisher-only, no consumers/projections.
- Curriculum, CourseAssignment, and AcademicCalendar emit **no domain events** (no aggregate involved in their paths), so the event model for those aggregates is absent.
- Events use `event.constructor.name` as the bus key; consistent publish/subscribe keying exists, but the coupling to the class name is fragile.

### 2.8 DI registrations — **WARNING**

- `core/bootstrap/index.ts` registers Academic repositories and services in the DI container (`SERVICE_IDS.AcademicYearRepository`, etc.) and the fail-fast audit passes for those IDs.
- **However**, `application/services/index.ts` independently constructs its own module-level singletons (`new SQLiteAcademicYearRepository()` etc.), and `academicController.ts` imports from `../services` — **not** from the DI container. This creates **dual instantiation** of every Academic repository/service and means the DI container's Academic registrations are effectively **unused by the controller**.
- The composition root is not the single source of truth for the Academic module's runtime object graph.

### 2.9 Error handling and HTTP status codes — **WARNING**

- `sendError()` in `academicController.ts` always returns **HTTP 400**, regardless of failure type:
  - Not-found should be **404** (currently 400).
  - Validation/invariant failures should be **422/409** (currently 400).
- Correct usage: **201** on create, **200** on update/get, **204** on delete. ✅
- No async handler wrapper; all handlers are synchronous today, which is fine, but there is no standardized error envelope / `AppError` mapping at the Academic route layer (generic `{ error: message }`).

### 2.10 RBAC / navigation integration — **WARNING**

- **Frontend:** `Sidebar.tsx` exposes the `academic` nav item only to `admin`; `App.tsx` mounts `AcademicCenter` under the `academic` tab. ✅
- **Backend:** the mounted Academic REST routes in `server.ts` are **unauthenticated** — no auth middleware, no permission checks, no tenant/school-scope filtering. Any caller can create/approve/activate/delete academic years.
- `AcademicYearsScreen.tsx` hard-codes `CURRENT_USER = 'admin'`; no session-derived actor is used.

### 2.11 TypeScript / build status — **WARNING**

- This audit is read-only; I did not modify anything and could not run a fresh production build. The existing `tsc-check.txt` referenced in the workspace was not readable at the recorded path.
- Code reading shows consistent types across the module (DTOs, commands, queries, records, API types). The `application/index.ts` re-exports controllers, services, use-cases, DTOs, mappers together — a broad barrel that may pull Node/Express types into any consumer, a minor hygiene risk.
- **Recommend closing the build/`tsc` verification as part of the existing (already-reported) baseline before Phase 6.3.**

### 2.12 Existing baseline errors vs. new errors

- The separate closure reports (`PHASE6_1_HTTP_VERIFICATION_REPORT.md`, `PHASE6_2_BUILD_CLOSURE_REPORT.md`, `PHASE_BOUNDARY_AUDIT.md`) recorded passing HTTP E2E and frontend integration. **This audit's runtime persistence BLOCKER is consistent with a schema that is only satisfied under a manually-migrated or pre-seeded DB state, not the fresh runtime path** (`sqlite-schema.sql`/seed). The persistence failure is therefore classified as a **baseline gap** that the E2E scripts may have masked by relying on a migrated/stateful DB, rather than a new regression introduced in this audit.
- No new code, tests, or files were introduced by this audit.

### 2.13 Missing CRUD / lifecycle operations — **BLOCKER (completeness)**

- **AcademicYear:** full lifecycle present (create → addTerm → approve → activate → close → archive; term open/lock/close; delete). ✅
- **Curriculum:** only CRUD. Missing architectural lifecycle: `approve`, `activate`, `retire`, subject-assignment/removal, versioning. ⚠️
- **CourseAssignment:** only CRUD. Missing: `activate`, `suspend`, `replace teacher`, `close`, teaching-load calc/exceeded events. ⚠️
- **AcademicCalendar:** only CRUD. Missing: `publish`, school-day change, holiday, teaching-period, exam-season, assessment-period semantics. ⚠️
- **AcademicStructure** (stage/grade/section) and **ClassSchedule** (timetable) aggregates: **completely unimplemented** — no CRUD, no lifecycle, no routes, no screens. ❌

### 2.14 Missing validation / invariants — **WARNING**

- `AcademicYear` has strong invariants (term-in-year, non-overlap, unique term code, status machine, terminal mutation rejection). ✅
- `CurriculumService`, `CourseAssignmentService`, `AcademicCalendarService` **do not validate** beyond DB constraints — they pass raw command strings into repositories. No value-object enforcement on the save path for these three.
- No `policies/` (e.g., `TeacherLoadPolicy`, `CurriculumApprovalPolicy`, `ScheduleConflictPolicy`) and no `specifications/` exist, despite being mandated by the architecture.
- Frontend does basic client-side validation (required fields, date ordering) but the backend does not re-validate for curriculum/courseAssignment/calendar.

### 2.15 Security / data-integrity concerns — **WARNING**

- Unauthenticated Academic REST routes (no auth/permission middleware) — data-integrity and RBAC risk.
- No optimistic concurrency (version not persisted/checked); concurrent edits can overwrite silently.
- Hard-coded actor (`admin`) in the Academic Years screen.
- Calendar "save" reports success for data that is never durably stored (silent data loss).
- `runSqlSync`/`querySqlSync` swallow errors, masking persistence failures at runtime (root cause of the silent non-durability).

---

## 3. Status Classification

| # | Area | Status |
|---|---|---|
| 1 | Dependency direction | **PASS** |
| 2 | No duplicated business logic | **PASS** |
| 3 | No mock data in production paths | **PASS** |
| 4 | API ↔ frontend endpoint match | **PASS** |
| 5 | Repository persistence & aggregate reconstruction | **BLOCKER** |
| 6 | UnitOfWork transaction boundaries | **WARNING** |
| 7 | Domain event dispatch | **WARNING** |
| 8 | DI registrations | **WARNING** |
| 9 | Error handling & HTTP status | **WARNING** |
| 10 | RBAC / navigation integration | **WARNING** |
| 11 | TypeScript / build status | **WARNING** |
| 12 | Baseline vs. new errors | **WARNING** |
| 13 | Missing CRUD / lifecycle | **BLOCKER** |
| 14 | Missing validation / invariants | **WARNING** |
| 15 | Security / data-integrity | **WARNING** |

---

## 4. Key Findings Summary

**PASS (strong):**
- Clean layered architecture with correct dependency direction.
- No business-logic duplication; AcademicYear invariants centralized in the aggregate.
- Full, consistent REST surface; frontend API client matches every route.
- Correct UnitOfWork commit ordering and post-commit event dispatch pattern for AcademicYear.
- Screens/hooks are wired to the real API with proper loading/error/empty states.

**WARNING (needs remediation before hardening):**
- Dual DI instantiation; controller bypasses the DI container.
- Generic 400 for all errors (no 404/409/422 mapping).
- No auth on Academic routes; hard-coded actor.
- Optimistic concurrency not actually implemented.
- Curriculum/CourseAssignment/Calendar have no domain invariants, events, or lifecycle.
- `createWithTerms` is non-atomic; calendar save reports success for non-durable writes.

**BLOCKER (must be resolved before the module is runnable/complete):**
- **Runtime persistence is broken:** the schemas the four repositories rely on (`academic_years`, `academic_terms`, `subjects_master`, `subjects.subject_id`, `schedule_periods.academic_week`/date-day) are absent from the runtime-loaded schema; only `migrations/001_master_data.sql` (never loaded) defines them. All Academic writes fail or silently no-op under the fresh runtime schema.
- **Aggregate completeness:** only `AcademicYear` is fully implemented. `AcademicStructure` and `ClassSchedule` are entirely missing; `Curriculum`, `CourseAssignment`, and `AcademicCalendar` are record passthroughs without their mandated lifecycle/events.

---

## 5. ACADEMIC FINAL STATUS: **BLOCKED**

The module's **architecture, layering, API contract, and frontend integration are sound and PASS**, but the **runtime persistence layer is non-functional against the schema actually loaded at startup**, and the **aggregate/policy/specification set is incomplete** relative to the official architecture. These are **BLOCKER** findings that must be resolved (schema integration/migration application + aggregate completion) before the Academic module can be considered runnable or complete.

*This audit made no modifications and did not begin Phase 6.3 or Phase 7. Audit stopped after report generation.*
