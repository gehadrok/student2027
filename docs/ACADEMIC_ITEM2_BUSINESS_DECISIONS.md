# Academic Item 2 Business Decision Checklist

**Status:** Item 2 remains BLOCKED.  
**Scope:** Business decision checklist for undefined aggregate-completeness requirements.  
**Sources:** `ACADEMIC_FINAL_ARCHITECTURE_AUDIT.md`, `ACADEMIC_AGGREGATE_COMPLETENESS_ITEM2_REPORT.md`, `ACADEMIC_ITEM2_SPECIFICATION_GAP_ANALYSIS.md`, official Academic architecture, Student Domain Standard.  
**Documentation Freeze:** honored. This is not an ADR, RFC, governance document, implementation plan, schema design, or code change.

## Decision Classification

- **Recommended:** only when justified by existing project standards.
- **BUSINESS DECISION REQUIRED:** cannot be determined from current sources.

---

## Aggregate Lifecycle Transition Matrices

### BD-001

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicStructure` |
| Question | What are the allowed statuses and transition matrix for `AcademicStructure`, `EducationStage`, `GradeLevel`, `Section`, and `AcademicStructureVersion`? |
| Existing documented options | Architecture defines archive/publish use cases and says archived stages/grade levels cannot receive new sections. It does not define status enums. |
| Consequences | Option A: root/version-only statuses keeps child entities simpler but may not express archived stage/grade/section rules clearly. Option B: statuses per child entity enables precise archive rules but increases persistence and testing scope. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-002

| Field | Detail |
| --- | --- |
| Component/Aggregate | `Curriculum` |
| Question | What is the exact transition matrix for `draft`, `approved`, `active`, `retired`? |
| Existing documented options | States are defined. Only "curriculum version must be approved before activation" is explicitly defined. |
| Consequences | Option A: `draft -> approved -> active -> retired` is simple and mirrors `AcademicYear`, but is not explicitly stated. Option B: allow `approved -> retired` or `active -> draft` supports correction workflows but weakens immutability. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-003

| Field | Detail |
| --- | --- |
| Component/Aggregate | `CourseAssignment` |
| Question | What is the exact transition matrix for `draft`, `active`, `suspended`, `replaced`, `closed`? |
| Existing documented options | States are listed; use cases include activate, suspend, replace teacher, close. |
| Consequences | Option A: linear/terminal workflow reduces ambiguity. Option B: allow reactivation from suspended supports operational correction. Option C: replaced may be terminal or may link to a replacement aggregate. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-004

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicCalendar` |
| Question | What statuses exist for calendar root and calendar versions, and what transitions lead to publication? |
| Existing documented options | Architecture defines publish calendar and says published schedule/calendar versions should be immutable. No calendar status enum is defined. |
| Consequences | Option A: version statuses only avoids root lifecycle complexity. Option B: root statuses add governance but require more commands/events. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-005

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule` |
| Question | What is the exact transition matrix for `draft`, `validated`, `published`, `active`, `retired`? |
| Existing documented options | States are defined. Use cases include validate, publish, activate, retire. |
| Consequences | Option A: `draft -> validated -> published -> active -> retired` is simple and matches listed order but is not explicitly mandated. Option B: allow `published -> retired` before activation or `validated -> draft` for correction. |
| Recommended option | BUSINESS DECISION REQUIRED |

---

## Teacher Load Policy

### BD-006

| Field | Detail |
| --- | --- |
| Component/Aggregate | `CourseAssignment`, `TeacherLoadPolicy` |
| Question | What are the minimum and maximum teaching load thresholds? |
| Existing documented options | Architecture says `TeacherLoadPolicy` defines maximum and minimum teaching load. Existing `TeachingLoad` VO validates numeric load but not institutional thresholds. |
| Consequences | Option A: global min/max is simple. Option B: thresholds by stage/subject/teacher employment type are more accurate but require more data. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-007

| Field | Detail |
| --- | --- |
| Component/Aggregate | `CourseAssignment`, `TeachingLoadService` |
| Question | What counts toward teaching load: weekly periods, credit hours, active assignments only, suspended assignments, or schedule slots? |
| Existing documented options | Architecture mentions teaching load allocation, `TeachingLoadSnapshot`, `WeeklyPeriodCount`, `CreditHours`, and `TeachingLoadCalculated`. It does not define calculation formula. |
| Consequences | Using weekly periods aligns with current `CourseAssignmentRecord.weeklyPeriods`; using credit hours may better represent curriculum weighting; using active schedules gives operational load but depends on ClassSchedule. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-008

| Field | Detail |
| --- | --- |
| Component/Aggregate | `CourseAssignment`, `TeachingLoadExceeded` |
| Question | If teacher load is exceeded, should assignment activation be blocked or should the system record `TeachingLoadExceeded` and allow override? |
| Existing documented options | Event `TeachingLoadExceeded` exists; architecture says assignment cannot exceed teaching load policy. |
| Consequences | Blocking enforces invariant strongly. Override allows admin flexibility but requires approval/audit rules not defined. |
| Recommended option | BUSINESS DECISION REQUIRED |

---

## Curriculum Approval Policy

### BD-009

| Field | Detail |
| --- | --- |
| Component/Aggregate | `Curriculum`, `CurriculumApprovalPolicy` |
| Question | What conditions must be satisfied before a curriculum can be approved? |
| Existing documented options | Architecture says curriculum version must be approved before activation; no approval checklist is defined. |
| Consequences | Minimal approval permits empty/partial curricula. Strict approval may require subjects, grade assignments, version metadata, and actor authority. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-010

| Field | Detail |
| --- | --- |
| Component/Aggregate | `Curriculum` |
| Question | Must a curriculum contain at least one subject before approval or activation? |
| Existing documented options | Architecture says Curriculum owns Subject and CurriculumSubject, but does not define minimum cardinality. |
| Consequences | Requiring subjects prevents unusable active curricula. Allowing empty curricula supports staged setup but may break downstream Assessment/Certificate expectations. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-011

| Field | Detail |
| --- | --- |
| Component/Aggregate | `CurriculumSubject` |
| Question | What are the allowed subject assignment categories and rules for core, elective, optional, and ministry-required subjects? |
| Existing documented options | Architecture names these categories only. |
| Consequences | A fixed enum supports validation and reporting. Configurable categories need policy/config contracts. |
| Recommended option | BUSINESS DECISION REQUIRED |

---

## Schedule Publication Policy

### BD-012

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule`, `SchedulePublicationPolicy` |
| Question | What conditions must be met before a schedule version can be published? |
| Existing documented options | Architecture says validate conflicts, publish schedule versions, and published versions are immutable except through superseding version. |
| Consequences | Minimal policy only requires no conflicts. Strict policy may require full section coverage, active calendar, active assignments, teacher load snapshots, and date-range coverage. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-013

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule` |
| Question | Can a validated schedule be modified, or must modification create a new draft/version? |
| Existing documented options | Published versions are immutable except through superseding version; validated immutability is not defined. |
| Consequences | Allowing validated edits is operationally flexible. Forcing new versions improves auditability but increases complexity. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-014

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule` |
| Question | Is activation separate from publication, and what additional preconditions does activation require? |
| Existing documented options | States include both `published` and `active`. |
| Consequences | Separate activation allows pre-publication review. Immediate activation simplifies workflow but collapses two documented states. |
| Recommended option | BUSINESS DECISION REQUIRED |

