# Kayan School ERP — Phase C3: Core Academic REST Integration — **BLOCKED**

> **Outcome: BLOCKED.** The existing Kayan School ERP backend exposes **no REST contract** for
> Students, Teachers, Classes/Sections or Subjects. Requirement #4 forbids inventing endpoints,
> so no REST repository was written for these entities. Nothing was faked or simulated.
>
> **No code was changed in C3.** The four entity surfaces are untouched, Mock Mode is verified
> unregressed, and this document records the pre-flight evidence and the exact gap to close.
> No backend, PostgreSQL, migration, or commit.

---

## 1. Pre-flight findings

### 1.1 The complete existing backend surface (evidence)

The only routers in the codebase (`*Routes.ts`) and their mounts:

| Mount | Router | Endpoints |
|---|---|---|
| `/api` | `createAcademicRouter()` (`modules/academic/api/academicRoutes.ts`) | academic **years** (create/with-terms/add-term/approve/activate/close/archive/open/lock/close term, list, get-by-id, get-by-code, delete), **curriculums** (save/update/list/get-by-id/get-by-code/delete), **course-assignments** (save/update/list/get/delete), **academic calendar** (save/update/list/get/get-by-date/delete) |
| `/api/master-data` | `createMasterDataRouter()` | `:entityType` list/get/create/update/delete + `/bulk` + `/bulk-delete`, restricted to the 33 whitelisted reference entity types |
| `/api/auth` | `createAuthRouter()` | login / refresh / profile / logout (C1) |
| — | inline in `server.ts` | `/api/health`, `/api/ai/*` |

**There is no students, teachers, classes/sections, or subjects router anywhere.** The academic
router covers academic *structure* (years, terms, curriculums, course assignments, calendar) — it
does not expose the four requested entities.

### 1.2 The four entities are not master-data either

`TABLE_MAP` (the master-data whitelist, `repository/masterDataRepository.ts:19-53`) contains 33
reference types. `students`, `teachers`, `school_classes`, `sections` and `subjects` are **absent**.

`sections_master` and `subjects_master` **are** present, but they are reference/lookup tables:

```
subjects_master: id, code, name_ar, name_en, description, grade_level_id,
                 weekly_hours, max_score, pass_score, is_active, display_order, …
sections_master: id, code, name_ar, name_en, description, grade_level_id,
                 capacity, is_active, display_order, …
```

The UI screens consume different, operational tables:

| Screen | Reads | Operational fields the reference tables do not have |
|---|---|---|
| `SubjectsScreen` | `db.subjects` (`subjects`) | `class_id`, `teacher_id`, `color` |
| `ClassesScreen` | `db.classes` (`school_classes`) + `db.sections` | `level`, `room_number`, `capacity`, `supervisor_teacher_id`, class→section nesting |
| `StudentsScreen` | `db.students` (`students`) | `user_id`, `academic_id`, `class_id`, `section_id`, `parent_id/parent_name/parent_phone`, `health_notes` |
| `TeachersScreen` | `db.teachers` (`teachers`) | `user_id`, `subject_ids`, `class_ids`, `qualification`, `experience_years` |

Treating `subjects_master` / `sections_master` as "Subjects" / "Classes-Sections" would invent a
semantic equivalence and silently drop the class/teacher/room/supervisor links. **Not done.**

### 1.3 The repository seam named in the architecture does not exist for two of the four

| Entity | Client access layer | Repository interface? |
|---|---|---|
| Students | `src/modules/students/repository/studentRepository.ts` — `getAll, getById, getByClass, save, delete` | Partial, and barely used |
| Teachers | `src/modules/teachers/repository/teacherRepository.ts` — `getAll, getById, save, delete` | Partial, and barely used |
| Classes/Sections | `getRealmDB().classes` / `.sections` | **None** |
| Subjects | `getRealmDB().subjects` | **None** |

`db.students | db.teachers | db.classes | db.subjects` is read in **190 places** across screens
and components. Introducing a REST repository for classes/sections/subjects would require touching
those call sites, which requirement #7 (no screen redesign) forbids, and the Master Data path
covered in C2 does not apply to these operational entities.

### 1.4 Data-scope / relationship rules are undefined

The existing repository surface already shows the gap: students have `getByClass` but no
"own record" or "linked children" query; there is no documented relationship rule for
student↔parent beyond the pre-existing browser-side `parent_students` / `user_linked_students`
tables (already flagged as ambiguous in the Phase B data-scope contract). Requirement #6 forbids
inventing these.

