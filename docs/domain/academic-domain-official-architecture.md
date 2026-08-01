# Academic Domain Official Architecture

**Phase:** 3.0 - Academic Domain Architecture  
**Status:** Official architecture document, implementation-neutral  
**Scope:** Academic bounded context for the ERP platform  
**Reference standard:** `docs/standards/student-domain-standard.md`  
**Rule:** Architecture only. No implementation, SQL, UI, controllers, or infrastructure behavior.

## 1. Domain Purpose

The Academic Domain is the source of truth for school academic structure, calendar structure, curriculum delivery, teaching allocations, and class scheduling.

It answers these business questions:

- Which academic years and terms exist?
- Which education stages, grade levels, and sections are active?
- Which subjects belong to each curriculum and grade level?
- Which teachers are assigned to teach which subjects, sections, and periods?
- Which school days, holidays, exam seasons, and assessment periods are official?
- Which schedule version is authoritative for attendance, assessments, certificates, and student placement?

The Academic Domain does not own student identity, teacher identity, attendance marks, assessment marks, or issued certificates. It provides the academic structure those domains reference.

## 2. Architectural Standard Compliance

The Academic Domain must follow the Student Domain standard:

```text
src/modules/academic/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── dto/
│   ├── mappers/
│   └── services/
├── domain/
│   ├── aggregates/
│   ├── entities/
│   ├── events/
│   ├── exceptions/
│   ├── policies/
│   ├── repositories/
│   ├── services/
│   ├── specifications/
│   └── value-objects/
├── infrastructure/
│   ├── mappers/
│   ├── projections/
│   └── repositories/
├── presentation/
│   ├── components/
│   └── hooks/
└── tests/
    ├── application/
    ├── domain/
    ├── infrastructure/
    └── presentation/
```

Dependency direction:

```text
presentation -> application -> domain
infrastructure -> domain
```

## 3. Bounded Context

### Owns

- Academic year lifecycle.
- Academic term lifecycle.
- Education stage and grade level structure.
- Sections and capacity rules.
- Curriculum and subject catalog structure.
- Course assignments.
- Academic calendar.
- School days and holidays.
- Teaching periods.
- Teaching load allocation.
- Class schedule versions.
- Exam seasons and assessment periods.

### References

- Student Domain: student enrollment and placement references.
- Teacher Domain: teacher identity and availability references.
- Attendance Domain: official school days and class periods.
- Assessment Domain: assessment periods, exam seasons, subject offerings.
- Certificate Domain: academic year, term, grade level, curriculum, and completion structure.

### Does Not Own

- Student personal profile or lifecycle.
- Teacher employment profile or HR lifecycle.
- Attendance records.
- Assessment marks or grading records.
- Certificate issuance records.
- Financial fees.
- User accounts or permissions.

## 4. Source Of Truth

| Concept | Source Of Truth |
|---|---|
| Academic year | Academic Domain |
| Academic term | Academic Domain |
| Education stage | Academic Domain |
| Grade level | Academic Domain |
| Section | Academic Domain |
| Curriculum | Academic Domain |
| Subject | Academic Domain |
| Course assignment | Academic Domain |
| Academic calendar | Academic Domain |
| School day | Academic Domain |
| Holiday | Academic Domain |
| Teaching period | Academic Domain |
| Teaching load | Academic Domain |
| Class schedule | Academic Domain |
| Exam season | Academic Domain |
| Assessment period | Academic Domain |
| Student identity | Student Domain |
| Student enrollment decision | Student Domain references Academic structure |
| Teacher identity | Teacher Domain |
| Attendance marks | Attendance Domain |
| Assessment marks | Assessment Domain |
| Certificates | Certificate Domain |

## 5. Aggregate Roots

### 5.1 AcademicYear

The `AcademicYear` aggregate is the lifecycle root for one official school year.

Owns:

- `AcademicTerm`
- `AcademicYearStatusHistory`

Responsibilities:

- Create planned academic years.
- Approve, activate, close, and archive academic years.
- Ensure date boundaries are valid.
- Ensure terms belong within the year date range.
- Ensure only one year is active per school scope.
- Publish lifecycle events.

Key invariants:

- An academic year must have a unique code per school scope.
- Start date must be before end date.
- Terms cannot overlap.
- Terms must be inside the academic year range.
- A closed year cannot be modified except for archival metadata.