---

## Schedule Conflict Policy

### BD-015

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule`, `ScheduleConflictPolicy` |
| Question | What exact fields define a teacher conflict? |
| Existing documented options | Architecture says a teacher cannot be scheduled in two places at the same time. |
| Consequences | Conflict by teacher + date/day + period is simple. Conflict by teacher + exact `TimeRange` handles variable periods but needs calendar template rules. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-016

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule`, `ScheduleConflictPolicy` |
| Question | What exact fields define a section conflict? |
| Existing documented options | Architecture says a section cannot have two active lessons at the same time. |
| Consequences | Period-based conflict is simple. TimeRange-based conflict supports flexible schedules but requires more data. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-017

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule`, `ScheduleRoomConflictSpecification` |
| Question | When is room scheduling enabled, and what defines a room conflict? |
| Existing documented options | Architecture says room reference is optional until room scheduling is enabled. |
| Consequences | Disabled room checks avoid false blockers. Enabled checks require room identity and room assignment completeness. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-018

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule`, `ScheduleConflictDetected` |
| Question | Should schedule conflicts block slot assignment immediately, block validation/publication only, or emit warnings while allowing drafts? |
| Existing documented options | Architecture names conflict detection and `ScheduleConflictDetected`, but does not define blocking point. |
| Consequences | Blocking on assignment keeps drafts clean but makes editing rigid. Blocking on publish supports draft exploration. Warning-only requires explicit override governance. |
| Recommended option | BUSINESS DECISION REQUIRED |

