# Kayan School ERP — Phase C3-B: Operational Academic API Contract Proposal

> **SUPERSEDED — DO NOT IMPLEMENT FROM THIS DOCUMENT.**
> This proposal was resolved into the approved contract:
> **`KAYAN_SCHOOL_ERP_PHASE_C3B_OPERATIONAL_ACADEMIC_API_APPROVED_CONTRACT.md`**
> (decisions D1–D16 accepted, plus the schema conflicts and blockers recorded there).
> This file is retained only as the evidence trail of the pre-approval analysis.

> **Status: PROPOSAL — requires system-owner approval before implementation.**
> This document resolves the C3 contract gap (M1–M10) as a **design/contract proposal** for the
> **existing** Kayan backend. **No endpoint was implemented, no client repository was created, no
> screen was modified, no data was migrated, and nothing was committed.** C4 is not started.
>
> Every section is tagged:
> **[EXISTING]** = proven by the repository (schema, code, tests, docs)
> · **[PROPOSED]** = derived only from the above, offered for approval
> · **[DESIGN_REQUIRED]** = cannot be decided from existing evidence; owner decision needed

---

## Part A — Existing evidence

### A.1 Backend surface today **[EXISTING]**

| Mount | Operations | Protection |
|---|---|---|
| `/api/auth` | login / refresh / profile / logout | bearer; C1 verified client-side |
| `/api/master-data/:entityType` | list, get, create, update, delete, `POST /bulk`, `POST /bulk-delete` | `authenticate` + `requirePermission('master_data', read\|create\|update\|delete)` |
| `/api/academic/*` | academic years/terms, curriculums, course-assignments, academic calendar | **unauthenticated** (pre-existing gap) |
| `/api/ai/*`, `/api/health` | AI helpers, health | unauthenticated |

There is **no** students / teachers / classes / sections / subjects API. **[EXISTING]**

### A.2 Contract patterns already proven **[EXISTING]**

Reused verbatim by this proposal so no new pattern is invented:

| Concern | Existing implementation (evidence) |
|---|---|
| Auth | `Authorization: Bearer <token>`; `authenticate` → 401; `requirePermission` → 403 (`core/auth/authMiddleware.ts`) |
| List envelope | `{ data, total, page, pageSize, totalPages }` (`masterDataApiService.list` + live test) |
| Error envelope | `{ error, details? }` (`modules/master-data/api/errors.ts`) |
| Status codes | 400 validation, 404 missing, 409 duplicate **or** "has dependent rows", 201 created, 204 deleted |
| Query params | `page`, `pageSize`, `searchQuery`, `is_active`, `sortBy`, `sortOrder` |
| Permission code shape | `<resource>:<action>` (only `master_data:*` exists today) |
| Resource whitelist | `TABLE_MAP` (33 reference entity types) — does **not** include the four entities **[EXISTING]** |

### A.3 Database schema (authoritative) **[EXISTING]**

From `migrations/postgres/004_students_teachers.sql` and `003_academic.sql`:

```
teachers(id PK, user_id UNIQUE FK users, name, email, phone, specialization,
         qualification, experience_years >=0, photo, status IN (active|on-leave))
school_classes(id PK, name UNIQUE, level BETWEEN 1 AND 12)
sections(id PK, name, class_id FK school_classes CASCADE, room_number,
         capacity >0, supervisor_teacher_id FK teachers SET NULL, UNIQUE(class_id,name))
students(id PK, user_id UNIQUE FK users, academic_id UNIQUE, name,
         class_id FK school_classes, section_id FK sections, parent_id FK parents,
         parent_name, parent_phone, birth_date TEXT, gender IN (male|female), photo,
         status IN (active|transferred|graduated|at-risk), health_notes, enrollment_date TEXT)
subjects(id PK, name, code, class_id NOT NULL, teacher_id NOT NULL, weekly_hours >0,
         max_score >0, pass_score 0..max_score, color, subject_id, created_at, updated_at)

teacher_subjects(teacher_id, subject_id)  teacher_classes(teacher_id, class_id)
parent_students(parent_id, student_id)    user_linked_students(user_id, student_id)
```