### 5.2 AcademicStructure

The `AcademicStructure` aggregate is the root for stage, grade, and section structure for a school scope.

Owns:

- `EducationStage`
- `GradeLevel`
- `Section`
- `AcademicStructureVersion`

Responsibilities:

- Define stages.
- Define grade levels inside stages.
- Define sections inside grade levels.
- Enforce capacity and ordering rules.
- Publish structure change events.

Key invariants:

- Stage order must be unique.
- Grade level order must be unique within a stage.
- Section code must be unique within grade level and academic year scope.
- Section capacity cannot be negative.
- Archived stages or grade levels cannot receive new sections.

### 5.3 Curriculum

The `Curriculum` aggregate is the root for curriculum plans and their subjects.

Owns:

- `Subject`
- `CurriculumSubject`
- `CurriculumVersion`

Responsibilities:

- Define official curriculum versions.
- Define subjects.
- Assign subjects to grade levels.
- Mark subjects as core, elective, optional, or ministry-required.
- Publish curriculum events.

Key invariants:

- Curriculum code must be unique per school scope.
- Subject code must be unique within curriculum scope.
- A subject cannot be removed from an active curriculum when it is referenced by active assignments or assessments.
- A curriculum version must be approved before activation.

### 5.4 CourseAssignment

The `CourseAssignment` aggregate is the root for assigning a teacher to teach a subject for a section during an academic term.

Owns:

- `CourseAssignmentLine`
- `CourseAssignmentStatusHistory`

Responsibilities:

- Assign teacher, subject, grade, section, year, and term.
- Enforce teacher load policy.
- Enforce subject eligibility policy.
- Suspend, replace, or close assignments.
- Publish assignment events.

Key invariants:

- Assignment must reference an active academic year and term.
- Assignment must reference an active section.
- Assignment must reference a subject available to the grade level.
- Assignment cannot exceed teaching load policy.
- A closed assignment cannot be scheduled.

### 5.5 AcademicCalendar

The `AcademicCalendar` aggregate is the root for official school dates and time structure.

Owns:

- `SchoolDay`
- `Holiday`
- `ExamSeason`
- `AssessmentPeriod`
- `TeachingPeriod`
- `CalendarVersion`

Responsibilities:

- Define official school days.
- Define holidays and non-instructional days.
- Define teaching periods.
- Define exam seasons and assessment periods.
- Publish calendar events.

Key invariants:

- Calendar dates must be inside academic year boundaries.
- Holidays cannot be instructional days unless explicitly marked as makeup days.
- Teaching periods cannot overlap within the same school day template.
- Exam seasons cannot overlap unless policy allows separate tracks.
- Assessment periods must belong to a term or approved exam season.

### 5.6 ClassSchedule

The `ClassSchedule` aggregate is the root for timetable versions.

Owns:

- `ScheduleSlot`
- `ScheduleVersion`
- `TeachingLoadSnapshot`

Responsibilities:

- Build section timetables.
- Assign course assignments to teaching periods.
- Validate teacher, section, room, and subject conflicts.
- Publish schedule versions.
- Activate and retire schedule versions.

Key invariants:

- A teacher cannot be scheduled in two places at the same time.
- A section cannot have two active lessons at the same time.
- A schedule slot must reference an active course assignment.
- A published schedule version is immutable except through superseding version.
- Only one schedule version can be active for a section and date range.

## 6. Entities

