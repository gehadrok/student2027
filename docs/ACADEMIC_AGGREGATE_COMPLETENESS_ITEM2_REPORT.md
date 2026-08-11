# Academic Aggregate Completeness - Item 2 Report

## Status

**STOPPED BEFORE CODE CHANGES.**

Per the Item 2 instruction: "Do NOT invent business rules. If the required contract is not defined, STOP and report the missing specification instead of guessing."

After re-reading the Academic Final Architecture Audit, the official Academic architecture, the Student Domain Standard, existing Academic domain implementation, TODO/phase trackers, and repository/application/API contracts, the aggregate-completeness blocker cannot be safely implemented yet without inventing business rules.

## Original Blocker

The Academic Final Architecture Audit identified aggregate completeness as a blocker:

- `AcademicYear` is fully implemented.
- `AcademicStructure` is missing.
- `ClassSchedule` is missing.
- `Curriculum`, `CourseAssignment`, and `AcademicCalendar` are record-oriented persistence models without mandated aggregate lifecycle/events.
- Required `policies/`, `specifications/`, and `domain/services/` layers are incomplete or absent.

## Architecture Contract Used

Authoritative sources reviewed:

- `docs/ACADEMIC_FINAL_ARCHITECTURE_AUDIT.md`
- `docs/domain/academic-domain-official-architecture.md`
- `docs/standards/student-domain-standard.md`
- Academic phase/TODO trackers
- Existing Academic domain, repository, application, controller, route, and API contracts

The official architecture defines the aggregate names, responsibilities, high-level invariants, lifecycle state names, event names, policy names, and specification names. The Student Domain Standard defines implementation discipline: aggregates must enforce real invariants, reject invalid transitions, update versions/last-modified state, record events, and avoid fake behavior.

## Missing Specification

The official architecture is implementation-neutral and does not define enough executable rules for the missing aggregates and policies. Implementing them now would require guessing.

### AcademicStructure

Defined contract:

- Owns `EducationStage`, `GradeLevel`, `Section`, `AcademicStructureVersion`.
- Must define stages, grade levels, sections, capacity and ordering rules, and publish structure change events.
- Invariants include unique stage order, unique grade order within a stage, unique section code within grade/year scope, non-negative capacity, and archived stages/grades cannot receive sections.

Missing executable details:

- Status model for stage, grade level, section, and structure version.
- Valid archive/publish lifecycle transitions.
- Whether archive is allowed when sections/grades are referenced by students or schedules.
- Exact versioning semantics for `AcademicStructureVersion`.
- Whether section capacity is non-negative per architecture or `>= 1` per existing `SectionCapacity` value object.

### Curriculum

Defined contract:

- Lifecycle statuses: `draft`, `approved`, `active`, `retired`.
- Use cases: create curriculum, create subject, assign subject to grade level, approve, activate, retire.
- Events: `CurriculumCreated`, `CurriculumApproved`, `CurriculumActivated`, `CurriculumRetired`, `SubjectCreated`, `SubjectAssignedToGradeLevel`, `SubjectRemovedFromGradeLevel`.

Missing executable details:

- Approval requirements for `CurriculumApprovalPolicy`.
- Activation prerequisites beyond "approved before activation".
- Subject category vocabulary and rules for core/elective/optional/ministry-required.
- Versioning model for `CurriculumVersion`.
- Exact conditions for removing a subject from active curriculum when referenced by assignments or assessments, including how those references are checked.

### CourseAssignment

Defined contract:

- Lifecycle statuses: `draft`, `active`, `suspended`, `replaced`, `closed`.
- Must assign teacher, subject, grade, section, year, and term.
- Must enforce teacher load and subject eligibility policies.
- Events include created, activated, suspended, teacher replaced, closed, load calculated, and load exceeded.

Missing executable details:

- Valid transition matrix, especially from `suspended` and `replaced`.
- Teacher load thresholds and whether they vary by teacher/stage/term.
- Teacher eligibility requirements.
- Subject eligibility source of truth and validation rules.
- Replacement semantics: whether a replacement creates a new aggregate, updates the same aggregate, or links both.
- Close prerequisites and whether suspended/replaced assignments can be closed.

### AcademicCalendar

Defined contract:

- Owns `SchoolDay`, `Holiday`, `ExamSeason`, `AssessmentPeriod`, `TeachingPeriod`, `CalendarVersion`.
- Must define school days, holidays, teaching periods, exam seasons, assessment periods, and publish calendar events.

Missing executable details:

- Calendar lifecycle/status model before and after publication.
- Publication requirements for `CalendarPublicationPolicy`.
- Makeup-day semantics and how holidays can be instructional.
- Exam season overlap policy.
- Assessment period relationship to terms and exam seasons.
- Teaching period template scope and overlap rules.
- Calendar version immutability/supersession rules.

### ClassSchedule

Defined contract:

