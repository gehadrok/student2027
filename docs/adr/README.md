# Architecture Decision Records

**Phase:** 4.0 — Enterprise Platform Governance
**Status:** Official — architecture only
**Scope:** Education ERP Platform

**Rule:** Architecture only. No code, SQL, UI, or implementation.

---

## Purpose

Architecture Decision Records (ADRs) capture the material architecture decisions of the Education ERP Platform in a lightweight, immutable, indexed form. Each ADR records the context, the decision, the consequences, and the rationale. ADRs are sequentially numbered and immutable once accepted; corrections are recorded as new ADRs (Versioning Rules VR-05).

Only decisions that already exist in the platform are recorded here. No future or speculative decisions are invented.

---

## Index

| ADR | Title | Status |
|---|---|---|
| ADR-0001 | Modular Monolith First, Future Microservice Extraction | Accepted |
| ADR-0002 | Domain-Driven Design with Bounded Contexts | Accepted |
| ADR-0003 | Event-Driven Integration via Outbox/Inbox | Accepted |
| ADR-0004 | CQRS with Projections and Read Models | Accepted |
| ADR-0005 | Offline-First with Authoritative Sync | Accepted |
| ADR-0006 | TypeScript and ES6 Modules End-to-End | Accepted |
| ADR-0007 | Persistence Behind IDataSource Abstraction (SQLite Initial) | Accepted |
| ADR-0008 | Mandatory Anti-Corruption Layer for External, Legacy, and AI | Accepted |
| ADR-0009 | Published Language and Open Host Service | Accepted |
| ADR-0010 | Shared Kernel Limited to Stable Primitives | Accepted |
| ADR-0011 | Architecture-First Phased Delivery and Documentation Freeze | Accepted |

---

## ADR Template

Each ADR uses the following structure:

1. **Status:** Accepted / Proposed / Superseded
2. **Date:** YYYY-MM-DD
3. **Context:** The forces and background that led to the decision.
4. **Decision:** The decision itself, stated clearly.
5. **Consequences:** Positive and negative consequences.
6. **Rationale:** Why this decision over alternatives.
7. **References:** Related ADRs, RFCs, and governance documents.

---

*End of ADR Index*