| Entity | Aggregate | Identity | Responsibility |
|---|---|---|---|
| `AcademicTerm` | `AcademicYear` | `AcademicTermId` | Term date range and lifecycle |
| `AcademicYearStatusHistory` | `AcademicYear` | `StatusHistoryId` | Append-only year status changes |
| `EducationStage` | `AcademicStructure` | `EducationStageId` | Stage definition such as Primary or Secondary |
| `GradeLevel` | `AcademicStructure` | `GradeLevelId` | Grade ordering and stage membership |
| `Section` | `AcademicStructure` | `SectionId` | Section code, capacity, grade membership |
| `AcademicStructureVersion` | `AcademicStructure` | `StructureVersionId` | Versioned structure changes |
| `Subject` | `Curriculum` | `SubjectId` | Subject catalog item |
| `CurriculumSubject` | `Curriculum` | `CurriculumSubjectId` | Subject availability by grade/curriculum |
| `CurriculumVersion` | `Curriculum` | `CurriculumVersionId` | Approved curriculum version |
| `CourseAssignmentLine` | `CourseAssignment` | `CourseAssignmentLineId` | Teacher-subject-section allocation detail |
| `CourseAssignmentStatusHistory` | `CourseAssignment` | `StatusHistoryId` | Assignment lifecycle history |
| `SchoolDay` | `AcademicCalendar` | `SchoolDayId` | Official instructional or non-instructional date |
| `Holiday` | `AcademicCalendar` | `HolidayId` | Holiday or closure definition |
| `TeachingPeriod` | `AcademicCalendar` | `TeachingPeriodId` | Period label and time range |
| `ExamSeason` | `AcademicCalendar` | `ExamSeasonId` | Exam season window |
| `AssessmentPeriod` | `AcademicCalendar` | `AssessmentPeriodId` | Assessment collection window |
| `CalendarVersion` | `AcademicCalendar` | `CalendarVersionId` | Approved calendar version |
| `ScheduleSlot` | `ClassSchedule` | `ScheduleSlotId` | Section, period, assignment, room reference |
| `ScheduleVersion` | `ClassSchedule` | `ScheduleVersionId` | Draft/published/active timetable version |
| `TeachingLoadSnapshot` | `ClassSchedule` | `TeachingLoadSnapshotId` | Load totals at publish time |

## 7. Value Objects

| Value Object | Purpose | Core Rules |
|---|---|---|
| `AcademicYearId` | Year identity | Required, immutable |
| `AcademicYearCode` | School-facing year code | Unique per school scope, normalized |
| `AcademicTermId` | Term identity | Required, immutable |
| `AcademicTermCode` | Term code | Unique within academic year |
| `DateRange` | Start/end dates | Start before end |
| `EducationStageId` | Stage identity | Required, immutable |
| `StageCode` | Stage code | Normalized, unique per school scope |
| `GradeLevelId` | Grade identity | Required, immutable |
| `GradeLevelCode` | Grade code | Unique within stage |
| `SectionId` | Section identity | Required, immutable |
| `SectionCode` | Section code | Unique within grade/year |
| `Capacity` | Student capacity | Non-negative integer |
| `CurriculumId` | Curriculum identity | Required, immutable |
| `CurriculumCode` | Curriculum code | Unique per school scope |
| `SubjectId` | Subject identity | Required, immutable |
| `SubjectCode` | Subject code | Unique within curriculum |
| `SubjectName` | Official subject name | Required, normalized |
| `CreditHours` | Subject/course weighting | Non-negative decimal |
| `WeeklyPeriodCount` | Required weekly periods | Non-negative integer |
| `CourseAssignmentId` | Assignment identity | Required, immutable |
| `TeacherId` | Teacher context reference | Required where assignment needs teacher |
| `SchoolDayId` | School day identity | Required, immutable |
| `HolidayId` | Holiday identity | Required, immutable |
| `TeachingPeriodId` | Period identity | Required, immutable |
| `PeriodCode` | Period code | Unique within calendar template |
| `TimeRange` | Start/end times | Start before end, no overlap by policy |
| `ScheduleId` | Schedule identity | Required, immutable |
| `ScheduleSlotId` | Slot identity | Required, immutable |
| `RoomId` | Room reference | Optional until room scheduling is enabled |
| `ExamSeasonId` | Exam season identity | Required, immutable |
| `AssessmentPeriodId` | Assessment period identity | Required, immutable |
| `SchoolScopeId` | Future school/branch scope | Required for multi-school readiness |
| `MinistryReferenceCode` | External ministry identifier | Optional, normalized |
| `VersionNumber` | Version tracking | Positive integer |
| `StatusReason` | Lifecycle reason | Required for administrative transitions |

All value objects must validate, normalize, serialize, compare equality, and remain immutable.

## 8. State Machines

### 8.1 AcademicYearStatus

| State | Meaning | Terminal |
|---|---|---|
| `draft` | Year is being prepared | No |
| `approved` | Year is approved for use | No |
| `active` | Year is current operational year | No |
| `closed` | Year is completed | No |
| `archived` | Year is historical and immutable | Yes |

