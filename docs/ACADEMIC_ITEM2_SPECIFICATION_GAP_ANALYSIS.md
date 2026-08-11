# Academic Item 2 Specification Gap Analysis

**Status:** READ-ONLY analysis only.  
**Scope:** Aggregate-completeness blocker specification readiness.  
**Documentation freeze honored:** no ADR, RFC, governance, production code, domain code, repository, API, UI, SQL/schema, or test changes.

## Sources Reviewed

- `docs/ACADEMIC_FINAL_ARCHITECTURE_AUDIT.md`
- `docs/ACADEMIC_AGGREGATE_COMPLETENESS_ITEM2_REPORT.md`
- `docs/domain/academic-domain-official-architecture.md`
- `docs/standards/student-domain-standard.md`
- Existing Academic domain implementation under `src/modules/academic/domain`
- Academic repositories and mappers under `src/modules/academic/infrastructure`
- Academic application services, commands, queries, DTOs, mappers, and use-cases
- Academic REST routes and controllers
- Existing Academic TODO/phase tracking files

## Classification Key

- **DEFINED**: explicitly supported by existing source documents or code.
- **DERIVABLE**: safely derived from the Student Domain Standard or existing AcademicYear implementation pattern.
- **UNDEFINED**: business specification required.
- **CONFLICTING**: existing sources disagree.

## Global Findings

- **DEFINED:** The official architecture identifies six aggregate roots: `AcademicYear`, `AcademicStructure`, `Curriculum`, `CourseAssignment`, `AcademicCalendar`, `ClassSchedule`.
- **DEFINED:** `AcademicYear` is implemented as a real aggregate. The other five are missing or record-oriented.
- **DEFINED:** Student Domain Standard requires aggregate-controlled mutation, private state, `rehydrate`, version, `lastModified`, domain events, invalid transition rejection, policies, specifications, and persistence-agnostic repositories.
- **DEFINED:** Existing APIs expose CRUD for Curriculum, CourseAssignment, AcademicCalendar only. There are no APIs/contracts for AcademicStructure or ClassSchedule.
- **UNDEFINED:** Executable business rules are missing for most non-AcademicYear lifecycle transitions, policy thresholds, event payloads, snapshots, and persistence contracts.

---

## A. AcademicStructure Matrix

| Field | Analysis |
| --- | --- |
| Aggregate name | **DEFINED:** `AcademicStructure`. |
| Aggregate root | **DEFINED:** `AcademicStructure` root for stage, grade, section structure in a school scope. |
| Child entities/value objects | **DEFINED:** owns `EducationStage`, `GradeLevel`, `Section`, `AcademicStructureVersion`; VOs include `EducationStageId`, `StageCode`, `GradeLevelId`, `GradeLevelCode`, `SectionId`, `SectionCode`, `Capacity`/`SectionCapacity`, `SchoolScopeId`, `VersionNumber`. |
| Creation contract | **UNDEFINED — business specification required.** Use cases name "Create education stage", "Create grade level", "Create section"; no aggregate factory input contract for creating the root itself. |
| Allowed states | **UNDEFINED — business specification required.** Architecture mentions archived stages/grades, but no full status enum for root, stage, grade, section, or version. |
| State transition matrix | **UNDEFINED — business specification required.** Publish/archive actions are named, but valid from/to states are absent. |
| Commands | **DEFINED:** create education stage, create grade level, create section, change section capacity, publish structure version, archive stage/grade/section. **UNDEFINED:** command fields and expected version fields. |
| Preconditions | **DEFINED:** section capacity cannot be negative; archived stages/grades cannot receive sections; stage order unique; grade order unique within stage; section code unique within grade/year scope. **UNDEFINED:** reference checks, publish readiness, archive restrictions when referenced by students/schedules. |
| Invariants | **DEFINED:** high-level uniqueness/order/capacity/archive invariants. **CONFLICTING:** official architecture says section capacity cannot be negative, existing `SectionCapacity` VO says capacity must be `>= 1`. |
| Domain events | **DEFINED:** `EducationStageCreated`, `EducationStageArchived`, `GradeLevelCreated`, `GradeLevelArchived`, `SectionCreated`, `SectionCapacityChanged`, `AcademicStructureVersionPublished`. |
| Event payload requirements | **DERIVABLE:** eventId, aggregate identifier, occurredAt, aggregateVersion from event standard. **UNDEFINED:** entity ids, old/new capacity, actor, reason, school scope, version payload fields. |
| Snapshot/rehydration requirements | **DERIVABLE:** aggregate needs snapshot + `rehydrate` from Student standard. **UNDEFINED:** exact snapshot shape and child collection ordering. |
| Repository persistence contract | **DEFINED:** `IAcademicStructureRepository` must load/save aggregate and support optimistic concurrency when mutable. **UNDEFINED:** interface does not exist in current code; methods, expectedVersion signature, read methods, and persistence schema are absent. |
| Delete/archive behavior | **DEFINED:** archive stage, grade level, or section is a use case. **UNDEFINED:** hard delete vs soft archive, cascade rules, referenced-section behavior. |
| Concurrency requirements | **DEFINED:** aggregate repositories must support expectedVersion for mutable roots; offline commands include expected versions. **UNDEFINED:** exact version field semantics and conflict error behavior. |
| Cross-aggregate dependencies | **DEFINED:** Student enrollment references grade/section; schedules reference sections; every aggregate school-scoped. **UNDEFINED:** how to verify active academic year/year scope and external references. |
| Required policies | **DEFINED:** `SectionCapacityPolicy`, `MultiSchoolScopePolicy`; possibly structure service. **UNDEFINED:** policy method signatures and rule parameters. |
| Required specifications | **DEFINED:** `SectionCapacitySpecification`. **UNDEFINED:** candidate shape and whether it follows non-negative or `>= 1`. |
| Explicitly defined | Names, ownership, high-level responsibilities, high-level invariants, event names, use cases. |
| Not defined | Root creation, statuses, transitions, command payloads, policy contracts, event payloads, snapshot, persistence schema, archive constraints. |
| Can implementation safely begin? | **No.** Only skeleton contracts could be created; real aggregate behavior would require guesses. |

