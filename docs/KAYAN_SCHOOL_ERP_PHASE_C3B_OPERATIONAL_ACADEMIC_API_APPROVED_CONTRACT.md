# Kayan School ERP — C3-B: Operational Academic API — **APPROVED IMPLEMENTATION CONTRACT**

> **Status: APPROVED** (D1–D16 accepted). This document supersedes
> `KAYAN_SCHOOL_ERP_PHASE_C3B_OPERATIONAL_ACADEMIC_API_CONTRACT.md` (proposal state).
>
> **No code was written, no migration created, no schema modified, no screen changed, nothing
> committed. C3/C4 not started.** Implementation begins only in the phase named in §H, after the
> blockers in §G are cleared by the system owner.
>
> Two approved decisions **conflict with the existing documented schema** (§G.1 CONFLICT-A,
> CONFLICT-B) and two are **not implementable end-to-end** with the current schema (§G.1
> BLOCKER-C, BLOCKER-D). They are reported, not silently resolved.

Tags used throughout: **[EXISTING]** proven in the repo · **[APPROVED]** decided in C3-B ·
**[DESIGN_REQUIRED]** still open.

---

## 1. FINAL APPROVED CONTRACT

### 1.1 Resources and operations

Five **operational** resources. Reference tables (`subjects_master`, `sections_master`,
`grade_levels`, …) are **not** used as substitutes for them. **[APPROVED]**

| Resource | Base path | LIST | GET | CREATE | UPDATE | DELETE |
|---|---|---|---|---|---|---|
| students | `/api/students` | ✔ | ✔ | ✔ | ✔ | ✔ |
| teachers | `/api/teachers` | ✔ | ✔ | ✔ | ✔ | ✔ |
| classes | `/api/classes` | ✔ | ✔ | ✔ | ✔ | ✔ |
| sections | `/api/sections` | ✔ | ✔ | ✔ | ✔ | ✔ |
| subjects | `/api/subjects` | ✔ | ✔ | ✔ | ✔ | ✔ |

Flat resources only, mirroring the existing `/api/master-data/:entityType` and `/api/academic/*`
conventions. No nested resources in v1 (D8). **[APPROVED]**

Common operation shape, identical to the proven master-data contract **[EXISTING pattern]**:

| Concern | Contract | Tag |
|---|---|---|
| Auth | `Authorization: Bearer <token>`; unauthenticated → 401 | **[APPROVED]** |
| List envelope | `{ data, total, page, pageSize, totalPages }` | **[APPROVED]** |
| Item envelope | the record object | **[APPROVED]** |
| Error envelope | `{ error, details? }`; `details[]` = `{ field, message }` | **[APPROVED]** |
| Status codes | 201 create · 200 update · 204 delete · 400 validation · 401 · 403 · 404 · 409 (duplicate / dependency / concurrency) · 500 | **[APPROVED]** |
| Pagination | `page` ≥ 1, `pageSize` 1…**100** (D2); server validates and rejects out-of-range with 400 | **[APPROVED]** |
| Sorting | `sortBy` restricted to a per-resource allow-list; `sortOrder` `asc\|desc`. Arbitrary column interpolation is forbidden (the master-data `sortBy` behaviour must not be copied) | **[APPROVED]** |
| IDs | Server-generated UUID for every newly created record; the client never supplies an authoritative id (D1) | **[APPROVED]** |
| Dates | ISO 8601; date-only fields `YYYY-MM-DD` (D4) | **[APPROVED]** |
| Timestamps | `created_at` / `updated_at` are server-owned; the client never sends them | **[APPROVED]** |
| Concurrency | Optimistic concurrency on `updated_at`; stale value → **409** (D3) | **[APPROVED]** — see CONFLICT-A |
| Delete | Dependency pre-check; any dependent row → **409** with a dependency message; never cascade (D5) | **[APPROVED]** — see CONFLICT-B |
| Field validation | Derived **only** from existing NOT NULL / UNIQUE / CHECK / FK constraints | **[APPROVED]** |

### 1.2 Per-resource field contracts (from the existing schema only) **[EXISTING → APPROVED]**