Valid transitions:

| From | To | Trigger |
|---|---|---|
| None | `draft` | Create academic year |
| `draft` | `approved` | Approve academic year |
| `approved` | `active` | Activate academic year |
| `active` | `closed` | Close academic year |
| `closed` | `archived` | Archive academic year |

### 8.2 AcademicTermStatus

| State | Meaning | Terminal |
|---|---|---|
| `planned` | Term dates are planned | No |
| `open` | Term is operational | No |
| `locked` | Term accepts no structural change | No |
| `closed` | Term is complete | Yes |

### 8.3 CurriculumStatus

| State | Meaning |
|---|---|
| `draft` | Curriculum is editable |
| `approved` | Curriculum is approved |
| `active` | Curriculum is used operationally |
| `retired` | Curriculum is no longer assigned |

### 8.4 CourseAssignmentStatus

| State | Meaning |
|---|---|
| `draft` | Assignment is being prepared |
| `active` | Assignment can be scheduled and used |
| `suspended` | Assignment temporarily unavailable |
| `replaced` | Assignment superseded by another teacher or course |
| `closed` | Assignment completed |

### 8.5 ScheduleVersionStatus

| State | Meaning |
|---|---|
| `draft` | Timetable is editable |
| `validated` | Timetable passed policy checks |
| `published` | Timetable is visible to dependent contexts |
| `active` | Timetable is operational |
| `retired` | Timetable superseded |

## 9. Domain Events

Domain events are immutable past-tense facts and must carry `eventId`, aggregate identifier, `occurredAt`, and `aggregateVersion` where relevant.

### Academic Year Events

- `AcademicYearCreated`
- `AcademicYearApproved`
- `AcademicYearActivated`
- `AcademicYearClosed`
- `AcademicYearArchived`
- `AcademicTermAdded`
- `AcademicTermOpened`
- `AcademicTermLocked`
- `AcademicTermClosed`

### Structure Events

- `EducationStageCreated`
- `EducationStageArchived`
- `GradeLevelCreated`
- `GradeLevelArchived`
- `SectionCreated`
- `SectionCapacityChanged`
- `AcademicStructureVersionPublished`

### Curriculum Events

- `CurriculumCreated`
- `CurriculumApproved`
- `CurriculumActivated`
- `CurriculumRetired`
- `SubjectCreated`
- `SubjectAssignedToGradeLevel`
- `SubjectRemovedFromGradeLevel`

### Assignment Events

- `CourseAssignmentCreated`
- `CourseAssignmentActivated`
- `CourseAssignmentSuspended`
- `CourseAssignmentTeacherReplaced`
- `CourseAssignmentClosed`
- `TeachingLoadCalculated`
- `TeachingLoadExceeded`

### Calendar Events

- `AcademicCalendarCreated`
- `AcademicCalendarPublished`
- `SchoolDayCreated`
- `SchoolDayChanged`
- `HolidayCreated`
- `HolidayCancelled`
- `TeachingPeriodCreated`
- `ExamSeasonCreated`
- `AssessmentPeriodCreated`

### Schedule Events

- `ClassScheduleDrafted`
- `ClassScheduleValidated`
- `ClassSchedulePublished`
- `ClassScheduleActivated`
- `ClassScheduleRetired`
- `ScheduleSlotAssigned`
- `ScheduleConflictDetected`

## 10. Policies

| Policy | Purpose |
|---|---|
| `AcademicYearActivationPolicy` | Ensures only eligible years become active |
| `TermBoundaryPolicy` | Validates terms inside academic year boundaries |
| `SectionCapacityPolicy` | Controls section capacity and capacity changes |
| `CurriculumApprovalPolicy` | Defines approval requirements before activation |
| `SubjectEligibilityPolicy` | Ensures subject is available for grade/curriculum |
| `TeacherLoadPolicy` | Defines maximum and minimum teaching load |
| `TeacherAssignmentPolicy` | Validates teacher eligibility for subject/grade |
| `CalendarPublicationPolicy` | Defines requirements for publishing calendar versions |
| `HolidayPolicy` | Defines holiday and makeup day behavior |
| `ExamSeasonPolicy` | Validates exam season windows and overlaps |
| `AssessmentPeriodPolicy` | Validates assessment period timing |
| `ScheduleConflictPolicy` | Detects teacher, section, room, and period conflicts |
| `SchedulePublicationPolicy` | Defines requirements before schedule publication |
| `MultiSchoolScopePolicy` | Prevents cross-school mutation unless explicitly allowed |