---

## B. ClassSchedule Matrix

| Field | Analysis |
| --- | --- |
| Aggregate name | **DEFINED:** `ClassSchedule`. |
| Aggregate root | **DEFINED:** timetable version root. |
| Child entities/value objects | **DEFINED:** owns `ScheduleSlot`, `ScheduleVersion`, `TeachingLoadSnapshot`; VOs include `ScheduleId`, `ScheduleSlotId`, `TeachingPeriodId`, `RoomId`, `CourseAssignmentId`, `SectionId`, `DateRange`, `TimeRange`, `VersionNumber`. |
| Creation contract | **DEFINED:** "Draft class schedule" use case. **UNDEFINED:** required fields, section/date range/school scope requirements, initial version behavior. |
| Allowed states | **DEFINED:** schedule version states `draft`, `validated`, `published`, `active`, `retired`. |
| State transition matrix | **UNDEFINED — business specification required.** State names exist, but valid transitions are not listed. |
| Commands | **DEFINED:** draft schedule, assign schedule slot, validate schedule conflicts, publish schedule, activate schedule, retire schedule version. **UNDEFINED:** command DTO fields and expectedVersion. |
| Preconditions | **DEFINED:** slot must reference active course assignment; teacher/section cannot be double-booked; only one active schedule version for section/date range. **UNDEFINED:** whether conflicts block drafts, validation, or publication; room scheduling enabled flag; active assignment verification source. |
| Invariants | **DEFINED:** no teacher double booking, no section double booking, active assignment reference, published version immutable except superseding version, one active version per section/date range. **UNDEFINED:** exact conflict keys and date/period granularity. |
| Domain events | **DEFINED:** `ClassScheduleDrafted`, `ClassScheduleValidated`, `ClassSchedulePublished`, `ClassScheduleActivated`, `ClassScheduleRetired`, `ScheduleSlotAssigned`, `ScheduleConflictDetected`. |
| Event payload requirements | **DERIVABLE:** eventId, aggregate id, occurredAt, aggregateVersion. **UNDEFINED:** slot ids, conflict details, old/new version ids, section/date range, actor/reason. |
| Snapshot/rehydration requirements | **DERIVABLE:** snapshot + `rehydrate` required. **UNDEFINED:** snapshot shape, version history, slot ordering, load snapshot shape. |
| Repository persistence contract | **DEFINED:** `IClassScheduleRepository` must load/save aggregate, support expectedVersion. **UNDEFINED:** interface absent in code; schema absent; read models absent. |
| Delete/archive behavior | **DEFINED:** retire schedule version. **UNDEFINED:** delete semantics, whether published/active versions can be removed, supersession behavior. |
| Concurrency requirements | **DEFINED:** expectedVersion/offline conflict detection. **UNDEFINED:** conflict resolution and version persistence. |
| Cross-aggregate dependencies | **DEFINED:** depends on active CourseAssignment, AcademicCalendar/TeachingPeriod, Section, Teacher, Room optionality. **UNDEFINED:** exact dependency loading and validation boundary. |
| Required policies | **DEFINED:** `ScheduleConflictPolicy`, `SchedulePublicationPolicy`, `TeacherLoadPolicy`, `MultiSchoolScopePolicy`. **UNDEFINED:** method signatures and thresholds. |
| Required specifications | **DEFINED:** `ScheduleTeacherConflictSpecification`, `ScheduleSectionConflictSpecification`, `ScheduleRoomConflictSpecification`. **UNDEFINED:** candidate shape and conflict matching rules. |
| Explicitly defined | Root name, child entities, state names, high-level conflict invariants, event names, use cases. |
| Not defined | Transition matrix, conflict algorithm, publication prerequisites, active-version enforcement mechanics, repository/schema contracts. |
| Can implementation safely begin? | **No.** Conflict and lifecycle behavior are central and undefined. |