---

## Event Payload Contracts

### BD-019

| Field | Detail |
| --- | --- |
| Component/Aggregate | All new Academic aggregates |
| Question | What common payload fields must every new domain event include? |
| Existing documented options | Student Domain Standard and Academic architecture require past-tense facts with `eventId`, aggregate identifier, `occurredAt`, and optional/relevant `aggregateVersion`. |
| Consequences | Standardizing common fields improves EventBus/projection consistency. Missing fields make event consumers brittle. |
| Recommended option | **Recommended:** require `eventId`, aggregate id, `occurredAt`, and `aggregateVersion` for mutable aggregates, because this is directly supported by the Student Domain Standard and Academic architecture. |

### BD-020

| Field | Detail |
| --- | --- |
| Component/Aggregate | Structure/Curriculum/Assignment/Calendar/Schedule events |
| Question | What aggregate-specific payload fields are required for each event? |
| Existing documented options | Event names are listed only. |
| Consequences | Minimal payload reduces coupling but may be insufficient for projections. Rich payload supports projections but commits to contracts. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-021

| Field | Detail |
| --- | --- |
| Component/Aggregate | All lifecycle events |
| Question | Should actor (`changedBy`) and reason be mandatory event payload fields? |
| Existing documented options | Existing `AcademicYear` methods accept `changedBy`; archive requires reason. Student standard says status changes record history. |
| Consequences | Mandatory actor/reason improves auditability. Optional reason is easier for simple transitions but weakens governance. |
| Recommended option | **Recommended:** require actor for lifecycle events, because existing `AcademicYear` uses `changedBy` and Student standard requires history for lifecycle transitions. Reason requirements beyond archive remain BUSINESS DECISION REQUIRED. |

---

## Aggregate Snapshots And Rehydration

### BD-022

| Field | Detail |
| --- | --- |
| Component/Aggregate | All missing aggregates |
| Question | What snapshot shape must each aggregate expose for trusted persistence restoration? |
| Existing documented options | Student Domain Standard requires explicit snapshot shapes and `rehydrate`; current `AcademicYearSnapshot` is the only implemented Academic example. |
| Consequences | Rich snapshots support complete reconstruction but require schema/read model changes. Minimal snapshots may lose lifecycle history/events. |
| Recommended option | **Recommended:** define explicit TypeScript snapshot interfaces per aggregate before implementation, because Student Domain Standard requires explicit interfaces and `rehydrate`. Exact fields are BUSINESS DECISION REQUIRED. |

### BD-023

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicStructure`, `Curriculum`, `AcademicCalendar`, `ClassSchedule` |
| Question | Are version entities (`AcademicStructureVersion`, `CurriculumVersion`, `CalendarVersion`, `ScheduleVersion`) child entities with persisted history, current snapshots only, or both? |
| Existing documented options | Architecture lists version entities and says published schedule/calendar versions should be immutable. |
| Consequences | History supports audit/offline sync but expands persistence. Current-only simplifies storage but weakens version semantics. |
| Recommended option | BUSINESS DECISION REQUIRED |

---

## expectedVersion And Concurrency

### BD-024

| Field | Detail |
| --- | --- |
| Component/Aggregate | All mutable aggregate repositories |
| Question | Should every aggregate `save` require `expectedVersion`? |
| Existing documented options | Academic architecture says aggregate repositories must support optimistic concurrency with `expectedVersion` when saving mutable roots. Student standard says save methods should accept expected version when optimistic concurrency matters. Offline-first rules say commands created offline must include expected versions. |
| Consequences | Mandatory expectedVersion improves offline conflict detection but requires API and persistence changes. Optional expectedVersion is easier but may preserve silent overwrite risks. |
| Recommended option | **Recommended:** require `expectedVersion` for all mutable aggregate save commands/repositories, justified by official Academic architecture and offline-first rules. |

### BD-025

| Field | Detail |
| --- | --- |
| Component/Aggregate | All mutable aggregate repositories |
| Question | What happens when `expectedVersion` mismatches persisted version? |
| Existing documented options | Architecture says conflicts must be detected at aggregate save boundaries. No error contract is defined. |
| Consequences | Throwing domain/application error is simple; returning conflict result supports richer API mapping. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-026

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicYear` |
| Question | Should existing `AcademicYear` be remediated to persist/reconstruct version instead of mapper resetting version to 0? |
| Existing documented options | Audit flags this as optimistic concurrency not actually implemented. Architecture requires expectedVersion. |
| Consequences | Fixing aligns with architecture but changes schema/persistence. Deferring keeps current warning. |
| Recommended option | BUSINESS DECISION REQUIRED |