Policies belong in `domain/policies` and remain persistence-agnostic.

## 11. Specifications

| Specification | Candidate | Rule |
|---|---|---|
| `AcademicYearDateRangeSpecification` | `AcademicYear` | Start/end boundaries are valid |
| `AcademicTermWithinYearSpecification` | `AcademicTerm` | Term is within year |
| `NonOverlappingTermsSpecification` | `AcademicYear` | Terms do not overlap |
| `ActiveYearUniquenessSpecification` | `AcademicYear` | Only one active year per school scope |
| `SectionCapacitySpecification` | `Section` | Capacity is valid |
| `CurriculumSubjectAvailabilitySpecification` | `CurriculumSubject` | Subject belongs to grade/curriculum |
| `TeacherWeeklyLoadSpecification` | `CourseAssignment` | Teacher load is within limits |
| `TeachingPeriodTimeRangeSpecification` | `TeachingPeriod` | Period times are valid |
| `HolidayDateRangeSpecification` | `Holiday` | Holiday dates are valid |
| `ExamSeasonWithinTermSpecification` | `ExamSeason` | Exam season belongs to term/year |
| `AssessmentPeriodWithinTermSpecification` | `AssessmentPeriod` | Assessment period belongs to term |
| `ScheduleTeacherConflictSpecification` | `ClassSchedule` | Teacher is not double-booked |
| `ScheduleSectionConflictSpecification` | `ClassSchedule` | Section is not double-booked |
| `ScheduleRoomConflictSpecification` | `ClassSchedule` | Room is not double-booked when room scheduling is enabled |

Specifications belong in `domain/specifications`, expose `isSatisfiedBy(candidate)`, and remain deterministic.

## 12. Domain Services

| Domain Service | Responsibility |
|---|---|
| `AcademicYearPlanningService` | Coordinates year and term planning rules |
| `AcademicStructureService` | Coordinates stage, grade, and section structural changes |
| `CurriculumPlanningService` | Coordinates curriculum version and subject availability rules |
| `CourseAssignmentService` | Coordinates teacher-course-section assignment decisions |
| `TeachingLoadService` | Calculates and validates load across assignments |
| `AcademicCalendarService` | Coordinates calendar publication readiness |
| `ScheduleValidationService` | Validates schedule conflicts and policy readiness |
| `AcademicReadinessService` | Confirms the domain is ready for term/year operations |

Domain services may coordinate multiple aggregates but must not persist directly.

## 13. Repository Interfaces

Repository contracts belong in `domain/repositories`.

| Repository | Responsibility |
|---|---|
| `IAcademicYearRepository` | Load/save `AcademicYear` aggregate |
| `IAcademicStructureRepository` | Load/save `AcademicStructure` aggregate |
| `ICurriculumRepository` | Load/save `Curriculum` aggregate |
| `ICourseAssignmentRepository` | Load/save `CourseAssignment` aggregate |
| `IAcademicCalendarRepository` | Load/save `AcademicCalendar` aggregate |
| `IClassScheduleRepository` | Load/save `ClassSchedule` aggregate |
| `IAcademicReadRepository` | Search and read optimized academic views |
| `IScheduleReadRepository` | Read active schedules and timetable projections |
| `ITeachingLoadReadRepository` | Read teacher load projections |

Aggregate repositories must support optimistic concurrency with `expectedVersion` when saving mutable aggregate roots.

## 14. Application Services

Application services orchestrate use cases and do not contain business logic.

| Application Service | Responsibility |
|---|---|
| `AcademicYearApplicationService` | Year and term use cases |
| `AcademicStructureApplicationService` | Stage, grade, section use cases |
| `CurriculumApplicationService` | Curriculum and subject use cases |
| `CourseAssignmentApplicationService` | Assignment and teacher replacement use cases |
| `AcademicCalendarApplicationService` | Calendar, holiday, exam, assessment period use cases |
| `ClassScheduleApplicationService` | Timetable drafting, validation, publication, activation |
| `AcademicQueryService` | Academic read operations |
| `ScheduleQueryService` | Schedule and timetable read operations |
| `TeachingLoadQueryService` | Teacher load read operations |