**students** — request/response fields:
`academicId, name, classId, sectionId, parentId*, parentName, parentPhone, birthDate, gender,
status, healthNotes, enrollmentDate, userId*, photo`  (*see §5 ownership and §7 BLOCKER-C)
Server-validated: `academicId` unique · `classId` exists · `sectionId` exists **and belongs to
`classId`** · `gender ∈ {male,female}` · `status ∈ {active,transferred,graduated,at-risk}` ·
`userId` exists and is unique · `NOT NULL` columns required.
Query: `page, pageSize, searchQuery(name|academic_id|parent_name), classId, sectionId, status,
sortBy ∈ {name, academic_id, enrollment_date, created_at}, sortOrder`.

**teachers** — `name, email, phone, specialization, qualification, experienceYears, status, photo`
plus relationship references `subjectIds[]`, `classIds[]` (see §5).
Validated: `experienceYears ≥ 0` · `status ∈ {active,on-leave}` · `NOT NULL` required · email
uniqueness is **not** asserted here (it exists on `users.email`, not on `teachers`).
Query: `page, pageSize, searchQuery(name|specialization|qualification), status, sortBy ∈ {name, created_at}`.

**classes** — `name, level`. Validated: `name` unique · `level ∈ [1,12]`.

**sections** — `name, classId, roomNumber, capacity, supervisorTeacherId?`.
Validated: `UNIQUE(class_id, name)` · `capacity > 0` · `classId` exists ·
`supervisorTeacherId` exists when present.
Query: `classId` (required for practical use), plus paging/sorting.

**subjects** — `name, code, classId, teacherId, weeklyHours, maxScore, passScore, color`.
Validated: `weeklyHours > 0` · `maxScore > 0` · `0 ≤ passScore ≤ maxScore` · `classId` and
`teacherId` required **and must exist** (no FK today — §6 GAP-1) · `code` is **not** unique and the
API must not add uniqueness (D14).
Query: `classId`, `teacherId`, `page, pageSize, sortBy ∈ {name, code, created_at}`.

---

## 2. Existing vs Proposed vs DESIGN_REQUIRED

| Area | **[EXISTING]** (unchanged, proven) | **[APPROVED]** (new in C3-B) | **[DESIGN_REQUIRED]** |
|---|---|---|---|
| Auth & token | bearer, 401/403 middleware | same model, mandatory on all five resources | — |
| Envelopes | `{data,total,page,pageSize,totalPages}`, `{error,details?}` | reused verbatim | — |
| Status codes | 400/401/403/404/409/201/204 | reused; +409 for concurrency | — |
| Permission shape | `master_data:<action>` | `<resource>:<action>` for 5 resources (D6) | role→code grant table is server configuration, not defined here |
| Pagination | defaults 1/25, no cap | `maxPageSize = 100` (D2) | — |
| IDs | client-supplied for master data | **server UUID** (D1) | legacy-id mapping at migration time |
| Concurrency | none | `updated_at` check → 409 (D3) | blocked on 4 tables (CONFLICT-A) |
| Delete | `ON DELETE CASCADE` FKs, 409 on dependents in master data | explicit dependency pre-check, never cascade (D5) | — |
| Data scope | none server-side for these entities | server-derived per §4 (D9/D10/D11) | teacher-scope secondary sources |
| Privacy | full rows returned to any authorized caller | per-role projection (§6) | ambiguous fields listed in §6 |
| Repo boundary | ~190 direct `db.*` reads | staged read ports (§C3-B Part G) | migration order |

---

## 3. Permission Matrix **[APPROVED — D6]**

Deny-by-default. Exactly these 20 codes; **no additional permissions** are introduced.

| Resource | read | create | update | delete |
|---|---|---|---|---|
| students | `student:read` | `student:create` | `student:update` | `student:delete` |
| teachers | `teacher:read` | `teacher:create` | `teacher:update` | `teacher:delete` |
| classes | `class:read` | `class:create` | `class:update` | `class:delete` |
| sections | `section:read` | `section:create` | `section:update` | `section:delete` |
| subjects | `subject:read` | `subject:create` | `subject:update` | `subject:delete` |

Rules **[APPROVED]**:
- Enforced **server-side only**, via the existing `authenticate` + `requirePermission(resource, action)`.
- Missing code → **403**. Missing/invalid token → **401**. No code implies no access.
- Role→code **grants are explicit server-side configuration**; this document does not define the
  grant table. **[DESIGN_REQUIRED]** grant table + provisioning procedure.
- No wildcard grants: `RbacService` treats `resource = '*'` as all-actions; wildcards must not be
  issued for these resources.