---

## SectionCapacity Semantics

### BD-027

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicStructure`, `SectionCapacityPolicy`, `SectionCapacitySpecification` |
| Question | Is valid section capacity `>= 0` or `>= 1`? |
| Existing documented options | Official architecture: section capacity cannot be negative. Existing `SectionCapacity` VO: capacity must be at least 1. |
| Consequences | `>= 0` permits temporarily closed/placeholder sections. `>= 1` ensures usable sections only and matches current VO. |
| Recommended option | BUSINESS DECISION REQUIRED due to conflicting sources. |

### BD-028

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicStructure`, `SectionCapacityChanged` |
| Question | Can section capacity be reduced below current enrollment? |
| Existing documented options | Architecture references Student placement capacity checks but does not define reduction rule. |
| Consequences | Blocking protects student placement consistency. Allowing creates over-capacity states requiring warnings/remediation. |
| Recommended option | BUSINESS DECISION REQUIRED |

---

## Delete vs Archive/Retire/Close

### BD-029

| Field | Detail |
| --- | --- |
| Component/Aggregate | `Curriculum` |
| Question | Should existing delete endpoint remain, and if so, when is hard delete allowed versus `retire`? |
| Existing documented options | Current API/repository has delete. Official lifecycle has `retired`, not delete. |
| Consequences | Keeping delete preserves API compatibility but may violate lifecycle/audit expectations. Retire-only protects references but requires contract changes. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-030

| Field | Detail |
| --- | --- |
| Component/Aggregate | `CourseAssignment` |
| Question | Should existing delete endpoint remain, and if so, when is hard delete allowed versus `closed`, `suspended`, or `replaced`? |
| Existing documented options | Current API/repository has delete. Official lifecycle has suspend/replace/close. |
| Consequences | Hard delete may break schedule/history references. Lifecycle closure preserves auditability but changes client workflow. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-031

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicCalendar` |
| Question | Should calendar days/holidays/periods/seasons be hard deleted, changed, cancelled, or superseded once published? |
| Existing documented options | Current school-day CRUD has delete. Architecture defines `HolidayCancelled`, `SchoolDayChanged`, publication, and published calendar immutability guidance. |
| Consequences | Hard delete is simple but risks downstream Attendance/Assessment inconsistency. Cancellation/supersession preserves history but needs versioning. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-032

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicStructure` |
| Question | Should stage/grade/section deletion exist, or only archive? |
| Existing documented options | Use cases name archive stage/grade/section; no delete use case. |
| Consequences | Archive preserves references and history. Hard delete may break Student/Schedule references. |
| Recommended option | **Recommended:** prefer archive over delete for stage/grade/section, because the official use cases define archive and not delete. Exact archive constraints remain BUSINESS DECISION REQUIRED. |

### BD-033

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule` |
| Question | Should schedule versions be deleted or only retired/superseded? |
| Existing documented options | Architecture defines retire and immutable published versions; no delete use case. |
| Consequences | Retire/supersede preserves operational history. Delete risks breaking Attendance/timetable projections. |
| Recommended option | **Recommended:** use retire/supersede rather than hard delete, justified by official lifecycle and immutability guidance. Exact rules remain BUSINESS DECISION REQUIRED. |

---

## Cross-Aggregate Validation

### BD-034

| Field | Detail |
| --- | --- |
| Component/Aggregate | `CourseAssignment` |
| Question | Which component verifies active academic year and term references before assignment activation? |
| Existing documented options | Architecture says Assignment must reference active year and term. Application services may coordinate repositories; domain services may coordinate multiple aggregates but must not persist. |
| Consequences | Aggregate-only validation cannot load other aggregates. Application/domain service validation respects boundaries but requires read contracts. |
| Recommended option | **Recommended:** perform cross-aggregate validation in application/domain services using repository/read contracts, because Student standard keeps persistence out of domain aggregates while application orchestrates policies/repositories. Exact service contracts are BUSINESS DECISION REQUIRED. |

### BD-035

| Field | Detail |
| --- | --- |
| Component/Aggregate | `CourseAssignment` |
| Question | Which component verifies active section and subject availability to grade level? |
| Existing documented options | Architecture names `SubjectEligibilityPolicy` and `CurriculumSubjectAvailabilitySpecification`; Student standard places business decisions in policies/specifications/domain services. |
| Consequences | Policy/spec validation is reusable. Embedding checks in application service risks duplicated business logic. |
| Recommended option | **Recommended:** use policy/specification contracts invoked by application/domain services. Exact inputs and rules are BUSINESS DECISION REQUIRED. |

### BD-036

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicCalendar` |
| Question | Which component verifies calendar dates, exam seasons, and assessment periods are inside active academic year/term boundaries? |
| Existing documented options | Architecture defines boundary invariants and `ExamSeasonWithinTermSpecification` / `AssessmentPeriodWithinTermSpecification`. |
| Consequences | Aggregate can check boundaries only if it owns or receives boundary snapshots. Service-level validation can load AcademicYear/Term but needs contracts. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-037