## 2. Exact endpoints actually used

**None.** No C3 endpoint was used, because no endpoint exists for the four entities. The C1/C2
endpoints (`/api/auth/*`, `/api/master-data/:entityType`) were not extended or re-purposed for
these entities, and no academic endpoint was substituted for them.

## 3. Request / response mapping

**N/A** — no mapping was created, because no request/response contract exists to map. Inventing a
mapping (endpoint name, payload, envelope) is exactly what requirements #4 and "do not invent
business rules" prohibit.

## 4. Repositories changed
**None.** No `Student`/`Teacher`/class/section/subject repository was modified or added.

## 5. Services changed
**None.**

## 6. Mock result
**PASS — unchanged and unregressed** (no code was changed, and it was re-verified):

| Check | Result |
|---|---|
| Auth: mock login, four roles, navigation, logout, session hygiene | **PASS 9/9** |
| Admin CRUD create/update/delete + reload persistence | **PASS** |
| Teacher attendance + persistence | **PASS** |
| Teacher grade save | **PASS** (save accepted; teacher-filtered list hides the row — verified separately with full visibility) |
| Master Data LIST/CREATE + zero REST calls in Mock Mode | **PASS** |
| `npm test` | **PASS 71/71** |
| `npm run lint` | 9 errors — unchanged baseline |
| `npm run build` | **PASS** |
| `run-master-data-runtime.mjs` (existing) | **317 pass / 0 fail** |

## 7. Real client result
**Not applicable — nothing could be implemented.** `USE_MOCK=false` continues to select the C1/C2
real paths (auth + master data) exactly as verified in C1/C2. No new selection was added for the
four entities, and no mock fallback was introduced.

## 8. Live result
**LIVE CORE ACADEMIC = NOT VERIFIED.** The backend is unreachable *and* exposes no contract for
these entities. Nothing was simulated.

## 9. Backend mismatches (the gap to close)

For the backend to support C3, it must provide — naming, shapes and permissions are **backend
decisions**, deliberately left open here:

| # | Gap | Notes |
|---|---|---|
| M1 | No students endpoint | list / get / create / update / delete not defined |
| M2 | No teachers endpoint | list / get / create / update / delete not defined |
| M3 | No classes / sections endpoint | incl. section↔class nesting, capacity, supervisor |
| M4 | No subjects endpoint | incl. subject↔class and subject↔teacher links |
| M5 | No data-scope parameters | student "own data" / parent "children" scoping is undefined server-side |
| M6 | No permissions for these resources | only `master_data:read\|create\|update\|delete` exist today |
| M7 | Error envelope/status mapping for these resources | unverified (only master-data 400/404/409/401/403 is evidenced) |
| M8 | Envelope shape for list responses | master-data returns `{data,total,page,pageSize,totalPages}`; unknown for these |

## 10. DESIGN_REQUIRED

1. **Backend scope decision (blocking):** does the Kayan backend own these four entities, or are
   they expected to be served through the existing master-data contract? The answer determines
   whether C3 is a new API surface or an extension of an existing one.
2. Endpoint names, request/response shapes, and status codes for the four entities.
3. Data-scope model for students and parents (own / children), enforced server-side.
4. Permission codes for student/teacher/class/subject resources.
5. Client architecture decision: introduce repository interfaces for classes/sections/subjects
   (≈190 call sites) or keep them browser-bound for now. This is a design decision, not a C3 change.
6. Relationship ownership: `parent_students` vs `user_linked_students` vs `students.parent_id`;
   subject↔class↔teacher authority.
7. Reference vs operational entities: whether `subjects_master` / `sections_master` are meant to
   replace, feed, or coexist with `subjects` / `sections` / `school_classes`.
8. Unchanged pre-existing blockers: RB-1 (`password_hash` in the mock DB blob), RB-2 (hardcoded
   signing/encryption defaults in the SPA bundle), and C1 `LIVE AUTH = NOT VERIFIED`.

## 11. Exact files changed
**None** (C3 is documentation only).

- **new** `docs/KAYAN_SCHOOL_ERP_PHASE_C3_CORE_ACADEMIC_GAP_ANALYSIS.md` (this file)

## 12. Status: **BLOCKED**

C1 and C2 stand as accepted. C3 cannot be implemented for Students, Teachers, Classes/Sections and
Subjects without inventing API endpoints or redesigning screens, both of which are explicitly
forbidden. The backend contract must be defined (or its owner identified) before C3 can proceed.
**C4 is not started. Nothing was committed.**