- `permissions.scope` (school scope, D4) is still **not evaluated** by `RbacService` **[EXISTING]**;
  single-school v1 (D3) means scope filtering is not required yet, but this must be resolved before
  multi-school. **[DESIGN_REQUIRED]**
- The client `can()` remains UX-only and must not be treated as authorization.
- Forward constraint **[EXISTING]**: `users.role` has `CHECK (role IN ('admin','teacher','student','parent'))`,
  so custom per-school roles (D4) remain impossible until that constraint is revisited.

## 4. Data Scope Matrix **[APPROVED — D9, D10, D11]**

The scope is derived **server-side** from the authenticated principal. The client sends **no scope
parameter**; a supplied `teacherId` / `userId` / `parentId` filter is **never trusted for
authorization** and must be ignored or validated against the principal.

| Principal | students | teachers | classes | sections | subjects |
|---|---|---|---|---|---|
| **admin** | all | all | all | all | all |
| **teacher** | students whose `class_id` is in the teacher's `teacher_classes` (D11) | own record only | classes assigned to the teacher | sections of those classes | `subjects.teacher_id = me` or `teacher_subjects` membership |
| **student** | own record only (`students.user_id` = principal) | — | own `class_id` / `section_id` only | own `section_id` only | own class's subjects |
| **parent** | children linked through **`parent_students`** (D9) — `students.parent_id`, `parent_name`, `parent_phone` are **never** used for scope | — | children's classes | children's sections | children's classes' subjects |

Scope mechanics **[APPROVED]**:
- Implemented as application-level server-side authorization (D15). **No PostgreSQL RLS in C3.**
- Every scope query is already supported by an existing index (`idx_students_user`,
  `idx_students_class`, `idx_students_parent`, `idx_teacher_classes_*`, `idx_parent_students_*`,
  `idx_subjects_class`, `idx_subjects_teacher`, `idx_sections_class`) **[EXISTING]** — no new index
  is required by this contract.
- Fail-closed: if the principal's scope cannot be resolved, the result is an empty set, never "all".
- `user_linked_students` is **not** a source for parent scope (D9 fixes `parent_students`).
- **[DESIGN_REQUIRED]** remaining scope sources: whether `sections.supervisor_teacher_id` also
  confers teacher scope (D11 names `teacher_classes` as primary), and whether a teacher's
  `subjects` scope follows `subjects.teacher_id`, `teacher_subjects`, or the union.

## 5. Relationship Ownership Matrix **[APPROVED — D7, D9, D13]**

Ownership is **server-side**. The client may *reference* an id; it can never *establish* a
relationship by sending one. The server validates existence, scope, and authorization of every
referenced id before writing.

| Relationship | Authoritative storage | Status |
|---|---|---|
| class → sections | `sections.class_id` (FK → `school_classes`, `ON DELETE CASCADE`, `UNIQUE(class_id,name)`) | **RESOLVED — authoritative** **[EXISTING]** |
| parent → students | **`parent_students`** (junction) | **APPROVED — authoritative (D9)** |
| ~~student.parent_id~~ | legacy/non-authoritative; must not drive scope or privacy | **[APPROVED]** |
| ~~students.parent_name / parent_phone~~ | legacy display fields; not synchronized, not deleted in C3 (D13) | **[APPROVED]** |
| ~~user_linked_students~~ | not a parent-scope source | **[APPROVED]** |
| teacher → classes | `teacher_classes` (junction) | **APPROVED as primary** (D11) |
| teacher → subjects | **`teacher_subjects` (junction) AND `subjects.teacher_id` — both exist** | **⚠ BLOCKER-D: authority not designated** |
| subject → class | `subjects.class_id` (NOT NULL, **no FK**) | Approved field, integrity gap GAP-1 |
| subject → teacher | `subjects.teacher_id` (NOT NULL, **no FK**) | Approved field, integrity gap GAP-1 + BLOCKER-D |
| teacher → subjects (UI behaviour) | `SubjectsScreen` currently mutates `teacher.subjectIds` **client-side** — the API, not the client, must own this write | **[APPROVED]** |

## 6. Privacy Matrix **[APPROVED — D10]**

Privacy is enforced by the API response projection. UI hiding is never relied upon.

**students**

