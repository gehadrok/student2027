# Student Aggregate Report

**Phase:** 2.5 - Student Aggregate Implementation  
**Scope:** Student aggregate only  
**Status:** Implementation complete

## Aggregate Responsibilities

The `Student` aggregate root now protects the core student lifecycle and identity boundary. It contains only the approved strongly consistent objects:

- `Student`
- `GuardianLink`
- `Enrollment`
- `StatusHistory`

The aggregate is responsible for:

- Creating a student through `Student.register(...)`.
- Preventing direct public construction.
- Enforcing lifecycle state transitions.
- Ensuring enrollment exists before activation.
- Preventing invalid terminal-state mutations.
- Preventing duplicate graduation.
- Preventing transfer after graduation.
- Preventing archive while active.
- Managing guardian links through aggregate methods only.
- Preventing guardian mutation after terminal lifecycle states.
- Validating actor identity before guardian mutations.
- Ensuring no more than one primary guardian.
- Updating status history on lifecycle transitions.
- Raising domain events.
- Tracking optimistic `version`.
- Tracking `lastModified`.
- Collecting and clearing domain events.

## Invariant List

| Invariant | Enforced By |
|---|---|
| Student can only be created through factory methods | Private constructor + `register` / `rehydrate` |
| Student id is required | Constructor |
| Active, suspended, and graduated students require enrollment | Aggregate invariant validation |
| Student cannot activate before enrollment | `activate()` |
| Student cannot enroll unless registered | `enroll()` transition rules |
| Student cannot graduate unless active | `graduate()` transition rules |
| Student cannot graduate twice | Terminal-state guard |
| Student cannot transfer after graduation | Terminal-state guard |
| Student cannot archive while active | `archive()` transition rules |
| Archived student cannot be changed | Terminal-state guard |
| Terminal students cannot have guardian links mutated | Aggregate mutability guard |
| Guardian assignment/removal requires changed-by actor before mutation | `assignGuardian()` / `removeGuardian()` |
| Student cannot have more than one primary guardian | `assignGuardian()` and invariant validation |
| Guardian links must belong to the same student | `assignGuardian()` |
| Enrollment must belong to the same student | `enroll()` |
| Version cannot be negative | Aggregate invariant validation |
| Every lifecycle transition records status history | `transitionTo()` |
| Every business method raises a domain event | Method-specific event creation |

## State Transition Matrix

| Method | Allowed From | To | Rejects |
|---|---|---|---|
| `register()` | None | `registered` | Invalid value-object construction |
| `enroll()` | `registered` | `enrolled` | Wrong student enrollment, non-registered states |
| `activate()` | `enrolled`, `suspended` | `active` | Missing enrollment, invalid states |
| `transfer()` | `active`, `suspended` | `transferred` | Graduated, withdrawn, archived, registered, enrolled |
| `suspend()` | `active` | `suspended` | Missing reason, invalid states |
| `reactivate()` | `suspended` | `active` | Missing enrollment, invalid states |
| `graduate()` | `active` | `graduated` | Repeat graduation, invalid states |
| `withdraw()` | `registered`, `enrolled`, `active`, `suspended` | `withdrawn` | Missing reason, terminal states |
| `archive()` | `transferred`, `graduated`, `withdrawn` | `archived` | Active, enrolled, registered, suspended |
| `assignGuardian()` | `registered`, `enrolled`, `active`, `suspended` | No status change | Duplicate guardian, second primary guardian, wrong student, terminal states |
| `removeGuardian()` | `registered`, `enrolled`, `active`, `suspended` | No status change | Unknown guardian, unsafe primary guardian removal, terminal states |

## Events Raised

| Method | Event |
|---|---|
| `register()` | `StudentRegistered` |
| `enroll()` | `StudentEnrolled` |
| `activate()` | `StudentActivated` |
| `transfer()` | `StudentTransferred` |
| `suspend()` | `StudentSuspended` |
| `reactivate()` | `StudentReactivated` |
| `graduate()` | `StudentGraduated` |
| `withdraw()` | `StudentWithdrawn` |
| `archive()` | `StudentArchived` |
| `assignGuardian()` | `GuardianAssigned` |
| `removeGuardian()` | `GuardianRemoved` |

## Methods Implemented

| Method | Purpose |
|---|---|
| `Student.register()` | Factory for new registered students |
| `Student.rehydrate()` | Factory for rebuilding aggregate from trusted persistence snapshots |
| `enroll()` | Link enrollment and move to enrolled |
| `activate()` | Move enrolled/suspended student to active |
| `transfer()` | Move active/suspended student to transferred |
| `suspend()` | Suspend active student |
| `reactivate()` | Return suspended student to active |
| `graduate()` | Graduate active student |
| `withdraw()` | Withdraw registered/enrolled/active/suspended student |
| `archive()` | Archive transferred/graduated/withdrawn student |
| `assignGuardian()` | Add guardian link through aggregate boundary |
| `removeGuardian()` | Remove guardian link through aggregate boundary |
| `pullDomainEvents()` | Return and clear pending aggregate events |
| `clearDomainEvents()` | Clear pending aggregate events |

## Value Object Integration

The aggregate constructor/factories use previously implemented value objects:

- `StudentNumber`
- `FullName`
- `BirthDate`
- `Gender`
- `NationalId`
- `PhoneNumber`
- `EmailAddress`

The aggregate does not use primitive strings where these value objects exist.

## Test Coverage

Aggregate unit tests were added at:

```text
src/modules/student/tests/domain/aggregates/Student.test.ts
```

Covered behavior:

- Registration happy path.
- Value-object integration.
- Event collection and clearing.
- Enrollment and activation happy path.
- Activation before enrollment rejection.
- Enrollment from invalid state rejection.
- Suspension and reactivation.
- Graduation happy path.
- Duplicate graduation rejection.
- Transfer after graduation rejection.
- Archive while active rejection.
- Withdrawal then archive.
- Transfer then archive.
- Guardian assignment.
- Primary guardian invariant.
- Guardian removal.
- Unknown guardian removal rejection.
- Missing changed-by rejection before guardian mutation.
- Guardian mutation rejection after archival.
- Status history updates.
- Version updates.

## Verification

Focused student domain tests passed:

```text
30 tests passed
0 tests failed
```

Narrowed TypeScript check passed for:

- `src/modules/student/index.ts`
- Student domain aggregate tests
- Student domain value-object tests

## Scope Compliance

No repositories, database access, SQL, infrastructure, UI, CRUD, controllers, APIs, or services were implemented in this phase.

Documents, medical profiles, photos, and notes were not added to the Student aggregate.
