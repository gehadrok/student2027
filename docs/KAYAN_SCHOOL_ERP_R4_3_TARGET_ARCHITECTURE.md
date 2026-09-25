# Kayan School ERP R4.3 — Target Architecture

> **Phase:** R4.3 — Target Architecture (READ-ONLY with respect to production).
> **Allowed output:** only this document (`docs/KAYAN_SCHOOL_ERP_R4_3_TARGET_ARCHITECTURE.md`).
> **Not modified:** no production code, Domain, Application, Infrastructure, Repository, API, UI, SQL, schema, migrations, package.json; no PostgreSQL installed; no `pg` added; no migration run; `getRealmDB()`/`saveRealmDB()` not deleted; Authentication/RBAC/Multi-Tenancy not implemented; R4.4 / Phase 6.3 / Phase 7 not started; no `school_id`/`tenant_id` created.
>
> **Authoritative source:** `docs/KAYAN_SCHOOL_ERP_R4_2_BUSINESS_DECISIONS.md`. Where the six sources conflict, R4.2 (Product Owner decisions) wins; conflicts are documented in §23/§27, not resolved silently.
> **Status note:** R4.2's nine decisions are now **FINAL** (see `docs/KAYAN_SCHOOL_ERP_DECISION_RECORD_D1_D9_FINAL.md`). This document describes the **approved target architecture** derived from those FINAL decisions. PostgreSQL implementation is now READY_TO_IMPLEMENT, executed via the staged PG-0…PG-n plan (see §23 and the Readiness Gate). PostgreSQL implementation status is **READY** (see §23).

---

## 1. Product Vision

**Kayan School ERP** is a generic, installable School Management product owned by **Kayan Soft**, designed to be sold, deployed, and operated at many different schools. It is **not** a system private to Al-Salam. The product identity is *Kayan School ERP by Kayan Soft*; every customer school is a separate deployment with its own data, configuration, users, and branding. The vision is realized through a server-authoritative, REST-backed, PostgreSQL-target architecture with a thin browser frontend — replacing the current Al-Salam-coupled, browser-SQLite-authoritative SPA.

---

## 2. Product Boundary

```
Kayan Soft
   ↓
Kayan School ERP (Product)
   ↓
Customer School (Deployment)
   ↓
Campus
   ↓
Academic Structure (Year → Term → Curriculum → Classes)
   ↓
Operational Data (Students, Teachers, Finance, Attendance, …)
```

**Data classes — must never be mixed:**
- **Product Configuration** — Kayan product identity, edition, module entitlements, build version. Same for all customers.
- **Customer Data** — the school's operational records. Isolated per school deployment.
- **Demo Data** — clearly separated evaluation/seed datasets; never merged into production customer data.
- **System Data** — installation ID, `schema_migrations` version, health/diagnostics metadata.
- **Audit Data** — immutable action trail; converges to one server store.
- **Operational Data** — backup status, migration status, runtime logs; per installation.

Rule (intake hard rule 8): Demo/Seed data and Production/Customer data must never be mixed. The current `sqlite-seed.sql` interleaves school-specific demo data with schema — must be separated before any generic install (R4.2 D5, D6).

---

## 3. Customer / School Model

**V1 = School-specific deployment.** Each customer school receives:
- an **independent PostgreSQL database**,
- **independent configuration** (school name, logo, locale, currency, academic year, …),
- **independent users** (its own auth store),
- **independent operational data**,
- **independent backups** (per-school RPO/RTO).

This matches R4.2 Decision 2 (Option A — per-school independent PostgreSQL, recommended) and Decision 3 (single-school V1).

**Forward-compatible design:** the Domain layer must not hardcode school identity. Repositories are isolated per datasource; a future `school_id`/tenant context is introduced only at the connection/seed boundary — **not** by retrofitting `school_id` into every domain table today. This allows a future Multi-Tenant SaaS evolution (§22) without a Domain rewrite.

---

## 4. Deployment Model

**Target production topology:**
```
Frontend (browser SPA)
   ↓  HTTPS / REST only
Backend / API (Express)
   ↓
PostgreSQL (per-school database)
```

