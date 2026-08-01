# Student Domain Standard

**Status:** Mandatory reference standard  
**Source implementation:** `src/modules/student/`  
**Applies to:** All future ERP domains  
**Scope:** Architecture, naming, folders, DDD patterns, contracts, events, value objects, repositories, tests

## 1. Certification Summary

The Student Domain is certified as the reference implementation for future ERP domains. New domains must follow its layered module structure, DDD boundaries, naming style, test style, and documentation discipline.

This standard does not require every future domain to copy Student behavior. It requires every future domain to copy the architectural shape, dependency direction, and implementation discipline.

## 2. Student Domain Architecture Standard

Every domain must live under a dedicated module folder:

```text
src/modules/<domain>/
```

The required dependency direction is:

```text
presentation -> application -> domain
infrastructure -> domain
```

Rules:

- `domain/` is the core and must not depend on React, SQL, storage engines, HTTP, UI, or infrastructure adapters.
- `application/` orchestrates use cases through commands, queries, DTOs, mappers, and services.
- `infrastructure/` implements adapters, persistence mappers, projections, and repositories declared by the domain.
- `presentation/` contains UI-facing hooks/components and must not contain business rules.
- Cross-cutting services such as logging, auth, cache, events, and configuration must be injected or consumed through contracts.
- Business behavior belongs in aggregates, entities, value objects, policies, specifications, or domain services.

## 3. Student Domain Folder Standard

Every domain module should use this folder layout unless a domain has a documented reason to omit an empty area:

```text
src/modules/<domain>/
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

Each folder that exports public module contracts must include an `index.ts` barrel. The root module `index.ts` may export application contracts and domain contracts, but must not expose implementation details that break module boundaries.

## 4. Student Domain Coding Standard

General coding rules:

- Prefer explicit TypeScript interfaces for command, query, DTO, repository, and snapshot shapes.
- Use private constructors for aggregates when creation must pass through factory methods.
- Keep aggregate state private and expose read-only getters.
- Never mutate aggregate collections from outside the aggregate.
- Return defensive copies for mutable platform objects such as `Date`.
- Freeze immutable domain objects after validation.
- Use `NotImplementedError` for skeleton placeholders instead of fake behavior.
- Keep comments sparse and useful; domain methods should read through naming and tests.
- Avoid SQL, HTTP, UI, or storage details inside domain code.

State and lifecycle rules:

- Aggregates must protect invariants before mutating state.
- Invalid state transitions must throw immediately.
- Lifecycle methods must update version and last-modified timestamps.
- Lifecycle methods must record history when status changes.
- Business methods must raise domain events for meaningful domain changes.

## 5. Student Domain Naming Standard

Required naming patterns:

- Module folders use lowercase domain names: `student`, `teacher`, `financial`.
- Aggregate roots use singular PascalCase nouns: `Student`.
- Value objects use PascalCase nouns: `StudentNumber`, `NationalId`, `FullName`.
- Domain entities use PascalCase nouns: `Enrollment`, `GuardianLink`, `StatusHistory`.
- Domain events use past-tense PascalCase names: `StudentRegistered`, `StudentEnrolled`, `GuardianAssigned`.
- Repository interfaces use `I<Name>Repository`: `IStudentRepository`.
- Read model repositories use `I<Name>ReadRepository`: `IStudentReadRepository`.
- Application commands use verb-object names ending in `Command`: `RegisterStudentCommand`.
- Application queries use verb-object names ending in `Query`: `GetStudentByIdQuery`.
- DTOs use object names ending in `Dto`: `StudentDto`, `EnrollmentDto`.
- Policies use business concept names ending in `Policy`: `AdmissionPolicy`.
- Specifications use business rule names ending in `Specification`: `StudentAgeSpecification`.
- Presentation hooks use React hook naming: `useStudent`, `useStudentSearch`.

Use primitive strings only for identifiers or fields that do not yet have a domain value object. If a value object exists, method signatures and aggregate state must use it.

## 6. Student Domain Aggregate Standard

Aggregate roots must:

- Be the only entry point for strongly consistent changes inside the aggregate boundary.
- Own child entities that cannot be safely changed independently.
- Use factory methods for valid creation, such as `register(...)`.
- Provide a `rehydrate(...)` factory for trusted persistence restoration.
- Track `version` for optimistic concurrency.
- Track `lastModified`.
- Maintain a private domain-event collection.
- Expose `pullDomainEvents()` and `clearDomainEvents()`.
- Reject invalid state transitions.
- Reject mutations in terminal states unless the transition is explicitly allowed.
- Update internal history for lifecycle transitions.

The Student aggregate reference boundary contains:

- `Student`
- `GuardianLink`
- `Enrollment`
- `StatusHistory`

Future domains must define their aggregate boundary explicitly before implementing behavior.

## 7. Student Domain Value Object Standard

Value objects must:

- Extend or conform to the `ValueObject<TSerialized>` contract.
- Validate constructor input.
- Normalize input into one canonical representation.
- Be immutable after construction.
- Implement `equals(other)`.
- Implement `toJSON()`.
- Implement `toString()`.
- Compare equality using normalized values, not raw input.
- Reject invalid values immediately.

Value objects are mandatory for domain concepts with validation, normalization, equality, or formatting rules. Examples from Student:

- `StudentNumber`
- `NationalId`
- `FullName`
- `PhoneNumber`
- `EmailAddress`
- `Address`
- `BirthDate`
- `BloodType`
- `Gender`

## 8. Student Domain Event Standard

Domain events must:

- Represent completed facts using past-tense names.
- Implement a domain event interface with `eventId`, aggregate identifier, `occurredAt`, and optional `aggregateVersion`.
- Be immutable after construction.
- Carry only event-relevant data.
- Be raised by aggregate methods after successful mutation.
- Be collected inside the aggregate until pulled by application/infrastructure orchestration.

Event naming examples:

- `StudentRegistered`
- `StudentEnrolled`
- `StudentActivated`
- `StudentTransferred`
- `StudentSuspended`
- `StudentReactivated`
- `StudentGraduated`
- `StudentWithdrawn`
- `StudentArchived`
- `GuardianAssigned`
- `GuardianRemoved`

Future domains must avoid imperative event names such as `RegisterStudent` or technical event names such as `StudentRecordUpdated`.

## 9. Student Domain Repository Standard

Repository contracts belong in `domain/repositories`.

Rules:

- Domain repositories return aggregates, entities, or domain-level read contracts.
- Infrastructure repositories implement domain repository interfaces.
- Repository interfaces must be persistence-agnostic.
- Save methods that persist aggregates should accept an expected version when optimistic concurrency matters.
- Read repositories should return read models and search result shapes, not aggregates.
- Repository contracts must not expose SQL, table names, HTTP details, or storage-specific records.

Student examples:

- `IStudentRepository` handles aggregate persistence.
- `IStudentReadRepository` handles read models and search criteria.
- `IEnrollmentRepository` handles enrollment lookup contracts.
- `IGuardianRepository` handles guardian link lookup contracts.

## 10. Student Domain Policy Standard

Policies express business decisions that may vary by institution, regulation, or workflow.

Rules:

- Place policy interfaces in `domain/policies`.
- Name policies after business concepts.
- Keep policy contracts small and explicit.
- Do not embed persistence or UI concerns in policy interfaces.
- Use policies when a rule is business-configurable or needs independent replacement.

Student examples:

- `AdmissionPolicy`
- `PromotionPolicy`
- `TransferPolicy`
- `GraduationPolicy`

## 11. Student Domain Specification Standard

Specifications express reusable boolean business rules.

Rules:

- Place specifications in `domain/specifications`.
- Use the `Specification<T>` shape with `isSatisfiedBy(candidate: T): boolean`.
- Keep specifications deterministic and side-effect free.
- Use specifications for reusable validation and eligibility rules.
- Do not perform persistence writes or UI actions in specifications.

Student examples:

- `StudentAgeSpecification`
- `GuardianSpecification`
- `EnrollmentSpecification`

## 12. Student Domain Application Layer Standard

The application layer must:

- Define commands for write use cases.
- Define queries for read use cases.
- Define DTOs for application-facing data transfer.
- Provide application services as orchestration boundaries.
- Avoid domain business logic.
- Call domain aggregates, domain services, policies, repositories, and infrastructure through contracts.
- Handle transactions, mapping, validation coordination, authorization checks, logging, and event publication orchestration.

Application services may be skeletons during early phases, but skeletons must throw `NotImplementedError` instead of pretending to work.

## 13. Student Domain Infrastructure Layer Standard

The infrastructure layer must:

- Implement domain repository contracts.
- Convert persistence records through mappers.
- Own projections and read model persistence.
- Depend inward on domain contracts and domain models.
- Keep storage details out of domain and application contracts.

Skeleton infrastructure must remain explicit and fail fast with `NotImplementedError` until real persistence behavior is implemented.

## 14. Student Domain Presentation Layer Standard

The presentation layer must:

- Contain hooks and components only.
- Depend on application services or application-facing contracts.
- Never enforce domain invariants.
- Never write directly to repositories, SQL, or infrastructure adapters.
- Use skeleton hooks with `NotImplementedError` until real UI flows are implemented.

No UI may be introduced during pure domain phases.

## 15. Student Domain Testing Standard

Tests must be organized by layer:

```text
src/modules/<domain>/tests/
├── application/
├── domain/
├── infrastructure/
└── presentation/
```

Domain tests are mandatory for:

- Value-object construction.
- Value-object invalid input rejection.
- Value-object normalization.
- Value-object equality.
- Serialization and string conversion.
- Aggregate factory methods.
- Valid aggregate lifecycle transitions.
- Invalid transition rejection.
- Invariant protection.
- Domain event collection and clearing.
- Version updates.
- Last-modified behavior when relevant.
- History updates when lifecycle state changes.

Focused tests should be runnable independently from the full project so a domain can be verified even when unrelated project areas have existing failures.

## 16. Documentation Standard

Each domain phase must produce a report when it establishes durable architecture or behavior.

Student reference documents:

- `docs/domain/student-domain-analysis.md`
- `docs/domain/student-domain-official-architecture.md`
- `docs/domain/student-domain-enterprise-v2.md`
- `docs/domain/student-domain-skeleton-report.md`
- `docs/domain/value-objects-report.md`
- `docs/domain/student-aggregate-report.md`

Markdown documents must have balanced code fences and a clear ending. Generated architecture documents must not include unfinished examples.

## 17. Project-Wide Standards Extracted From Student

The following Student Domain patterns are now project-wide standards:

- Modular domain folder per bounded context.
- Strict dependency direction toward the domain.
- Aggregate-root controlled mutation.
- Value objects for validated domain concepts.
- Past-tense immutable domain events.
- Repository interfaces in the domain layer.
- Infrastructure adapters outside the domain layer.
- Application services as orchestration, not business logic.
- Policies for replaceable business decisions.
- Specifications for reusable boolean rules.
- Read repositories separated from aggregate repositories.
- Focused domain tests independent from full app health.
- Phase reports for major architecture milestones.
- Logical commits for large domain phases.

## 18. Certification Checklist For Future Domains

A future domain is not certified until:

- Folder structure matches this standard.
- Domain layer has no UI, SQL, HTTP, or framework dependencies.
- Aggregates protect invariants and own consistency boundaries.
- Value objects validate, normalize, serialize, and compare equality.
- Domain events are past-tense immutable facts.
- Repository contracts are persistence-agnostic.
- Application services contain orchestration only.
- Infrastructure implements contracts without leaking storage details inward.
- Presentation code contains no business rules.
- Focused domain tests pass.
- Documentation reports are complete and Markdown renders correctly.