| Field | Detail |
| --- | --- |
| Component/Aggregate | `ClassSchedule` |
| Question | Which component verifies schedule slots reference active course assignments and official teaching periods? |
| Existing documented options | Architecture says slot must reference active assignment; AcademicCalendar owns teaching periods. |
| Consequences | Validation through read repositories avoids cross-aggregate object coupling but requires read model contracts. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-038

| Field | Detail |
| --- | --- |
| Component/Aggregate | All school-scoped aggregates |
| Question | How is same-school scope enforced across aggregate references? |
| Existing documented options | Every aggregate must include/reference `SchoolScopeId`; `MultiSchoolScopePolicy` prevents cross-school mutation unless explicitly allowed. |
| Consequences | Strict same-scope checks protect tenant isolation. Allowing cross-school templates requires explicit exception policy. |
| Recommended option | **Recommended:** require same `SchoolScopeId` for operational mutations by default, because official architecture mandates multi-school scope isolation. Exception rules are BUSINESS DECISION REQUIRED. |

---

## Aggregate Persistence And API Compatibility

### BD-039

| Field | Detail |
| --- | --- |
| Component/Aggregate | `Curriculum`, `CourseAssignment`, `AcademicCalendar` |
| Question | Should existing record-oriented repository/API contracts be adapted into aggregate repositories, replaced, or kept as read-model/compatibility facades? |
| Existing documented options | Current code has record contracts; official architecture requires aggregate repositories. |
| Consequences | Adapting preserves compatibility but may blur boundaries. Replacing is cleaner but breaks APIs/UI. Keeping facades over aggregates preserves REST compatibility but adds mapping layer. |
| Recommended option | BUSINESS DECISION REQUIRED |

### BD-040

| Field | Detail |
| --- | --- |
| Component/Aggregate | `AcademicStructure`, `ClassSchedule` |
| Question | Should new REST contracts be introduced now, or should Item 2 be domain-only with no API exposure? |
| Existing documented options | Architecture lists application services/use cases. Current API has no AcademicStructure or ClassSchedule routes. User request says preserve existing REST contracts unless architecture explicitly requires a contract change. |
| Consequences | Domain-only implementation avoids API churn. Adding routes completes application surface but expands scope. |
| Recommended option | BUSINESS DECISION REQUIRED |

## Minimum Decision Set To Unblock Item 2

The smallest set of decisions required before implementation can safely begin:

1. Lifecycle transition matrices for `AcademicStructure`, `Curriculum`, `CourseAssignment`, `AcademicCalendar`, and `ClassSchedule`.
2. Policy contracts and concrete default rules for teacher load, curriculum approval, schedule publication, schedule conflict detection, subject eligibility, calendar publication, and multi-school scope.
3. Event payload contracts for all new events beyond common fields.
4. Aggregate snapshot/rehydration shapes and version entity semantics.
5. Mandatory `expectedVersion` behavior and conflict error semantics.
6. Resolution of `SectionCapacity` conflict (`>= 0` vs `>= 1`).
7. Delete vs archive/retire/close/cancel behavior for each aggregate.
8. Cross-aggregate validation responsibility and read repository contracts.
9. Compatibility decision for existing CRUD APIs and record repositories.

## Final Status

Item 2 remains **BLOCKED**.

No implementation should begin until the BUSINESS DECISION REQUIRED items above are resolved or the permitted scope is reduced to explicit fail-fast skeletons only.

*End of business decision checklist.*
