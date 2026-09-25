# Kayan School ERP — Product Owner Final Decisions (D1–D9)

> **Status:** FINAL — approved by Product Owner.
> **Product:** Kayan School ERP by Kayan Soft (generic, installable, sellable school-management product; **not** a system private to Al-Salam).
> **Supersedes:** the `NOT DECIDED` status previously recorded in `docs/KAYAN_SCHOOL_ERP_R4_2_BUSINESS_DECISIONS.md`.
> **Companion docs updated to reflect this:** R4.2 (decision status), R4.3 (target architecture gate), PostgreSQL Implementation Readiness Gate (reclassification).
> **This document is the authoritative source for D1–D9.** Where any other document conflicts with the text below, the Product Owner decision below wins and the conflict is logged (see Readiness Gate §Conflict/Reclassification Log).

## Decision Summary

| ID | Topic | FINAL Decision (short) |
|---|---|---|
| D1 | Offline Policy | Online-first; no sync engine in v1; browser cache UX-only. |
| D2 | Database / Deployment | Per-school independent PostgreSQL; SQLite/sql.js transitional only. |
| D3 | School Identity | v1 = one client school per deployment; School/Organization is a formal domain concept; no mixed data; multi-school/tenant future. |
| D4 | Auth / RBAC | Server-side auth; no `password_hash` in browser; RBAC `Role→Permission→Resource→Action→School Scope`; server-side authorization. |
| D5 | Data Migration | Preserve Al-Salam data; copy/transform/validate/import; backup + reconciliation report; do not delete SQLite until verified. |
| D6 | Configuration | No fixed Al-Salam/Yemen defaults in product identity; School Configuration for school-specific values. |
| D7 | RPO / RTO | Official PostgreSQL backup/restore in v1; manual client backup not the final solution; details later; **does not block PG start**. |
| D8 | Kayan Soft Support | Kayan develops/supports; Audit Logs + Diagnostics + Health/Version required; no hidden remote access; future remote must be explicit/authorized. |
| D9 | Product Editions | Single Enterprise-capable product foundation; no code forks (Basic/Pro/Enterprise); feature flags/config for future tiers. |

---

## D1 — Offline Policy (FINAL)

**Decision:** Online-first. PostgreSQL + REST API + Server is the source of truth. We do **not** build an Offline Sync Engine in v1. Browser caching may exist only to improve UX, but it is **not** a data source and must not allow independent data conflicts. Offline-first / multi-master sync is deferred to a future release.