## 15. Use Cases

### Academic Year

- Create academic year.
- Add academic term.
- Approve academic year.
- Activate academic year.
- Close academic year.
- Archive academic year.

### Academic Structure

- Create education stage.
- Create grade level.
- Create section.
- Change section capacity.
- Publish academic structure version.
- Archive stage, grade level, or section.

### Curriculum

- Create curriculum.
- Create subject.
- Assign subject to grade level.
- Approve curriculum.
- Activate curriculum.
- Retire curriculum.

### Course Assignment And Teaching Load

- Create course assignment.
- Activate course assignment.
- Replace assigned teacher.
- Suspend assignment.
- Close assignment.
- Calculate teaching load.
- Validate teacher load.

### Calendar And Periods

- Create academic calendar.
- Define school day.
- Define holiday.
- Define teaching period.
- Define exam season.
- Define assessment period.
- Publish academic calendar.

### Class Schedule

- Draft class schedule.
- Assign schedule slot.
- Validate schedule conflicts.
- Publish schedule.
- Activate schedule.
- Retire schedule version.

## 16. CQRS Boundaries

### Command Side

The command side owns aggregate mutation:

- `AcademicYear`
- `AcademicStructure`
- `Curriculum`
- `CourseAssignment`
- `AcademicCalendar`
- `ClassSchedule`

Commands must load aggregates through repository interfaces, call aggregate/domain service behavior, save with expected versions, and collect domain events.

### Query Side

Read models are projection-oriented:

- `AcademicYearReadModel`
- `AcademicTermReadModel`
- `GradeLevelReadModel`
- `SectionReadModel`
- `CurriculumReadModel`
- `SubjectReadModel`
- `TeacherLoadReadModel`
- `ActiveScheduleReadModel`
- `AcademicCalendarReadModel`
- `AssessmentWindowReadModel`

Queries must not mutate aggregates.

### Projection Boundaries

Infrastructure projections may denormalize:

- Active year and term.
- Grade-section hierarchy.
- Subject catalog by grade level.
- Teacher load by week.
- Timetable by section.
- Timetable by teacher.
- Calendar by date.
- Assessment windows by term.

## 17. Event Model

Events are used to update projections and notify related contexts.

| Event | Projection / Consumer |
|---|---|
| `AcademicYearActivated` | Student enrollment, Attendance, Assessment, Certificate |
| `AcademicTermOpened` | Attendance, Assessment |
| `AcademicTermClosed` | Assessment, Certificate |
| `SectionCreated` | Student enrollment and class placement |
| `SectionCapacityChanged` | Student placement capacity checks |
| `CurriculumActivated` | Assessment and Certificate requirements |
| `SubjectAssignedToGradeLevel` | Assessment setup and schedule planning |
| `CourseAssignmentActivated` | Class schedule and teacher timetable |
| `AcademicCalendarPublished` | Attendance official day generation |
| `HolidayCreated` | Attendance day availability |
| `ExamSeasonCreated` | Assessment scheduling |
| `AssessmentPeriodCreated` | Assessment entry windows |
| `ClassScheduleActivated` | Attendance period availability and teacher/student timetables |

Events must not directly mutate external domains. External domains react through application-level subscribers or projection handlers.

## 18. Relationships With Other Domains

### Student Domain

Student enrollment references:

- `AcademicYearId`
- `AcademicTermId`
- `GradeLevelId`
- `SectionId`

Academic Domain provides active structure and capacity. Student Domain owns student lifecycle and placement decision records.

### Teacher Domain

Course assignment references:

- `TeacherId`

Teacher Domain owns teacher identity, employment state, qualification records, and availability preferences. Academic Domain owns assignment and load decisions.

### Attendance Domain

Attendance references:

- `AcademicYearId`
- `AcademicTermId`
- `SectionId`
- `SchoolDayId`
- `TeachingPeriodId`
- `ScheduleSlotId`

Attendance Domain owns attendance marks. Academic Domain owns official school days, periods, and active schedule.

### Assessment Domain

Assessment references:

- `AcademicYearId`
- `AcademicTermId`
- `AssessmentPeriodId`
- `ExamSeasonId`
- `SubjectId`
- `CourseAssignmentId`