| Field | admin | teacher | student (own) | parent (children) |
|---|---|---|---|---|
| `id`, `academicId`, `name`, `classId`, `sectionId`, `status`, `photo`, `enrollmentDate` | ✔ | ✔ | ✔ | ✔ |
| `parent_name` | ✔ | ✔ (name only, no contact) | ✔ | ✔ |
| `parent_phone` | ✔ | **✘ (D10)** | ✔ | ✔ |
| `health_notes` | ✔ | **✘ (D10)** | **[DESIGN_REQUIRED]** | **[DESIGN_REQUIRED]** |
| `birth_date` | ✔ | **[DESIGN_REQUIRED]** | ✔ | **[DESIGN_REQUIRED]** |
| `gender` | ✔ | **[DESIGN_REQUIRED]** | ✔ | **[DESIGN_REQUIRED]** |
| `user_id` (internal link) | ✔ | ✘ | ✘ | ✘ |
| `parent_id` (non-authoritative) | ✔ | ✘ | ✘ | ✘ |
| `created_at` | ✔ | ✘ | ✘ | ✘ |

**teachers**

| Field | admin | teacher (own) | other teachers (picker) |
|---|---|---|---|
| `id`, `name`, `specialization`, `photo`, `status` | ✔ | ✔ | ✔ (assignment pickers need name + specialization) |
| `qualification`, `experience_years` | ✔ | ✔ | **[DESIGN_REQUIRED]** |
| `email`, `phone` | ✔ | ✔ (own) | **✘ proposed** |
| `subjectIds`, `classIds` | ✔ | ✔ (own) | ✘ |

Non-private resources: `classes`, `sections`, `subjects` carry no personal data; any caller with the
matching `read` code receives full records, further narrowed by the §4 scope.

Remaining **[DESIGN_REQUIRED]**: every cell marked above, plus whether `health_notes` is ever
visible to a student or a parent (D10 only fixes the teacher case).

## 7. Remaining blockers

### 7.1 Conflicts between approved decisions and the existing schema

**CONFLICT-A — D3 (concurrency on `updated_at`) is not implementable for 4 of 5 resources.**
`updated_at` exists **only** on `subjects` **[EXISTING]**. It is **absent** from `students`,
`teachers`, `school_classes`, `sections` (`migrations/postgres/004_students_teachers.sql`). D3
requires a stale-write check on `updated_at` and a 409 on conflict; there is no column to check
against for those four tables, and this phase may not alter the schema.
→ **Owner decision required:** (a) approve adding `updated_at TIMESTAMP` to those four tables in a
later migration (D16 permits migrations only after API contract + data validation), or (b) approve a
different concurrency token for them, or (c) approve their read/write APIs without optimistic
concurrency. **Not silently changed here.**

**CONFLICT-B — D5 (block on dependents) vs `ON DELETE CASCADE` / `SET NULL` in the schema.**
Existing FKs declare `ON DELETE CASCADE` (sections→classes, `teacher_subjects`, `teacher_classes`,
`parent_students`, `user_linked_students`, and every `users` link) and
`sections.supervisor_teacher_id → teachers ON DELETE SET NULL` **[EXISTING]**. The database *will*
cascade or silently null. D5 forbids both.
→ **Contract resolution (implementable, no schema change):** every DELETE must run an explicit
dependency pre-check and return **409**; the API must never issue a DELETE that would trigger a
cascade. The FK clauses remain as a last-resort safety net only. A delete issued **directly against
the database** (bypassing the API) would still cascade — documented residual risk, out of API scope.
→ **Owner confirmation required** that this service-level enforcement is acceptable for v1.

### 7.2 Blockers (contract cannot be completed end-to-end)

**BLOCKER-C — student CREATE has no valid `user_id` source.**
`students.user_id` is `NOT NULL UNIQUE FK → users(id)` **[EXISTING]**. D12 forbids the client from
synthesizing user ids and defers user-account creation to a separate server workflow, which must not
be invented in C3. The UI currently mints `u_stu_<timestamp>` ids that cannot satisfy the FK.
→ student **read** APIs are unblocked; student **create** is blocked until the account workflow is
specified. Compounded by the `parent_id NOT NULL` column: with `parent_students` authoritative, a
student with no parent link has no legal value for `parent_id` — either "at least one parent link is
mandatory at create" (a business rule needing approval) or the column must become nullable (a schema
change, out of scope here).