**Maps to R4.2:** Decision 1 → Option A (Online-only) adopted.
**Architecture impact:** No sync engine; connectivity layer shows offline state; browser cache is non-authoritative. (R4.3 §14, Readiness Gate #20.)
**Unblocks:** Gate #20 (was BLOCKED on D1).

## D2 — Database / Deployment Topology (FINAL)

**Decision:** School-specific PostgreSQL deployment in v1. Each client school gets an independent PostgreSQL database and independent runtime environment. No Multi-Tenant shared database in v1. Schema must be designed so it can evolve to Multi-Tenant later if needed. SQLite/sql.js is transitional only, **not** the final production database.

**Maps to R4.2:** Decision 2 → Option A (per-school independent PostgreSQL) adopted.
**Architecture impact:** Per-school PG; `DataSourceFactory` selects `postgresql`; schema portable to future tenant model. (R4.3 §3/§4/§5, Readiness Gate #2/#22.)
**Unblocks:** Gate #2, #22 (were BLOCKED on D2).

## D3 — School Identity / Multi-School (FINAL)

**Decision:** In v1 each deployment represents one client school. School/Organization must be a formal concept in the domain and database even if each deployment hosts a single school. Mixing two schools' data in the same v1 database is forbidden. Multi-school / multi-tenant within one deployment is deferred.

**Maps to R4.2:** Decision 3 → single-school V1, designed for future, adopted.
**Architecture impact:** No `school_id`/`tenant_id` columns in v1 tables (single-school-per-DB); a `schools`/`organizations` configuration entity exists for identity/branding; future tenancy adds a context boundary only. (R4.3 §3/§12/§22, Readiness Gate #12.)
**Unblocks:** Gate #12 (was BLOCKED on D3) → becomes DESIGN_REQUIRED (design the School/Organization concept, not a business block).

## D4 — Authentication / Authorization / RBAC (FINAL)

**Decision:** Authentication moves to Server/API. No client-side authentication and no localStorage credentials as a security source. `password_hash` must never be sent to or stored in the browser. Real RBAC: `Role → Permission → Resource → Action → School Scope`, authorization server-side. Design must allow custom roles/permissions per school in the future.

**Maps to R4.2:** Decision 4 → full RBAC + server-side auth, no `password_hash` in browser, adopted.
**Architecture impact:** `AuthService` stops selecting/storing `password_hash`; token/session server-side; permission model replaces `role==='admin'`. (R4.3 §9/§10, Readiness Gate #10/#11.)
**Unblocks:** Gate #10, #11 (were BLOCKED on D4).

## D5 — Data Migration / Al-Salam Data (FINAL)

**Decision:** Current Al-Salam data must be preserved and not deleted. Al-Salam is a Customer/Migration Source, not product identity. Migration is copy/transform/validate/import (non-destructive). Take a backup before migration. Produce a reconciliation report: source count → imported count → rejected count → transformed count → validation result. Do not delete SQLite/browser data until PostgreSQL is verified.

**Maps to R4.2:** Decision 5 → Preserve (migrate) with archive + rollback, adopted.
**Architecture impact:** Non-destructive pipeline; Al-Salam migrated as ordinary Customer Data into its own PG; rollback path. (R4.3 §15/§16, Readiness Gate #16/#17.)
**Unblocks:** Gate #16, #17 (were BLOCKED on D5).

## D6 — Configuration Defaults (FINAL)

**Decision:** No fixed commercial defaults named Al-Salam / Al-Dhale / Yemen / YER / Asia/Aden inside product identity. Kayan School ERP is the generic product. School name, country, currency, timezone, language, logo, contact, etc. are School Configuration. Generic technical defaults may exist but are not a specific school's identity.

**Maps to R4.2:** Decision 6 → generic defaults + School Configuration, adopted.
**Architecture impact:** `ConfigService`/defaults become generic; school-specific values move to School Configuration (DB). (R4.3 §11/§12, Readiness Gate #13.)
**Does NOT block PG implementation** (per Product Owner): configuration is data, separable from the engine.

## D7 — RPO / RTO (FINAL)

**Decision:** v1 needs an official PostgreSQL backup/restore. Manual client backup is not the final production solution. Implementation details to be defined later in Backup/Recovery design, but **D7 is NOT a blocker for starting PostgreSQL implementation**.

**Maps to R4.2:** Decision 7 → per-edition RPO/RTO (values TBD), adopted with the explicit note that it does not block PG start.
**Architecture impact:** Design PG so it is not dependent on a single copy; backup/restore implemented before go-live. (R4.3 §17, Readiness Gate #18.)
**Does NOT block PG implementation.**

## D8 — Kayan Soft Support Model (FINAL)

**Decision:** Kayan Soft develops and supports the product. The system must include Audit Logs, Diagnostics, and Health/Version information to help support. No hidden Remote Access / Remote Control. Any future remote-support mechanism must be explicit and authorized by the client.

**Maps to R4.2:** Decision 8 → controlled, audited support access, adopted.
**Architecture impact:** Centralized audit + diagnostics + version tracking; no backdoor. (R4.3 §18/§19, Readiness Gate #19.)
**Does NOT block PG implementation.**

## D9 — Product Editions (FINAL)

**Decision:** Start with a single Enterprise-capable product as the architectural foundation: Kayan School ERP. Do **not** create separate technical forks (Basic/Pro/Enterprise) that cause code divergence now. Feature flags / configuration may later activate tiers or commercial add-ons.

**Maps to R4.2:** Decision 9 → tiers, adopted with the explicit constraint of no code fork.
**Architecture impact:** Single codebase; no per-school fork; editions via configuration/feature flags. (R4.3 §20, Readiness Gate #13.)
**Does NOT block PG implementation.**

---

## Sign-off

- **Recorded by:** OpenCode agent (documentation only; no production code modified).
- **Authority:** Product Owner final decisions D1–D9 as provided.
- **Next step:** PostgreSQL implementation may now proceed through the staged PG-0…PG-n plan (see Readiness Gate EXECUTION ORDER), gated by per-stage acceptance and rollback, beginning with PG-0 (PostgreSQL DataSource + UnitOfWork + DataSourceFactory + `password_hash` removal).