- **No direct browser → PostgreSQL connection.**
- **No browser SQLite as source of truth.**
- The browser is a display/input terminal; the API is the only data-access path.

---

## 5. PostgreSQL Target Architecture

**PostgreSQL is the Production Database Target** (single source of truth).

**SQLite / sql.js role:**
- *transitional* (migration bridge),
- *development / testing / local fallback* when needed.

SQLite is **not** the final production database. This aligns with R4.2 D2 (per-school PG) and the migration-audit §7.4. The async `IDataSource` seam already exists; `PostgreSQLDataSource` will implement it behind `DataSourceFactory` (technical prerequisite — see §23).

---

## 6. Backend/API Architecture

The Backend is the **only** layer that accesses operational data.

```
Frontend
   ↓ API client (fetch)
REST API (Express controllers)
   ↓
Application services / use cases
   ↓
Domain
   ↓
Repository (interfaces)
   ↓
PostgreSQL (via IDataSource)
```

This is the target from R4.1 §9 / R4 dual-audit §15. All 28 legacy screens + master-data + dashboard must be rerouted through this path (R4 dual-audit §16). Today only `/api/academic/*` and `/api/ai/*` exist; the remaining ~15 domains need REST endpoints (R4.2 D4 scope, R4.1 §11).

---

## 7. Frontend Architecture

The Frontend **does not own an independent operational database**. The API is the sole data source.

- `getRealmDB()` / `saveRealmDB()` must **not** remain the final source of truth (R4 dual-audit §18 acceptance criteria).
- The browser may keep only: a session token (non-secret claims), and explicitly-classified non-business UI preferences.
- A `RestApiDataSource` (implementing `IDataSource`) is the intended browser-build datasource so `masterDataRepository` and other repos talk to the server, not `sql.js` (R4 dual-audit §16, R4.1 §11).

No screen may touch the database directly.

---

## 8. Data Ownership Model

| Class | Owner | Notes |
|---|---|---|
| **Product-owned** | Kayan Soft | Product identity, edition, module entitlements, build version. |
| **Customer-owned** | Customer School (PostgreSQL) | Students, teachers, classes, grades, attendance, finance, library, documents, certificates, master data, settings. |
| **System-owned** | Platform | Installation ID, `schema_migrations`, health/diagnostics. |
| **Audit-owned** | Platform (immutable) | Audit trail — one server store, converges from the current split (R4 audit §14). |
| **Operational** | Platform/Deployment | Backup status, migration status, logs. |

**Hard rule:** Demo Data is never merged into Customer (Production) Data. Customer data is isolated per school deployment.

---

## 9. Authentication Target Architecture

**Target only — not implemented in R4.3.**

```
Backend Authentication
   → secure session / signed token
   → password hashing (server-side, bcrypt/Argon)
   → refresh / session management
   → logout / revocation
```

Forbidden in the target:
- `password_hash` in `localStorage`,
- client-side authentication as source of truth.

Current defect to be removed: `AuthService` returns `password_hash` into the browser (`AuthService.ts:60` → `localStorage` `al_salam_school_current_user_v1`). Target moves auth server-side with a signed token; the browser caches only `{ userId, name, role, token }` (R4.1 §12, R4.2 D4). No auth implementation occurs in R4.3.

---

## 10. RBAC Target Architecture

**Target only — not implemented in R4.3.**

```
Role → Permission → Resource → Action → School Scope
```

Replaces the current `currentUser.role === 'admin'` inline checks (R4.2 D4, Product Audit §10). The 14 baseline roles from the intake are mapped to permissions/resources/actions with school scope; roles are justified by requirement, not added by list. No RBAC code is written in R4.3.

---

## 11. Configuration Architecture

Clear separation of:
- **Product Defaults** — Kayan product identity only (e.g., product name "Kayan School ERP", edition list).
- **School Configuration** — per-customer DB-stored: school name, logo, address, phone, email, currency, language, timezone, academic year, grading/attendance policy, numbering.
- **User Preferences** — non-sensitive UI state in browser `localStorage` only.
- **Runtime Configuration** — `ConfigService`-style env (DB type, secrets) resolved server-side.