---

## C. Curriculum Matrix

| Field | Analysis |
| --- | --- |
| Aggregate name | **DEFINED:** `Curriculum`. |
| Aggregate root | **DEFINED:** root for curriculum plans and subjects. Current code has only `CurriculumRecord`. |
| Child entities/value objects | **DEFINED:** owns `Subject`, `CurriculumSubject`, `CurriculumVersion`; VOs include `CurriculumId`, `CurriculumCode`, `SubjectId`, `SubjectCode`, `SubjectName`, `CreditHours`, `GradeLevelId`, `SchoolScopeId`, `VersionNumber`. |
| Creation contract | **PARTLY DEFINED:** existing `SaveCurriculumCommand` has `id`, `code`, `nameAr`, optional `nameEn`, `description`, `educationStageId`, `gradeLevelId`, `isActive`, `displayOrder`. **UNDEFINED:** aggregate factory contract, schoolScopeId, status, version, subject collection. |
| Allowed states | **DEFINED:** `draft`, `approved`, `active`, `retired`. |
| State transition matrix | **PARTLY DEFINED:** "version must be approved before activation" implies approved -> active. **UNDEFINED:** create -> draft, draft -> approved, active -> retired, invalid transitions, terminal behavior. |
| Commands | **DEFINED:** create curriculum, create subject, assign subject to grade level, approve curriculum, activate curriculum, retire curriculum. Existing API only supports save/list/get/delete. |
| Preconditions | **DEFINED:** code unique per school scope; subject code unique within curriculum; approved before activation; subject cannot be removed from active curriculum when referenced by active assignments or assessments. **UNDEFINED:** approval requirements, subject removal reference checks, subject type rules. |
| Invariants | **DEFINED:** high-level invariants above. **UNDEFINED:** required fields, min subjects, version approval criteria, duplicate subject-grade behavior. |
| Domain events | **DEFINED:** `CurriculumCreated`, `CurriculumApproved`, `CurriculumActivated`, `CurriculumRetired`, `SubjectCreated`, `SubjectAssignedToGradeLevel`, `SubjectRemovedFromGradeLevel`. |
| Event payload requirements | **DERIVABLE:** eventId, aggregate id, occurredAt, aggregateVersion. **UNDEFINED:** subject ids, grade ids, version ids, actor/reason fields. |
| Snapshot/rehydration requirements | **DERIVABLE:** snapshot + `rehydrate` required. **UNDEFINED:** exact snapshot shape; whether current `subjects_master` rows are aggregate root rows, subject rows, or read models. |
| Repository persistence contract | **CONFLICTING:** official architecture says `ICurriculumRepository` load/save `Curriculum` aggregate with expectedVersion; current code returns `CurriculumRecord` and maps to `subjects_master`. |
| Delete/archive behavior | **CONFLICTING:** official lifecycle says retire; current API/repository exposes delete. **UNDEFINED:** whether delete remains for drafts only or must be replaced by retire. |
| Concurrency requirements | **DEFINED:** expectedVersion for mutable roots. **UNDEFINED:** current repo has no expectedVersion and schema has no version column. |
| Cross-aggregate dependencies | **DEFINED:** CourseAssignment/Assessment may reference subjects; Certificate references Curriculum/Subject. **UNDEFINED:** reference lookup contracts. |
| Required policies | **DEFINED:** `CurriculumApprovalPolicy`, `SubjectEligibilityPolicy`, `MultiSchoolScopePolicy`. **UNDEFINED:** executable rules. |
| Required specifications | **DEFINED:** `CurriculumSubjectAvailabilitySpecification`. **UNDEFINED:** candidate shape and active/retired behavior. |
| Explicitly defined | Root/children, state names, use cases, event names, several high-level invariants. |
| Not defined | Full transition matrix, approval rules, subject categories, version model, event payloads, aggregate persistence schema, delete-vs-retire compatibility. |
| Can implementation safely begin? | **No.** Current contracts conflict with aggregate contract and key lifecycle rules are undefined. |