- Lifecycle statuses: `draft`, `validated`, `published`, `active`, `retired`.
- Owns `ScheduleSlot`, `ScheduleVersion`, `TeachingLoadSnapshot`.
- Must detect teacher, section, room, and subject conflicts.

Missing executable details:

- Full transition matrix and preconditions for validation, publication, activation, retirement.
- Date-range semantics for a schedule version.
- Exact slot identity, period template linkage, and room optionality behavior.
- How active course assignments are loaded/verified.
- Whether conflict detection blocks assignment or records `ScheduleConflictDetected` while allowing drafts.
- One-active-version enforcement scope and persistence contract.

### Policies

The architecture names required policies but does not define their executable contracts:

- `AcademicYearActivationPolicy`
- `TermBoundaryPolicy`
- `SectionCapacityPolicy`
- `CurriculumApprovalPolicy`
- `SubjectEligibilityPolicy`
- `TeacherLoadPolicy`
- `TeacherAssignmentPolicy`
- `CalendarPublicationPolicy`
- `HolidayPolicy`
- `ExamSeasonPolicy`
- `AssessmentPeriodPolicy`
- `ScheduleConflictPolicy`
- `SchedulePublicationPolicy`
- `MultiSchoolScopePolicy`

Missing details include method signatures, required inputs, return shapes, thresholds, and institution-specific rule parameters.

### Specifications

The architecture names required specifications and candidates, but does not define enough candidate shapes or rule details for many of them:

- `SectionCapacitySpecification`
- `CurriculumSubjectAvailabilitySpecification`
- `TeacherWeeklyLoadSpecification`
- `TeachingPeriodTimeRangeSpecification`
- `HolidayDateRangeSpecification`
- `ExamSeasonWithinTermSpecification`
- `AssessmentPeriodWithinTermSpecification`
- `ScheduleTeacherConflictSpecification`
- `ScheduleSectionConflictSpecification`
- `ScheduleRoomConflictSpecification`

The Student Domain Standard requires specifications to be deterministic and real, not placeholders that pretend to validate.

## Existing Implementation State

Existing Academic domain folders:

- `domain/aggregates`: only `AcademicYear`
- `domain/entities`: only AcademicYear-related entities
- `domain/events`: only AcademicYear/AcademicTerm events
- `domain/repositories`: AcademicYear aggregate repository plus record-oriented contracts for Curriculum, CourseAssignment, AcademicCalendar
- No `domain/policies`
- No `domain/specifications`
- No `domain/services`

Existing application/API contracts expose CRUD-style DTOs for Curriculum, CourseAssignment, and AcademicCalendar. They do not expose the lifecycle/use-case commands required by the official architecture.

## Files Created/Modified

Created:

- `docs/ACADEMIC_AGGREGATE_COMPLETENESS_ITEM2_REPORT.md`

No production code, domain code, repository code, API code, tests, schema, or UI files were modified for Item 2 because the executable contract is incomplete.

## Aggregates Implemented

None in Item 2.

Reason: implementing `AcademicStructure`, `ClassSchedule`, `Curriculum`, `CourseAssignment`, or `AcademicCalendar` aggregates now would require inventing business rules, transition preconditions, policy thresholds, and persistence contracts not defined in the current architecture.

## Policies/Specifications Implemented

None in Item 2.

Reason: the architecture lists policy/specification names and purposes but does not define executable contracts or rule parameters.

## Domain Invariants

No new invariants were implemented.

The known high-level invariants from the architecture are documented above, but they are not executable enough to implement safely under the "do not invent business rules" constraint.

## Domain Events

No new events were implemented.

The official event names are known, but event payloads and mutation preconditions for most aggregate events are not specified.

## Persistence Verification

Not run for Item 2 implementation because no aggregate implementation was performed.

Item 1 runtime persistence remains separate and already verified.

## Test Results

No new domain tests were added because the missing aggregate contracts prevent meaningful tests without encoding guessed business rules.

No verification suites were re-run for Item 2 because no production code changed.

## Regressions

None introduced by Item 2. Only this report was added.

## Remaining Blockers

Before aggregate completeness can be implemented, the project needs an executable specification for:

1. Aggregate snapshots and boundaries for `AcademicStructure`, `Curriculum`, `CourseAssignment`, `AcademicCalendar`, and `ClassSchedule`.
2. Exact lifecycle transition matrices and preconditions for each aggregate.
3. Policy interfaces, inputs, outputs, and default rule parameters.
4. Specification candidate shapes and precise boolean rules.
5. Event payload contracts for every new domain event.
6. Repository contracts for aggregate persistence and reconstruction, including expected-version behavior.
7. Persistence schema/read-model strategy for the new aggregate-owned entities and versions.
8. Backward compatibility plan for existing CRUD REST contracts.

## Outcome

Item 2 is blocked by missing executable architecture specification. Work stopped before code changes, as requested.