**Forbidden as Production Defaults:** `Al-Salam`, `الضالع`, `جحاف`, `YER`, `Asia/Aden`, `ar` as hardcoded school values. These are today hard-coded in `ConfigService.ts:63,67-69,100,104` and as literal `dir="rtl"` in `App.tsx:146`; they must become School Configuration, not Product Identity (R4.2 D6).

---

## 12. Branding Architecture

- **Product:** Kayan School ERP
- **Company:** Kayan Soft
- **School-specific (Configuration, not Product Identity):**
  - School Name, Logo, Address, Phone, Email
  - Currency, Language, Timezone
  - Academic Year
  - Brand colors / contact

No Al-Salam logo/name in production code except clearly separated demo/seed data (R4 readiness audit §6, R4.2 D6). `index.html` title ("My Google AI Studio App") and `ConfigService.appName` must become "Kayan School ERP".

---

## 13. Localization

- **Arabic-first + RTL** as the primary experience.
- Architectural support for future **Arabic, English, and other languages**.
- UI text and `direction` must **not** remain hard-coded and scattered** (today `dir="rtl"` is literal in `App.tsx:146` and ~40 components). Direction and locale come from School Configuration; a localization/i18n layer resolves strings and layout direction at runtime.

---

## 14. Offline Policy

**V1 = Online-first.**
- On connection loss: show an explicit Offline state; degrade gracefully.
- The local browser DB **does not become** source of truth during outage.
- **No complex sync architecture in V1.**
- A storage/connectivity **abstraction** may be introduced to allow a future offline/sync capability, but sync is not built now (R4.2 D1 — still a business decision; this documents the online-first target).

---

## 15. Data Migration Strategy

Path (target, documented; not executed):
```
Current SQLite (browser + server)
   → classify (Production vs Demo/Seed)
   → validate (row counts, FK integrity, duplicates, orphans)
   → transform (ON CONFLICT, DATE, BOOLEAN, strip triggers)
   → load into PostgreSQL (FK order)
   → verify (reconciliation, checksum, failed-record report)
   → cutover
```
Al-Salam's current data is treated as **Customer Data / Migration Source**, not Product Identity (§16). The pipeline reuses R4.1 §13 / migration-audit §8. No migration runs in R4.3.

---

## 16. Al-Salam Cutover Strategy

- Al-Salam's current system = a **Customer/School deployment** and a **Migration Source**.
- Strict separation: **Product (Kayan School ERP)** vs **Al-Salam Customer Data**.
- The product must not embed Al-Salam identity; Al-Salam data is migrated as ordinary customer data into its own PostgreSQL database.
- **Existing data is NOT deleted** in this phase (hard rule). The browser blob + server file are archived for rollback.

---

## 17. Backup / Restore Architecture

**Target only — not implemented.**
- Automated PostgreSQL backups (scheduled dump / managed snapshot).
- Manual backup (admin-triggered).
- Restore procedure (tested).
- Backup verification (integrity check).
- Retention policy.
- Disaster recovery procedure.
- `schema_migrations` version table.

RPO/RTO values are **not invented** here (R4.2 D7 — business decision). Per-school independence (§3) makes per-customer backup/restore straightforward.

---

## 18. Audit / Diagnostics

**Target only — not implemented.**
- Centralized logging.
- Audit trail (single server store; converges from the current SQL `audit_logs` + `AuditService` localStorage split).
- Health checks.
- Diagnostics endpoints.
- Version information (app + schema migration version).
- Error reporting.

These support the Kayan Soft Support model (§19) and the §2 data-class separation.

---

## 19. Kayan Soft Support Architecture

**Target only — no support tool built.**
The product must be supportable and maintainable via:
- diagnostics,
- safe updates,
- version tracking (app + schema),
- migration tracking,
- backup/restore,
- support tooling (future).