Assessment Domain owns marks, grading workflows, and assessment records. Academic Domain owns assessment windows and curriculum/subject availability.

### Certificate Domain

Certificate references:

- `AcademicYearId`
- `AcademicTermId`
- `GradeLevelId`
- `CurriculumId`
- `SubjectId`

Certificate Domain owns certificate issuance and official transcript output. Academic Domain owns structure used to validate certificate content.

## 19. Offline-First Behavior

The Academic Domain must support offline-first operation for school-level users.

Rules:

- Read models for active year, term, structure, calendar, and schedules must be cacheable locally.
- Commands created offline must include client-generated IDs and expected versions.
- Conflicts must be detected at aggregate save boundaries.
- Published schedule/calendar versions should be immutable to simplify sync.
- Offline edits to drafts may sync later if expected versions still match.
- Activation, closure, and archive operations should require authoritative synchronization before becoming official.
- Domain events are queued locally and published after successful sync.

Conflict examples:

- Two admins create the same section code.
- A teacher is assigned beyond load policy from two offline devices.
- A schedule slot conflicts after another schedule version is published.
- Academic year activation conflicts with an already active year.

## 20. Future Multi-School Support

Every aggregate must include or reference `SchoolScopeId`.

Rules:

- Codes are unique within school scope unless ministry policy requires global uniqueness.
- Academic years may share code values across schools.
- Ministry reference codes remain optional until integration is enabled.
- Cross-school curriculum templates may be shared by reference, not owned by a single school aggregate.
- Schedules, sections, and calendars are school-scoped.
- Course assignments are school-scoped even when teachers serve multiple schools.

## 21. Future Ministry-Scale Support

The architecture must support ministry-scale centralization without rewriting domain boundaries.

Future readiness requirements:

- Ministry-managed curriculum templates.
- Ministry-wide academic year templates.
- Region, district, and school hierarchy.
- Central subject codes.
- National exam seasons.
- Ministry reporting projections.
- Bulk structure publication to many schools.
- Tenant-safe IDs and school scope isolation.
- Event streams partitioned by ministry, region, district, and school scope.

Academic Domain remains the school operational source of truth, while ministry templates become upstream references.

## 22. Naming Standard

Required naming patterns:

- Module: `academic`.
- Aggregates: `AcademicYear`, `AcademicStructure`, `Curriculum`, `CourseAssignment`, `AcademicCalendar`, `ClassSchedule`.
- Value objects: `AcademicYearCode`, `DateRange`, `SectionCode`, `TimeRange`.
- Events: past-tense names such as `AcademicYearActivated`.
- Repositories: `IAcademicYearRepository`, `IAcademicReadRepository`.
- Commands: `CreateAcademicYearCommand`, `PublishClassScheduleCommand`.
- Queries: `GetActiveAcademicYearQuery`, `SearchSectionsQuery`.
- DTOs: `AcademicYearDto`, `ClassScheduleDto`.
- Policies: `TeacherLoadPolicy`, `SchedulePublicationPolicy`.
- Specifications: `ScheduleTeacherConflictSpecification`.
- Hooks: `useAcademicYear`, `useClassSchedule`.

## 23. Required Documentation And Tests For Implementation Phases

Future Academic implementation phases must produce:

- Academic domain skeleton report.
- Academic value objects report.
- Academic aggregate reports.
- Academic repository contract report.
- Academic event model report.
- Academic application layer report.

Focused tests must cover:

- Value object validation, normalization, equality, serialization.
- Aggregate lifecycle transitions.
- Schedule conflict invariants.
- Calendar boundary invariants.
- Curriculum subject availability.
- Teaching load policy behavior.
- Domain event collection and clearing.
- Optimistic version behavior.

## 24. Certification Checklist

The Academic Domain is ready for implementation only when:

- This architecture is approved.
- Aggregate boundaries are not expanded without documentation.
- Student Domain is not modified.
- Repository contracts remain persistence-agnostic.
- Events remain past-tense immutable facts.
- Application services remain orchestration-only.
- Infrastructure remains outside the domain.
- Presentation remains UI-only.
- Offline and multi-school rules are preserved.

---

*End of Academic Domain Official Architecture Document*

**Next Steps:** Phase 3.1 - Academic Domain Skeleton.