---

## D. CourseAssignment Matrix

| Field | Analysis |
| --- | --- |
| Aggregate name | **DEFINED:** `CourseAssignment`. |
| Aggregate root | **DEFINED:** root for assigning a teacher to a subject/section during an academic term. Current code has only `CourseAssignmentRecord`. |
| Child entities/value objects | **DEFINED:** owns `CourseAssignmentLine`, `CourseAssignmentStatusHistory`; VOs include `CourseAssignmentId`, `TeacherId`, `SubjectId`, `GradeLevelId`, `SectionId`, `AcademicYearId`, `AcademicTermId`, `TeachingLoad`, `WeeklyPeriodCount`, `CreditHours`, `SchoolScopeId`. |
| Creation contract | **PARTLY DEFINED:** existing `SaveCourseAssignmentCommand` has optional `curriculumId`, `subjectId`, `gradeLevelId`, `teacherId`, `creditHours`, `weeklyPeriods`, `isActive`. **UNDEFINED:** required `sectionId`, `academicYearId`, `academicTermId`, schoolScopeId, line structure, initial status. |
| Allowed states | **DEFINED:** `draft`, `active`, `suspended`, `replaced`, `closed`. |
| State transition matrix | **UNDEFINED — business specification required.** State names exist only. |
| Commands | **DEFINED:** create, activate, replace teacher, suspend, close, calculate teaching load, validate teacher load. Existing API only supports save/list/get/delete. |
| Preconditions | **DEFINED:** assignment references active year/term, active section, subject available to grade, teacher load policy not exceeded, closed assignment cannot be scheduled. **UNDEFINED:** how to verify active references and eligibility; load thresholds; suspension/replacement/close prerequisites. |
| Invariants | **DEFINED:** high-level invariants above. **UNDEFINED:** required field cardinality, multiple lines allowed, same teacher/subject/section duplication rules. |
| Domain events | **DEFINED:** `CourseAssignmentCreated`, `CourseAssignmentActivated`, `CourseAssignmentSuspended`, `CourseAssignmentTeacherReplaced`, `CourseAssignmentClosed`, `TeachingLoadCalculated`, `TeachingLoadExceeded`. |
| Event payload requirements | **DERIVABLE:** eventId, aggregate id, occurredAt, aggregateVersion. **UNDEFINED:** old/new teacher ids, load values, line ids, reason, term/year/section fields. |
| Snapshot/rehydration requirements | **DERIVABLE:** snapshot + `rehydrate` required. **UNDEFINED:** aggregate snapshot shape and status history shape. |
| Repository persistence contract | **CONFLICTING:** official architecture requires aggregate repository; current `ICourseAssignmentRepository` saves/loads `CourseAssignmentRecord` against `subjects` rows. |
| Delete/archive behavior | **CONFLICTING:** official lifecycle says suspend/replace/close; current API has delete. **UNDEFINED:** delete allowed only for draft or not at all. |
| Concurrency requirements | **DEFINED:** expectedVersion required for mutable roots. **UNDEFINED:** current repository lacks it. |
| Cross-aggregate dependencies | **DEFINED:** depends on AcademicYear, AcademicTerm, AcademicStructure section, Curriculum subject, Teacher identity. **UNDEFINED:** validation orchestration and read repository contracts. |
| Required policies | **DEFINED:** `TeacherLoadPolicy`, `TeacherAssignmentPolicy`, `SubjectEligibilityPolicy`, `MultiSchoolScopePolicy`. **UNDEFINED:** thresholds, method signatures, return models. |
| Required specifications | **DEFINED:** `TeacherWeeklyLoadSpecification`, `CurriculumSubjectAvailabilitySpecification`. **UNDEFINED:** candidate shapes and limit values. |
| Explicitly defined | Root, child entity names, state names, use cases, high-level invariants, event names. |
| Not defined | Required creation fields, transition matrix, load/eligibility rules, replacement semantics, persistence schema, delete behavior. |
| Can implementation safely begin? | **No.** Teacher load and eligibility are core and undefined. |