Supporting indexes already exist for every scope query this proposal needs **[EXISTING]**:
`idx_students_user`, `idx_students_class`, `idx_students_section`, `idx_students_parent`,
`idx_sections_class`, `idx_sections_supervisor`, `idx_subjects_class`, `idx_subjects_teacher`,
`idx_teacher_subjects_*`, `idx_teacher_classes_*`, `idx_parent_students_*`,
`idx_user_linked_students_*`.

**Schema gap:** `subjects.class_id` and `subjects.teacher_id` are **NOT NULL but carry no FK**
(the 003 comment defers cross-layer FKs to 004, and 004 does not add them). **[EXISTING]**

### A.4 What the current UI actually writes and filters **[EXISTING]**

| Screen | Writes | Filters / scope it assumes |
|---|---|---|
| `StudentsScreen` | `name, academicId, classId, sectionId, parentId(="p1" hardcoded), parentName, parentPhone, birthDate, gender, status, healthNotes` + synthetic `userId` | free-text search over `name/academicId/parentName`; `class_id` filter; `status` filter; teacher scope via `teacher.classIds`; parent scope via `parent.studentIds` |
| `TeachersScreen` | `name, email, phone, specialization, qualification, experienceYears, status`; on create also `subjectIds: []`, `classIds: [firstClass]` | search over `name/specialization/qualification` |
| `SubjectsScreen` | `name, code, classId, teacherId, weeklyHours, maxScore`; **mutates `teacher.subjectIds`** when a subject is created | `class_id` filter; `teacher_id` filter |
| `ClassesScreen` | class `name, level`; section `name, classId, roomNumber, capacity, supervisorTeacherId` | sections per class; student count per class |

The UI also mutates junction state **client-side** (`SubjectsScreen` pushes into
`teacher.subjectIds`), which is exactly the ownership question in D.4 below. **[EXISTING]**

---

## Part B — Cross-cutting contract decisions

