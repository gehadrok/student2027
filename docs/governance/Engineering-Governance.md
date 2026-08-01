# Engineering Governance

**Phase:** 4.0 — Enterprise Platform Governance
**Status:** Official governance — architecture only
**Scope:** Education ERP Platform — coding standards, review, testing, Definition of Done
**Canonical source:** `docs/governance/Architecture-Governance.md` (principles, dependency rules, naming rules, versioning rules)
**Reference standards:**
- `docs/00-constitution.md`
- `docs/standards/student-domain-standard.md`
- `docs/architecture/bounded-context-map.md`
- `docs/architecture/enterprise-business-interaction-architecture.md`

**Rule:** Architecture only. No implementation introduced by this document.

---

## 1. Purpose

This document defines the engineering standards that all implementation phases must follow: coding standards, module structure, code review, testing, Definition of Done, and quality gates. It operationalizes the Student Domain Standard and the Architecture Governance rules for every domain and every layer.

---

## 2. Technology Baseline

| Concern | Standard |
|---|---|
| Language | TypeScript end-to-end (`ADR-0006`) |
| Module system | ES6 modules |
| UI framework | None per Constitution (HTML5 + CSS3 + ES6). Existing React code is legacy-compatible and must not be extended for new domain work without an ADR. |
| Persistence | Through `IDataSource` abstraction (`ADR-0007`); initial provider SQLite |
| Cross-cutting concerns | Through `src/core/contracts/` interfaces, never direct infrastructure |
| Module layout | Per Student Domain Standard (Section 2) |

---

## 3. Coding Standards

### 3.1 File and Module Rules

- One file per unit of responsibility (Single Responsibility).
- Public contracts exported through `index.ts` barrels at folder level.
- Module root `index.ts` may export application and domain contracts but must not expose implementation details that break boundaries.

### 3.2 TypeScript Rules

- Prefer explicit TypeScript interfaces for commands, queries, DTOs, repository, and snapshot shapes.
- Use private constructors for aggregates when creation must pass through factory methods.
- Keep aggregate state private; expose read-only getters.
- Never mutate aggregate collections from outside the aggregate.
- Return defensive copies for mutable platform objects such as `Date`.
- Freeze immutable domain objects after validation.
- Use `NotImplementedError` for skeleton placeholders instead of fake behavior.
- Keep comments sparse and useful; code should read through naming and tests.

### 3.3 Domain State and Lifecycle Rules

- Aggregates must protect invariants before mutating state.
- Invalid state transitions throw immediately.
- Lifecycle methods update version and last-modified timestamps.
- Lifecycle methods record history when status changes.
- Business methods raise domain events for meaningful domain changes.

### 3.4 Value Object Rules

Value objects must validate constructor input, normalize to one canonical representation, be immutable, implement `equals(other)`, `toJSON()`, and `toString()`, and reject invalid values immediately.

---

## 4. Module Structure Standard

Every domain module follows:

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

Dependency direction is enforced: `presentation -> application -> domain`, `infrastructure -> domain`.

---

## 5. Layer Responsibilities

| Layer | Responsibilities | Forbidden |
|---|---|---|
| `domain/` | Aggregates, entities, value objects, events, policies, specifications, repository contracts, domain services | React, SQL, HTTP, UI, infrastructure adapters |
| `application/` | Orchestration, commands, queries, DTOs, mappers, services | Business logic, persistence details |
| `infrastructure/` | Adapters, persistence mappers, projections, repository implementations | Domain decisions, business rules |
| `presentation/` | Hooks, components | Business rules, repository/SQL writes |

---

## 6. Code Review

Every change must pass review before merge:

- Dependency direction compliance.
- Naming rules compliance (canonical in Architecture Governance §4).
- No cross-context repository access.
- Events are past-tense immutable facts.
- Value objects validate and normalize.
- Application services contain orchestration only.
- No bypass of `src/core/contracts/`.
- Tests are focused and independent.
- No introduction of unapproved libraries or frameworks.

---

## 7. Testing Standard

Tests are organized by layer:

```text
src/modules/<domain>/tests/
├── application/
├── domain/
├── infrastructure/
└── presentation/
```

Mandatory domain tests:

- Value-object construction, invalid-input rejection, normalization, equality, serialization, string conversion.
- Aggregate factory methods.
- Valid lifecycle transitions.
- Invalid transition rejection.
- Invariant protection.
- Domain event collection and clearing.
- Version updates and last-modified behavior.
- History updates on lifecycle changes.

Focused tests must be runnable independently from the full project so a domain can be verified even when unrelated project areas have existing failures.

Integration/contract tests are required for published contracts before they are released (Backward Compatibility Rules BC-06).

---

## 8. Definition of Done (DoD)

A task is complete only when all of the following hold:

- Files are created/modified exactly as required by the task.
- No unauthorized library or framework is introduced.
- Naming and dependency rules are followed.
- The primary scenario is verified (manual or automated) without console errors.
- Domain tests pass for the changed area.
- No Arabic text is broken (encoding) or has wrong direction (LTR instead of RTL).
- No architecture rule is violated.
- The task does not exceed its scope.

---

## 9. Quality Gates

| Gate | Requirement |
|---|---|
| Compile | TypeScript compiles without errors |
| Lint | Naming and structural rules enforced |
| Tests | Focused domain tests pass |
| Contract tests | Published contract tests pass before release |
| Review | Architecture-compliant review completed |
| Compliance | Phase compliance report recorded |

---

## 10. Certification Checklist

- [ ] Coding standards defined.
- [ ] Module structure standard defined.
- [ ] Layer responsibilities defined.
- [ ] Code review criteria defined.
- [ ] Testing standard defined.
- [ ] Definition of Done defined.
- [ ] Consistent with Student Domain Standard.
- [ ] Consistent with Architecture Governance.
- [ ] No code, SQL, UI, or implementation introduced.

---

*End of Engineering Governance*

**Next:** Data governance (ownership, classification, retention) and Integration governance (published contracts, error codes, events).