---

## E. AcademicCalendar Matrix

| Field | Analysis |
| --- | --- |
| Aggregate name | **DEFINED:** `AcademicCalendar`. |
| Aggregate root | **DEFINED:** root for official school dates and time structure. Current code has only `AcademicCalendarRecord` for school days. |
| Child entities/value objects | **DEFINED:** owns `SchoolDay`, `Holiday`, `ExamSeason`, `AssessmentPeriod`, `TeachingPeriod`, `CalendarVersion`; VOs include `SchoolDayId`, `HolidayId`, `ExamSeasonId`, `AssessmentPeriodId`, `TeachingPeriodId`, `AcademicCalendarDate`, `AcademicWeek`, `DateRange`, `TimeRange`, `AcademicYearId`, `AcademicTermId`, `SchoolScopeId`, `VersionNumber`. |
| Creation contract | **PARTLY DEFINED:** existing `SaveAcademicCalendarCommand` saves one day with `id`, `date`, `isInstructional`, `academicWeek`. **UNDEFINED:** aggregate root creation fields, academicYearId, schoolScopeId, version, collections. |
| Allowed states | **UNDEFINED — business specification required.** Architecture names published calendar versions but no calendar status enum. |
| State transition matrix | **UNDEFINED — business specification required.** Publish use case exists; no from/to states. |
| Commands | **DEFINED:** create academic calendar, define school day, define holiday, define teaching period, define exam season, define assessment period, publish academic calendar. Existing API only supports school-day CRUD. |
| Preconditions | **DEFINED:** dates inside year boundaries; holidays cannot be instructional unless makeup days; teaching periods cannot overlap in same template; exam seasons cannot overlap unless policy allows separate tracks; assessment periods belong to term or approved exam season. **UNDEFINED:** makeup marker, overlap policy, template scope, approved exam season definition. |
| Invariants | **DEFINED:** high-level invariants above. **UNDEFINED:** exact boundary checks and exception paths. |
| Domain events | **DEFINED:** `AcademicCalendarCreated`, `AcademicCalendarPublished`, `SchoolDayCreated`, `SchoolDayChanged`, `HolidayCreated`, `HolidayCancelled`, `TeachingPeriodCreated`, `ExamSeasonCreated`, `AssessmentPeriodCreated`. |
| Event payload requirements | **DERIVABLE:** eventId, aggregate id, occurredAt, aggregateVersion. **UNDEFINED:** day/holiday/period/season ids, date ranges, old/new fields, actor/reason. |
| Snapshot/rehydration requirements | **DERIVABLE:** snapshot + `rehydrate` required. **UNDEFINED:** snapshot shape and mapping from `academic_calendar_days` to aggregate-owned school days only. |
| Repository persistence contract | **CONFLICTING:** official architecture requires aggregate repository; current `IAcademicCalendarRepository` saves school-day records only. |
| Delete/archive behavior | **PARTLY DEFINED:** current CRUD has delete; architecture has holiday cancellation and published version immutability guidance. **UNDEFINED:** delete rules for published calendars/days/periods/seasons. |
| Concurrency requirements | **DEFINED:** expectedVersion and published schedule/calendar versions should be immutable for sync. **UNDEFINED:** version persistence and immutability enforcement. |
| Cross-aggregate dependencies | **DEFINED:** depends on AcademicYear/Term; Attendance references school days/periods; Assessment references exam/assessment periods. **UNDEFINED:** how to validate references. |
| Required policies | **DEFINED:** `CalendarPublicationPolicy`, `HolidayPolicy`, `ExamSeasonPolicy`, `AssessmentPeriodPolicy`, `MultiSchoolScopePolicy`. **UNDEFINED:** executable rules and policy configuration. |
| Required specifications | **DEFINED:** `TeachingPeriodTimeRangeSpecification`, `HolidayDateRangeSpecification`, `ExamSeasonWithinTermSpecification`, `AssessmentPeriodWithinTermSpecification`. **UNDEFINED:** candidate shapes and exception logic. |
| Explicitly defined | Root/children, use cases, high-level invariants, event names, current school-day persistence subset. |
| Not defined | Calendar status, transition matrix, version model, publish requirements, holiday makeup semantics, overlap policies, aggregate persistence. |
| Can implementation safely begin? | **No.** A narrow school-day CRUD subset exists, but aggregate completeness is not specified. |