Any Kayan Soft access to a customer's environment must be **explicit, authenticated, authorized, time-limited, audited, revocable** — **no backdoor / remote-access mechanism** (R4.2 D8, intake §10). Whether such access exists is a pending business decision.

---

## 20. Product Editions

**Documented boundaries only — no new modules built.**
Proposed module boundaries:
- Core (config, auth, RBAC, audit, backup)
- Academic
- Student Management
- Attendance
- Exams & Grades
- HR
- Finance
- Inventory
- Transport
- Library
- Communication
- Analytics
- AI

Proposed tiers (indicative): Basic / Professional / Enterprise. Exact bundling and pricing are **commercial decisions** (R4.2 D9) — out of scope to finalize here.

---

## 21. Security Boundaries

```
Browser  ──┐ (session token only; NO password_hash; NO operational DB)
            ↓ HTTPS/REST
API      ──┐ (authn + authz enforcement; input validation)
            ↓
Application ──┐ (use cases; business rules)
               ↓
Domain ───────┐ (entities, aggregates)
               ↓
Database (PostgreSQL) ── operational data, encrypted at rest per deployment
```

- Credentials and production data must **not** be exposed in browser storage.
- `password_hash` must leave the client (§9).
- Server enforces authorization (§10) before any data access.

---

## 22. Future Multi-Tenant Evolution

**V1:**
```
One Customer School → One Deployment → One PostgreSQL Database
```

**Future (not implemented now):**
```
Platform → Tenant → School → Campus
```
The V1 design (per-school independent database, Domain free of `school_id`, repositories isolated per datasource) allows evolution toward Multi-Tenant SaaS **without a Domain rewrite**. Multi-Tenancy is explicitly **deferred**; no `tenant_id`/`school_id` is created in R4.3.

---

## 23. PostgreSQL Migration Gate

Status legend: **READY** = can implement now (no open decision/design block); **DESIGN_REQUIRED** = architectural design needed before code; **FUTURE** = deferred, does not block V1 PG. (Items previously `BLOCKED` are reclassified after D1–D9 became FINAL — see Decision Record and Readiness Gate.)

| Item | Status | Reason | Prerequisite | Blocks PG impl? |
|---|---|---|---|---|
| `IDataSource` async redesign | READY | Pure technical refactor; no business input (R4.1 step 1) | — | No (prereq) |
| Master-data schema | READY | Completed in R3 (33 tables + audit log exist) | — | No |
| Dual database consolidation | READY | D1 (online-first) + D2 (per-school PG) + D5 (copy/validate migration) now FINAL | Decision Record | No (gated by staged plan) |
| Offline policy | DESIGN_REQUIRED | D1 FINAL (online-first, no sync); design connectivity/UX-cache only | Decision Record | No |
| Database / Deployment topology | READY | D2 FINAL (per-school independent PostgreSQL) | Decision Record | No |
| School identity (`school_id`/tenant) | DESIGN_REQUIRED | D3 FINAL (single-school V1; design School/Organization concept, no `school_id` in v1) | Decision Record | No |
| Authentication (server-side) | READY | D4 FINAL (server-side auth; no `password_hash` in browser) | Decision Record | No |
| RBAC (permission model) | READY | D4 FINAL (`Role→Permission→Resource→Action→School Scope`) | Decision Record | No |
| Data migration / cutover | READY | D5 FINAL (preserve; copy/validate/verify; reconciliation) | Decision Record | No |
| Configuration defaults | DESIGN_REQUIRED | D6 FINAL (generic defaults; School Configuration; no fork per D9) | Decision Record (D6/D9) | No (does not block PG) |
| RPO / RTO | FUTURE | D7 FINAL (design backup/restore; details later; does not block PG) | Decision Record | No |
| Kayan Soft Support model | DESIGN_REQUIRED | D8 FINAL (audit + diagnostics + health; no hidden remote) | Decision Record | No |
| Product Editions | DESIGN_REQUIRED | D9 FINAL (single product; feature-flag tiers; no fork) | Decision Record | No |

