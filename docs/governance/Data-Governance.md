# Data Governance

**Phase:** 4.0 — Enterprise Platform Governance
**Status:** Official governance — architecture only
**Scope:** Education ERP Platform — data ownership, classification, privacy, retention, migration, backup, lineage
**Canonical source:** `docs/governance/Architecture-Governance.md`
**Reference standards:**
- `docs/architecture/bounded-context-map.md` (source-of-truth ownership)
- `docs/architecture/enterprise-business-interaction-architecture.md` (outbox, inbox, projections, audit)
- `migrations/001_master_data.sql`, `src/lib/db/schema.sql` (current persistence conventions)
- `docs/governance/Security-Governance.md`, `docs/governance/Backup-Governance.md` — *Note: backup policy is consolidated in Data-Governance §8 in this documentation set.*

**Rule:** Architecture only. No implementation introduced by this document.

---

## 1. Purpose

This document defines how data is owned, classified, protected, retained, migrated, and backed up across the Education ERP Platform. It aligns physical persistence with the Bounded Context Map: each concept has a single source of truth owned by exactly one context, and cross-context data flows only through published contracts, events, and projections.

---

## 2. Data Ownership

| Domain / Context | Owns (Source of Truth) |
|---|---|
| Academic | Academic years, terms, stages, grade levels, sections, curriculum, subjects, course assignments, calendar, schedule |
| Student | Student identity, lifecycle, enrollment decisions, guardianship links |
| Teacher | Teacher identity, employment teaching profile, qualifications, availability |
| Attendance | Attendance sessions, marks, absence facts |
| Assessment | Assessment plans, marks, gradebooks, results |
| Certificate | Certificates, transcripts, issuance/void records |
| Finance | Student accounts, invoices, payments, discounts, refunds |
| Library | Catalog, borrowings, reservations, fines |
| Identity | User accounts, credentials, sessions, identity links |
| Notification | Templates, messages, delivery attempts, preferences |
| Workflow | Workflow instances, tasks, approvals |
| Security | Roles, permission sets, access policies, security audit |
| Reporting | Report definitions, runs, dashboards, exports, projections |
| AI | Insight requests, recommendations, model runs, assistant conversations |

Rules:

- A concept's source of truth is never duplicated as authoritative in another context.
- Downstream contexts keep local projections only; projections are eventually consistent unless a contract states otherwise.
- No context writes to another context's tables.
- Master data reference values (stages, grade levels, statuses, types) are reference data with stable keys and codes, as seeded in `001_master_data.sql`.

---

## 3. Data Classification

| Level | Definition | Examples | Handling |
|---|---|---|---|
| Public | Intended for public disclosure | School name, general info | No special controls beyond integrity |
| Internal | School-internal operational data | Schedules, report definitions | Access controlled by role |
| Confidential | Sensitive operational and personal data | Student records, grades, attendance, financial data | Role-based access, audit, encryption at rest |
| Restricted | Highly sensitive / legally protected | National IDs, health notes, credentials, passwords | Highest protection: encryption, strict ACL, audit, retention limits |

PII handling:

- PII is minimized and used only for its stated purpose.
- PII access is logged and auditable (`actor_id`, `actor_role`, `correlation_id`, `trace_id`).
- PII is encrypted at rest and in transit.
- PII is never exported to external or AI systems without an approved ACL and consent basis.
- Passwords are stored only as hashes (`HashService`); secrets never in plain text.

---

## 4. Reference Data and Master Data

- Reference data (statuses, types, stages, grade levels, nationalities, etc.) uses stable `id` text keys and normalized `code` values.
- Reference data is idempotently seeded (`INSERT OR IGNORE`) and additive-only.
- Removing or renaming a reference code follows the Deprecation Rules (DPR) and requires a data migration.
- Reference data caches are served through `src/core/cache/` and follow cache invalidation rules.

---

## 5. Audit and Lineage

- Append-only, tamper-evident audit (`audit_logs`, `master_data_audit_log`).
- Audit records carry actor, role, tenant/school scope, correlation ID, trace ID, action, result, and before/after snapshots where relevant.
- Data lineage is reconstructible from the outbox event stream and audit trail.
- Security-sensitive actions (authorization decisions, identity changes, financial changes, certificate actions) require audit even when no domain event is raised.

---

## 6. Retention