---

## F. Policies Gap Matrix

| Policy | Status | Gap |
| --- | --- | --- |
| `AcademicYearActivationPolicy` | **PARTLY DEFINED/DERIVABLE** | Existing `AcademicYear.activate()` requires approved status and at least one term. Architecture also requires only one active year per scope, but repository/service check is absent. |
| `TermBoundaryPolicy` | **DEFINED/DERIVABLE** | Existing aggregate enforces term inside year; interface absent. |
| `SectionCapacityPolicy` | **CONFLICTING** | Official capacity says non-negative; existing `SectionCapacity` VO requires `>= 1`. Business decision required. |
| `CurriculumApprovalPolicy` | **UNDEFINED — business specification required.** | No approval criteria beyond "approved before activation". |
| `SubjectEligibilityPolicy` | **UNDEFINED — business specification required.** | No rules for subject availability to grade/curriculum beyond name. |
| `TeacherLoadPolicy` | **UNDEFINED — business specification required.** | No min/max thresholds or variance by term/stage/teacher. |
| `TeacherAssignmentPolicy` | **UNDEFINED — business specification required.** | No teacher qualification/eligibility data or rules. |
| `CalendarPublicationPolicy` | **UNDEFINED — business specification required.** | No publish readiness criteria. |
| `HolidayPolicy` | **UNDEFINED — business specification required.** | No makeup-day semantics. |
| `ExamSeasonPolicy` | **UNDEFINED — business specification required.** | No overlap/separate-track rules. |
| `AssessmentPeriodPolicy` | **UNDEFINED — business specification required.** | No timing constraints beyond term/season relationship. |
| `ScheduleConflictPolicy` | **PARTLY DEFINED** | Teacher/section/room conflict categories defined; exact algorithm/scope undefined. |
| `SchedulePublicationPolicy` | **UNDEFINED — business specification required.** | No prerequisites for publish. |
| `MultiSchoolScopePolicy` | **DEFINED conceptually; UNDEFINED executable.** | Prevent cross-school mutation unless allowed; no method contract or allowance source. |

---

## G. Specifications Gap Matrix

| Specification | Status | Gap |
| --- | --- | --- |
| `AcademicYearDateRangeSpecification` | **DEFINED/DERIVABLE** | Existing `DateRange` enforces start before end; separate spec absent. |
| `AcademicTermWithinYearSpecification` | **DEFINED/DERIVABLE** | Existing `AcademicYear.addTerm` enforces containment; separate spec absent. |
| `NonOverlappingTermsSpecification` | **DEFINED/DERIVABLE** | Existing `AcademicYear` enforces non-overlap; separate spec absent. |
| `ActiveYearUniquenessSpecification` | **DEFINED high-level; UNDEFINED executable.** | Requires repository/read model query and conflict behavior. |
| `SectionCapacitySpecification` | **CONFLICTING** | Non-negative vs `>= 1`. |
| `CurriculumSubjectAvailabilitySpecification` | **UNDEFINED — business specification required.** | Candidate shape and availability source undefined. |
| `TeacherWeeklyLoadSpecification` | **UNDEFINED — business specification required.** | Load limits undefined. |
| `TeachingPeriodTimeRangeSpecification` | **DEFINED/DERIVABLE** | Existing `TimeRange` validates start before end; overlap scope undefined. |
| `HolidayDateRangeSpecification` | **UNDEFINED — business specification required.** | Holiday date candidate shape and boundary rules undefined. |
| `ExamSeasonWithinTermSpecification` | **UNDEFINED — business specification required.** | Term/season linkage and approved season semantics undefined. |
| `AssessmentPeriodWithinTermSpecification` | **UNDEFINED — business specification required.** | Term boundary and exam-season exception rules undefined. |
| `ScheduleTeacherConflictSpecification` | **PARTLY DEFINED; UNDEFINED executable.** | No double-booking is defined; matching key/date/period/version scope undefined. |
| `ScheduleSectionConflictSpecification` | **PARTLY DEFINED; UNDEFINED executable.** | Same gap as teacher conflict. |
| `ScheduleRoomConflictSpecification` | **PARTLY DEFINED; UNDEFINED executable.** | Room scheduling is optional; enabled/disabled rule undefined. |