**Overall PostgreSQL implementation status: READY_TO_IMPLEMENT** — all blocking business decisions (D1–D5) are now FINAL per the Decision Record; D6/D7/D8/D9 explicitly do not block PG start. The target architecture is fully specified and execution proceeds via the staged PG-0…PG-n plan with per-stage acceptance + rollback (updated Readiness Gate).

---

## 24. Implementation Order

Logical order derived from R4.1 §14 and R4.2 (no step executed in R4.3):

1. **Async `IDataSource` contract** (READY — technical; unblocks everything).
2. **Resolve business decisions** (R4.2 §19) — gates the rest.
3. **Server-side Authentication + REST** (gated on D4).
4. **Master-data server route + ownership** (READY — tables exist post-R3).
5. **Explicit migration runner** (idempotent bootstrap).
6. **Reference-data off `querySqlSync`** → async service.
7. **Legacy domain REST rollout** (students, teachers, classes, grades, attendance, finance, library, documents, reports, certificates, audit, settings, notifications) — gated on D5 scope/order.
8. **Browser DB decommission + data migration** — gated on D1/D5.
9. **`PostgreSQLDataSource`** behind `DataSourceFactory`.
10. **Cutover & archive** (gated on D2/D5).
11. **Backup/Restore** implementation (gated on D7).
12. **Product Packaging** (branding/config/installer; gated on D6/D9).

---

## 25. Architecture Acceptance Criteria

- [ ] Kayan School ERP does **not** depend on the name "Al-Salam".
- [ ] PostgreSQL is the **production target**; SQLite is transitional only.
- [ ] Server/API is the **source of truth**; browser has no operational DB.
- [ ] Customer School data is **isolated** per deployment.
- [ ] Authentication is **server-side**; `password_hash` never in browser.
- [ ] RBAC is **permission-based** (`Role→Permission→Resource→Action→School Scope`), not `role === 'admin'`.
- [ ] Multi-Tenant is **deferred** (V1 single-school).
- [ ] V1 is **online-first**.
- [ ] School-specific deployment is the V1 model.
- [ ] Migration strategy is **documented** (§15) and Demo ≠ Production.
- [ ] All 9 R4.2 business decisions are answered before PG cutover.

---

## 26. Explicit Non-Goals

R4.3 explicitly does **not** execute:
- PostgreSQL installation / database creation.
- Authentication implementation.
- RBAC implementation.
- Multi-Tenancy implementation (no `tenant_id`/`school_id`).
- Offline sync engine.
- Support application / remote-access tooling.
- New academic aggregates (Academic Item 2).
- New product modules.
- UI rewrite.
- Database migration / cutover execution.
- Deletion of SQLite / `getRealmDB()` / `saveRealmDB()`.

---

## 27. Conflict Log (R4.2 vs earlier sources)

All six sources are **consistent**; no hard contradiction was found. R4.2 is the authoritative superset. Notable reconciliations (documented, not silently resolved):

- **DB strategy:** R4.2 D2 recommends Option A (per-school PG) — same as Product Audit §8 and R4.1 §8. Consistent.
- **Multi-school:** R4.2 D3 single-school V1 designed for future — same as R4.1 §7/§9. Consistent.
- **Hard-coded locale/currency:** earlier docs recorded `YER`/`Asia/Aden`/`ar` as facts; R4.2 D6 reclassifies them as *not* Production Defaults. R4.3 §11/§12 encodes this reclassification. This is a correction of defaults, not a conflict.
- **RBAC:** R4.2 D4 full permission model matches Product Audit §10 and remediation §15; consistent.
- **Master-data schema:** R3 completed the 33 tables; R4.2 treats them as Customer/School Configuration data, not Product Identity — consistent with R4.1 §10.

No source contradicted R4.2's decisions; therefore no decision was altered.

---

*End of R4.3 Target Architecture. No production code, SQL, schema, UI, package configuration, or PostgreSQL configuration was modified. PostgreSQL implementation, R4.4, Phase 6.3, Phase 7, Authentication, RBAC, and Multi-Tenancy remain out of scope.*