**BLOCKER-D — teacher↔subject relationship has no single authority.**
The same relationship is stored twice: the `teacher_subjects` junction **and** `subjects.teacher_id`
**[EXISTING]**. D7 assigns ownership to the server but does not designate which storage is
authoritative, and `SubjectsScreen` currently writes the junction from the client. Data scope in §4
for teacher subjects is therefore ambiguous.
→ **Owner decision required** before any teacher or subject write API: designate
`teacher_subjects` **or** `subjects.teacher_id` as authoritative, and state whether the other is
kept in sync, derived, or removed. **Not chosen here.**

### 7.3 Documented integrity gaps (no action taken)

- **GAP-1:** `subjects.class_id` and `subjects.teacher_id` are `NOT NULL` with **no FK** (003 defers
  cross-layer FKs; 004 does not add them). The service must verify existence explicitly; adding the
  FKs is a future approved migration after data validation (D16).
- **GAP-2:** `subjects.code` has no UNIQUE constraint (D14: do not add one).
- **GAP-3:** `students.parent_name` / `parent_phone` duplicate `parents` data (D13: legacy, untouched).
- **GAP-4:** `RbacService` does not evaluate `permissions.scope`; wildcard `resource='*'` grants
  all actions.

### 7.4 Remaining DESIGN_REQUIRED list

| ID | Decision | Blocks |
|---|---|---|
| DR-1 | Role→permission grant table and provisioning | all writes |
| DR-2 | `permissions.scope` evaluation / multi-school | future |
| DR-3 | teacher↔subject authority (**BLOCKER-D**) | teacher/subject writes, teacher subject scope |
| DR-4 | `updated_at` for students/teachers/classes/sections (**CONFLICT-A**) | concurrency on 4 resources |
| DR-5 | user-account workflow for `students.user_id` (**BLOCKER-C**) | student create |
| DR-6 | "at least one parent link" vs nullable `parent_id` (**BLOCKER-C**) | student create |
| DR-7 | Service-level delete enforcement acceptability (**CONFLICT-B**) | all deletes |
| DR-8 | teacher scope secondary sources (`supervisor_teacher_id`, subject scope union) | teacher reads |
| DR-9 | Privacy cells marked DESIGN_REQUIRED in §6 | field projection |
| DR-10 | `health_notes` visibility to student/parent | field projection |
| DR-11 | Legacy-id mapping for migrated rows vs D1 server UUIDs | cutover |
| DR-12 | `GET /api/classes?include=sections` vs client-side join (D8 forbids nesting) | client read port |
| DR-13 | Staged repository migration order for the ~190 `db.*` call sites | client integration |
| DR-14 | Adding the two missing `subjects` FKs (post-validation migration) | data integrity |

## 8. Exact next implementation phase

**C3.1 — Operational Academic READ APIs (server-side) + client read ports. No writes.**

Scope:
1. Server: `GET /api/students`, `/api/teachers`, `/api/classes`, `/api/sections`, `/api/subjects`
   (+ `GET …/:id`) with bearer auth, `requirePermission` per §3, envelopes per §1, `maxPageSize=100`
   (D2), scope filters per §4, and privacy projection per §6. `updated_at` concurrency does not
   apply to reads, so **CONFLICT-A does not block C3.1**.
2. Client: per-entity **read ports** returning the shapes the existing screens already consume,
   selected by the existing `USE_MOCK` switch (C1/C2 pattern). **No screen edits beyond swapping the
   import**; the ~190 `db.*` call sites are not migrated in C3.1 (DR-13).
3. Tests: repository/port contract tests, mock regression, `npm test`, `lint` baseline, `build`.

Explicitly **not** in C3.1: any write endpoint, any migration, any schema change, any screen
redesign, any C4 work.

Gates before C3.1 starts: DR-1 (grant table) must exist for `read` codes, since deny-by-default would
otherwise 403 every request. DR-9/DR-10 (privacy cells) should be answered before the projection is
coded, or the projection ships with the marked cells omitted and documented.

---

## 9. Exact files changed

**None in code.** `src/` untouched, no migrations, no schema edits, no commit.

Documentation only:
- **new** `docs/KAYAN_SCHOOL_ERP_PHASE_C3B_OPERATIONAL_ACADEMIC_API_APPROVED_CONTRACT.md` (this file)
- **edited** `docs/KAYAN_SCHOOL_ERP_PHASE_C3B_OPERATIONAL_ACADEMIC_API_CONTRACT.md` — header marked
  SUPERSEDED by this approved contract.

**Status: APPROVED CONTRACT — implementation not started. C3 and C4 not started. Nothing committed.**