| Concern | Decision | Tag |
|---|---|---|
| Base path | Mirror the two existing namespaces: `/api/<resource>` and `/api/<resource>/:id` | **[PROPOSED]** |
| Auth | Bearer token on every operation; no anonymous access (the academic router's unauthenticated state must **not** be copied) | **[PROPOSED]** |
| List envelope | `{ data, total, page, pageSize, totalPages }` — identical to master-data | **[PROPOSED]** (pattern **[EXISTING]**) |
| Error envelope | `{ error, details? }`; details carry per-field validation errors | **[PROPOSED]** (pattern **[EXISTING]**) |
| Status codes | 201 create · 200 update · 204 delete · 400 validation · 401 unauthenticated · 403 unauthorized · 404 not found · 409 duplicate or "has dependent rows" · 500 unexpected. **No 422** (not used by the existing API) | **[PROPOSED]** |
| ID generation | Client sends an `id` for create (the UI generates ids today: `s_${Date.now()}`, `c_${Date.now()}`). Server must either accept it or own generation — pick one | **[DESIGN_REQUIRED]** D.1 |
| Timestamps / audit fields | Server-owned (`created_at`, `updated_at`); the client must not send them. The UI currently sets them locally | **[PROPOSED]** |
| Pagination | `page` (1-based) + `pageSize`, same defaults as master-data (`1` / `25`); a server maximum `pageSize` must be defined | **[PROPOSED]** + **[DESIGN_REQUIRED]** D.2 (max page size) |
| Sorting | Whitelisted column allow-list per resource (the master-data `sortBy` string is currently interpolated — a known injection risk that must **not** be copied) | **[PROPOSED]** |
| Soft delete | None exists in the schema (hard delete only) | **[EXISTING]** |
| Concurrency | No `version`/`row_version` column exists → no optimistic locking | **[EXISTING]** → **[DESIGN_REQUIRED]** D.3 if required |

---

## Part C — Per-entity contracts

### C.1 Students — resolves **M1**

**Resource:** `student` · **Base path:** `/api/students` **[PROPOSED]**

| Operation | Endpoint | Justification (UI) |
|---|---|---|
| LIST | `GET /api/students` | Students table (list, search, class filter, status filter) |
| GET | `GET /api/students/:id` | row actions / profile dashboard |
| CREATE | `POST /api/students` | "تسجيل طالب جديد" (admin only) |
| UPDATE | `PUT /api/students/:id` | edit modal (admin only) |
| DELETE | `DELETE /api/students/:id` | delete with confirm (admin only) |

**Query parameters** **[PROPOSED]**: `page`, `pageSize`, `searchQuery` (matches `name` / `academic_id` / `parent_name` — the exact fields the UI searches), `classId`, `sectionId`, `status` (`active|transferred|graduated|at-risk`), `sortBy` (allow-list: `name`, `academic_id`, `enrollment_date`, `created_at`), `sortOrder`.

**Request shape (create/update)** — exactly the DB columns, no more **[PROPOSED]**:
```json
{ "id":"…", "academicId":"…", "name":"…", "classId":"…", "sectionId":"…",
  "parentId":"…", "parentName":"…", "parentPhone":"…", "birthDate":"YYYY-MM-DD",
  "gender":"male|female", "status":"active", "healthNotes":"…", "enrollmentDate":"YYYY-MM-DD",
  "userId":"…" }
```
`healthNotes` is optional; `photo` is accepted as a URL string (as today).

**Response shape** **[PROPOSED]**: list → the A.2 envelope with the same field names as the request
(camelCase, mapped server-side to the snake_case columns). Item → the record object.

**Validation** — derived **only** from existing constraints **[EXISTING → PROPOSED]**:
`academicId` unique; `classId` must exist; `sectionId` must exist **and belong to `classId`**
(the UI only offers sections of the chosen class); `parentId` must exist; `gender ∈ {male,female}`;
`status ∈ {active,transferred,graduated,at-risk}`; `userId` must exist and be unique; all
`NOT NULL` columns required. `birthDate`/`enrollmentDate` are TEXT in the DB → format is a
**[DESIGN_REQUIRED]** decision (D.4: enforce ISO `YYYY-MM-DD` or leave as text).

**Status codes** **[PROPOSED]**: 400 field errors (`details[]`), 409 duplicate `academicId` or
`id`, 409 when delete is blocked by dependent rows (attendance/grades/payments — FKs are
`ON DELETE CASCADE` today, so the backend must decide cascade vs block: **[DESIGN_REQUIRED]** D.5),
404 unknown id, 401/403 as usual.

**Permissions** **[DESIGN_REQUIRED]** D.6 — proposed shape `student:read|create|update|delete`
(see Part D). UI already restricts create/update/delete to admin; the backend must enforce it.

**Data scope** — see Part E. Must be **server-side**; the client must not pass a student id to
widen its own scope.

### C.2 Teachers — resolves **M2**

**Resource:** `teacher` · **Base path:** `/api/teachers` **[PROPOSED]**
Operations: LIST / GET / CREATE / UPDATE / DELETE — all four justified by `TeachersScreen`
(list+search, card/profile, create, edit, delete) plus `DocumentCenterScreen` and
`TimetableScreen` (teacher pickers → LIST is required by more screens than any other resource).

**Request shape** **[PROPOSED]**: `name, email, phone, specialization, qualification,
experienceYears, status`, plus junction writes `subjectIds[]` and `classIds[]`.

**Response** adds the resolved junction arrays so the UI's `teacher.subjectIds` / `teacher.classIds`
keep working **[PROPOSED]**.

**Validation** **[EXISTING → PROPOSED]**: `userId` unique FK; `experienceYears >= 0`;
`status ∈ {active,on-leave}`; `email` non-null (**not unique** in this table — uniqueness exists
on `users.email`, so a duplicate email must be rejected through the user, not the teacher row).

**Critical ownership question** — `subjectIds` / `classIds` are **junction rows**
(`teacher_subjects`, `teacher_classes`), and `subjects.teacher_id` also points at a teacher.
**The database therefore stores the teacher↔subject link in two places.** **[EXISTING]**
→ **[DESIGN_REQUIRED]** D.7: which one is authoritative, and does `POST/PUT /api/teachers` write
the junctions (proposal) while `subjects.teacher_id` stays a denormalized pointer?

### C.3 Classes & Sections — resolves **M3**

Two resources, because the schema has two tables with different lifecycles and the UI edits them
separately (`ClassesScreen` has a class form and a section form).

**Resources:** `class` → `/api/classes`, `section` → `/api/sections` **[PROPOSED]**

| Operation | Endpoint | Justification |
|---|---|---|
| LIST classes | `GET /api/classes` | class pickers in **8+ screens** |
| GET / CREATE / UPDATE / DELETE class | `GET/POST/PUT/DELETE /api/classes[/:id]` | ClassesScreen CRUD |
| LIST sections | `GET /api/sections?classId=…` | section pickers, attendance/grades/students |
| GET / CREATE / UPDATE / DELETE section | `GET/POST/PUT/DELETE /api/sections[/:id]` | ClassesScreen section CRUD |

**Class request** **[PROPOSED]**: `{ id, name, level }`.
**Section request** **[PROPOSED]**: `{ id, name, classId, roomNumber, capacity, supervisorTeacherId }`.

**Validation** **[EXISTING → PROPOSED]**: class `name` unique, `level ∈ [1,12]`; section
`UNIQUE(class_id, name)`, `capacity > 0`, `classId` must exist, `supervisorTeacherId` must be an
existing teacher (nullable — `ON DELETE SET NULL`).

**Nested option** **[DESIGN_REQUIRED]** D.8: `GET /api/classes?include=sections` returning the
nested shape the UI's `SchoolClass.sections` expects, **or** a flat `/api/sections` list the client
joins. The UI currently receives nested classes, so nesting avoids a client-side join — but it is a
backend decision, not a given.

**Permissions** **[DESIGN_REQUIRED]** D.6: proposed `class:*` and `section:*`.

### C.4 Subjects — resolves **M4**

**Resource:** `subject` · **Base path:** `/api/subjects` **[PROPOSED]**
LIST / GET / CREATE / UPDATE / DELETE — all justified by `SubjectsScreen` plus picker usage in
`GradesScreen` and `ReportsScreen`.

**Request** **[PROPOSED]**: `{ id, name, code, classId, teacherId, weeklyHours, maxScore,
passScore, color }` (+ optional `subjectId` FK to `subjects_master`, the reference link).
**Explicitly NOT proposed:** treating `subjects_master` as the subject resource — different
semantics (`grade_level_id` vs `class_id`/`teacher_id`, `is_active`/`display_order` vs `color`).
`subjects_master` remains a **reference** entity served by the existing master-data contract. **[EXISTING]**

**Validation** **[EXISTING → PROPOSED]**: `weeklyHours > 0`; `maxScore > 0`;
`0 ≤ passScore ≤ maxScore`; `classId`/`teacherId` required. **Because these two columns have no FK**
(A.3), the service must verify existence explicitly, and the schema should gain the constraints
(Part F) **[PROPOSED]**.

**Permissions** **[DESIGN_REQUIRED]** D.6: proposed `subject:*`.

---

## Part D — Permission model requiring approval (resolves **M6**)

**[EXISTING]** Only `master_data:read|create|update|delete` exist. Production RBAC seed is
intentionally empty (deny-by-default) per PG-6 §7.1. D4 requires `Role → Permission → Resource →
Action → School Scope` and allows custom roles.

**[PROPOSED]** — mechanical extension of the existing code shape only:

| Resource | Codes |
|---|---|
| students | `student:read`, `student:create`, `student:update`, `student:delete` |
| teachers | `teacher:read`, `teacher:create`, `teacher:update`, `teacher:delete` |
| classes | `class:read`, `class:create`, `class:update`, `class:delete` |
| sections | `section:read`, `section:create`, `section:update`, `section:delete` |
| subjects | `subject:read`, `subject:create`, `subject:update`, `subject:delete` |

**[PROPOSED]** Mapping mirrors what the UI already assumes (admin: full CRUD; teacher: read
students/classes/subjects; student/parent: read-scoped). **[DESIGN_REQUIRED]** D.6: the actual
role→permission grant matrix, the school-scope column semantics (the `permissions.scope` column
exists but is not evaluated by `RbacService`), and whether per-action codes are required or
`resource:*` wildcards are allowed.

**Client boundary:** the frontend `can()` remains UX-only. It must not be extended to decide
visibility for these resources until the backend codes exist.

## Part E — Data-scope model requiring approval (resolves **M5**)

**[EXISTING]** joins that make scoping possible without new schema:
`students.user_id` (idx), `students.class_id`, `students.parent_id`, `parent_students`,
`user_linked_students`, `teacher_classes`, `teacher_subjects`, `sections.supervisor_teacher_id`.
**[EXISTING]** The client today filters fail-open (when a teacher/parent record is not found, no
filter is applied) — a defect this contract must not reproduce.

**[PROPOSED]** Server-side scoping rules, evaluated per request from the authenticated principal:

| Principal | Students scope | Teachers | Classes/Sections | Subjects |
|---|---|---|---|---|
| admin | all | all | all | all |
| teacher | students in `teacher_classes` of that teacher | own record | classes assigned to that teacher | `subjects.teacher_id = me` or `teacher_subjects` |
| student | own record only (`students.user_id = me`) | — | own class/section only | own class's subjects |
| parent | students linked via the approved relationship (Part E note) | — | own children only | own children's classes |

**[PROPOSED]** The scope is derived from the token on the server; **the client sends no scope
parameter** (a supplied scope parameter is ignored, never honoured).

**[DESIGN_REQUIRED]**
- **D.9 — the parent relationship.** Three candidates exist: `students.parent_id` (single parent,
  `NOT NULL`), `parent_students` (many-to-many), `user_linked_students` (user→student). All three
  are populated differently in the mock data. **One must be declared authoritative** before a parent
  scope can be implemented. This proposal does **not** choose.
- **D.10 — field-level visibility.** `health_notes`, `parent_phone`, `parent_name` and
  `birth_date` are private. The current UI shows them to every role (pre-existing exposure). A
  projection rule per role is required; until then the API must be treated as returning full
  records to any authorized caller.
- **D.11 — teacher scope source:** `teacher_classes` vs `sections.supervisor_teacher_id`.

## Part F — Required database/schema changes

None are strictly required to expose the APIs; all are **recommended** and need approval:

| # | Change | Why | Tag |
|---|---|---|---|
| S.1 | Add FK `subjects.class_id → school_classes(id)`, `subjects.teacher_id → teachers(id)` | Both are `NOT NULL` with no referential integrity today | **[PROPOSED]** |
| S.2 | Decide `students.user_id` (NOT NULL UNIQUE FK) creation flow | The UI mints synthetic `u_stu_…` ids that cannot satisfy the FK; either the API creates the `users` row or the column becomes nullable | **[DESIGN_REQUIRED]** D.12 |
| S.3 | Denormalized `parent_name` / `parent_phone` on `students` | Who writes them, and are they kept in sync with `parents`? | **[DESIGN_REQUIRED]** D.13 |
| S.4 | `subjects.code` has no UNIQUE constraint (unlike `subjects_master.code`) | Decide whether operational subject codes are unique per class | **[DESIGN_REQUIRED]** D.14 |
| S.5 | `updated_at` is app-managed (no triggers) per the 004 type policy | Keep; the API owns writes | **[EXISTING]** |
| S.6 | Row-level security vs application-level scoping | Part E can be implemented purely in the service; RLS is a later hardening option | **[DESIGN_REQUIRED]** D.15 |

**No migration is executed by C3-B.** These are proposals for the backend owner.

## Part G — Repository boundary for the ~190 direct `db.*` call sites (resolves **M10**)

**[EXISTING]** `db.students | db.teachers | db.classes | db.subjects` is read in ~190 places.
Students/Teachers have small module repositories that are barely used; Classes/Sections/Subjects
have **no** repository. The C2 pattern (`repository provider` + REST implementation behind the same
interface) applies only where an interface already exists.

**[PROPOSED]** — staged, no screen redesign:
1. **Read ports first.** Introduce per-entity read ports (`listStudents(query)`, `listTeachers(query)`,
   `listClasses()`, `listSubjects(query)`) returning the *same shapes the UI already consumes*
   (nested `SchoolClass.sections`, `subjectIds`/`classIds` on teachers) so screens need no changes.
2. **Mock implementation** = today's browser read path; **real implementation** = the new API.
   Selected by the same `USE_MOCK` switch as C1/C2.
3. **Writes second**, after the reads prove the envelope and scope.
4. `getRealmDB()` stays as the mock implementation until cutover; screens are not edited except to
   swap the import.

**[DESIGN_REQUIRED]** D.16: approve the staged order (reads before writes) and whether the ~190
call sites are migrated in one pass or per module. **Migrating all 190 in one phase is explicitly
out of scope for C3.**

## Part H — Migration impact

**[EXISTING]** D5 requires: preserve Al-Salam data, copy/transform/validate/import, backup +
reconciliation report, and **do not delete SQLite until PostgreSQL is verified**.

Impact of this proposal: **none for existing data.** The four APIs are additive reads/writes over
tables that already exist in PostgreSQL. The browser SQLite remains authoritative for these
entities until a later cutover phase, so:
- Mock Mode is unaffected by anything in this document.
- The D5 migration/reconciliation report must include these four entity types (they are
  operational data, not master data).
- S.1–S.4 (if approved) would be **additive constraints** and must be applied only after the
  migrated data is validated, otherwise a bad row would block the constraint.

## Part I — M1–M10 resolution

| ID | Resolution |
|---|---|
| **M1** students endpoint | Proposed: `/api/students` LIST/GET/POST/PUT/DELETE (§C.1) — **awaiting approval** |
| **M2** teachers endpoint | Proposed: `/api/teachers` + junction writes (§C.2) — **awaiting approval** |
| **M3** classes/sections endpoint | Proposed: `/api/classes` + `/api/sections` (§C.3) — **awaiting approval** |
| **M4** subjects endpoint | Proposed: `/api/subjects`; explicitly **not** mapped to `subjects_master` (§C.4) |
| **M5** student/parent data scope | Part E, server-side only; the parent relationship itself is **D.9** |
| **M6** permissions | Part D, `resource:action` extension of the existing shape; grant matrix = **D.6** |
| **M7** error mapping | Part B — reuses the proven `{error, details?}` + 400/401/403/404/409 set |
| **M8** list envelope | Part B — `{data,total,page,pageSize,totalPages}`, identical to master-data |
| **M9** operational vs reference ownership | §C.4: `subjects`/`sections`/`school_classes` are operational; `subjects_master`/`sections_master` stay reference (master-data) |
| **M10** repository boundary | Part G — staged read-ports first; ~190 sites not migrated in C3 |

## Part J — Open DESIGN_REQUIRED decisions (system owner)

| ID | Decision |
|---|---|
| D.1 | ID generation: client-supplied or server-owned |
| D.2 | Maximum `pageSize` |
| D.3 | Optimistic concurrency (no `version` column exists) |
| D.4 | Date format enforcement for `birth_date` / `enrollment_date` (TEXT columns) |
| D.5 | Delete semantics: cascade vs block for dependents (FKs are `ON DELETE CASCADE` today) |
| D.6 | Role→permission grant matrix + `permissions.scope` semantics |
| D.7 | Teacher↔subject / teacher↔class ownership (junction vs `subjects.teacher_id`) |
| D.8 | Nested `include=sections` vs flat section list |
| D.9 | **Authoritative parent↔student relationship** (`students.parent_id` vs `parent_students` vs `user_linked_students`) |
| D.10 | Field-level visibility of `health_notes`, `parent_phone`, `birth_date` per role |
| D.11 | Teacher scope source: `teacher_classes` vs `sections.supervisor_teacher_id` |
| D.12 | `students.user_id` creation flow (create the user row, or relax the column) |
| D.13 | Ownership of denormalized `parent_name` / `parent_phone` |
| D.14 | Uniqueness of `subjects.code` per class |
| D.15 | Application-level scoping vs row-level security |
| D.16 | Staged repository migration order and scope |

## Part K — Files changed

**None (no code).** C3-B added exactly one document:

- **new** `docs/KAYAN_SCHOOL_ERP_PHASE_C3B_OPERATIONAL_ACADEMIC_API_CONTRACT.md`

## Part L — Status

**CONTRACT PROPOSAL READY FOR APPROVAL — implementation not started.**
The contract is derived only from the existing PostgreSQL schema, the existing proven API patterns,
and the actual UI read/write surface. Every business decision that cannot be derived (D.1–D.16) is
listed rather than guessed. **C4 is not started. Nothing was committed.**