---

## Existing Contract Conflicts

| Area | Conflict |
| --- | --- |
| Curriculum repository | Official architecture requires `ICurriculumRepository` to load/save `Curriculum` aggregate; current code persists `CurriculumRecord`. |
| CourseAssignment repository | Official architecture requires aggregate persistence; current code persists `CourseAssignmentRecord` mapped to `subjects`. |
| AcademicCalendar repository | Official architecture requires aggregate persistence; current code persists school-day records only. |
| Delete vs lifecycle | Current REST/repository contracts expose delete for Curriculum/CourseAssignment/Calendar; official architecture emphasizes retire/suspend/close/cancel/publish lifecycle. |
| Section capacity | Official architecture says capacity cannot be negative; existing `SectionCapacity` VO requires at least 1. |
| Optimistic concurrency | Official architecture mandates expectedVersion for mutable roots; current non-Year repos have no version contract. AcademicYear also reconstructs version as 0 in current mapper. |

## Implementation-Readiness Matrix

| Component | Specification Ready? | Missing Decisions |
| --- | --- | --- |
| AcademicStructure | No | Root creation, statuses, transitions, archive rules, section capacity rule conflict, snapshot/schema/repository contract. |
| ClassSchedule | No | Transition matrix, conflict algorithm, publish/activate prerequisites, slot/version schema, active-version enforcement. |
| Curriculum | No | Approval rules, activation/retirement transitions, subject category rules, version model, delete-vs-retire behavior, aggregate persistence contract. |
| CourseAssignment | No | Required references, transition matrix, teacher load thresholds, eligibility rules, replacement semantics, delete-vs-close behavior. |
| AcademicCalendar | No | Calendar status/version model, publish criteria, makeup holidays, exam/assessment overlap rules, aggregate persistence contract. |
| Policies | No | Interfaces, inputs, outputs, thresholds/configuration, default decisions. |
| Specifications | No | Candidate shapes and precise boolean rules for most non-Year specifications. |

## Minimum Business Decisions Required To Unblock Item 2

1. Decide whether Item 2 should implement skeleton fail-fast aggregate contracts only, or full executable aggregate behavior.
2. Define aggregate snapshots for `AcademicStructure`, `Curriculum`, `CourseAssignment`, `AcademicCalendar`, and `ClassSchedule`.
3. Define exact lifecycle transition matrices for Curriculum, CourseAssignment, AcademicCalendar, ClassSchedule, plus stage/grade/section/version statuses for AcademicStructure.
4. Resolve section capacity conflict: non-negative vs `>= 1`.
5. Define policy interfaces and rule parameters for curriculum approval, subject eligibility, teacher load, teacher assignment, calendar publication, holiday makeup days, exam season overlaps, assessment periods, schedule conflicts, schedule publication, and multi-school scope.
6. Define event payload contracts for every new domain event.
7. Decide delete/archive/retire behavior and backward compatibility for existing REST delete endpoints.
8. Define repository contracts with `expectedVersion` and decide schema/read-model strategy for aggregate-owned entities and versions.
9. Define cross-aggregate validation boundaries: which services/repositories confirm active year/term/section/subject/course assignment.
10. Define conflict error semantics for offline-first expected-version conflicts and scheduling conflicts.

## Final Conclusion

Item 2 is **not implementation-ready**.

The current sources provide an architecture map, naming, aggregate boundaries, state names for some components, high-level invariants, and event names. They do not provide enough executable business specification to implement aggregate completeness safely without inventing rules. Any implementation beyond fail-fast skeletons would convert **UNDEFINED** requirements into assumptions, which is explicitly disallowed.

## Remaining Blockers

- Missing executable lifecycle specs for five aggregates.
- Missing policy contracts and rule thresholds.
- Missing specification candidate shapes and deterministic rules.
- Conflicting section capacity rule.
- Conflicting record-oriented repository contracts vs aggregate repository architecture.
- Missing aggregate persistence schema/snapshot strategy.
- Missing event payload contracts.
- Existing REST CRUD contracts do not cover required lifecycle/use-case commands for the missing aggregates.

*End of read-only specification gap analysis.*