| Data Type | Retention Basis | Default |
|---|---|---|
| Student academic records | Legal/ministry requirement | Full academic history; not deleted, archived |
| Financial records | Legal/accounting requirement | Per statutory period |
| Attendance and assessment | Academic continuity | Per academic history |
| Audit logs | Security and compliance | Long-term, append-only |
| Sessions and tokens | Operational | Short TTL; revoked on logout |
| Notifications | Operational | Rolling window with analytics snapshot |
| AI requests/outputs | Governance | Retention with PII minimization and review window |

Deletion and archival rules:

- Hard deletes are limited to clearly transient data.
- Business data uses soft-delete/archive with status history (`archived` terminal states).
- Bulk deletion requires a data migration, an RFC, and audit.
- Anonymization is preferred over deletion where legal retention applies.

---

## 7. Migration Governance

Migration governance is consolidated here. It governs both schema and data changes.

### 7.1 Principles

- Migrations are additive, sequential, versioned, and immutable once applied.
- A migration never reorders, renumbers, or rewrites an already-applied migration.
- Schema changes must be aligned with the owning context and the Bounded Context Map.
- Cross-context tables must never be modified by another context's migration.

### 7.2 Naming

- Migration files: zero-padded sequence + snake_case name, e.g. `001_master_data.sql`, `002_students.sql`.
- Migration content: idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`).

### 7.3 Migration Types

| Type | Example | Review |
|---|---|---|
| Additive schema | New table, new nullable column, new index | Standard review |
| Data | New reference rows, backfill, normalization | Standard review + audit |
| Non-additive schema | Column type change, NOT NULL addition, removal | Full RFC + ADR + data strategy + rollback plan |
| Constraint | New unique/check constraint | Full review + data validation |

### 7.4 Process

1. Draft migration with a clear header comment and category.
2. Review for additive/non-additive classification and ownership.
3. Validate on a copy of production data.
4. Apply in order; record applied version.
5. Verify with smoke tests; update schema baseline (`src/lib/db/schema.sql` is the consolidated baseline).
6. Rollback: use a compensating migration; never edit an applied migration.

### 7.5 Environment Promotion

- Migrations flow `local -> staging -> production` in order.
- A migration applied in one environment is never edited before promotion.

---

## 8. Backup Governance

Backup governance is consolidated here for this documentation set.

### 8.1 Objectives

- RPO (Recovery Point Objective): target ≤ 24 hours for normal operation; tighter for financial/student records where feasible.
- RTO (Recovery Time Objective): target ≤ 4 hours for critical restore.

### 8.2 Backup Types

| Type | Cadence | Purpose |
|---|---|---|
| Full backup | Daily | Complete database restore point |
| Incremental/transactional | Continuous or hourly where supported | Minimal data loss |
| Offsite copy | Daily | Disaster recovery |
| Export snapshots | Weekly | Projection/analytic rebuild source |

### 8.3 Rules

- Backups are encrypted and stored separately from live data.
- Restore is tested on a schedule (minimum quarterly).
- Backup verification checks integrity, not just file existence.
- Backup and restore operations are audited.
- Restores must not silently overwrite newer data; version awareness is required.
- Projections are rebuildable from the outbox/event log; backups protect the source of truth.

---

## 9. Data Dictionary and Standards

- Every persisted entity has a documented purpose, owner context, key fields, and integrity rules.
- IDs use stable text keys for reference data; aggregate records use generated IDs.
- Dates use ISO `TEXT` format consistently.
- Money values use REAL with documented currency rules; base currency is flagged in `currencies` (`is_base`).
- Enum-like fields use `CHECK` constraints in schema and explicit unions in domain code.

---

## 10. Certification Checklist

- [ ] Data ownership is defined per context.
- [ ] Data classification is defined.
- [ ] PII handling is defined.
- [ ] Reference/master data rules are defined.
- [ ] Audit and lineage are defined.
- [ ] Retention is defined.
- [ ] Migration governance is defined (naming, types, process, promotion).
- [ ] Backup governance is defined (RPO/RTO, types, rules).
- [ ] Consistent with Bounded Context Map and Interaction Architecture.
- [ ] No code, SQL, UI, or implementation introduced.

---

*End of Data Governance*

**Next:** Integration governance (published contracts, error codes, events, ACLs).

