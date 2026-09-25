# PostgreSQL R4.1 — Dual Database Decision & Target Architecture Specification

> **Phase:** R4.1 (Specification only). **No production code, SQL, schema, migration, UI, test, package configuration, or PostgreSQL configuration was modified to produce this document.** This is a decision + target-architecture specification derived solely from existing repository evidence and the four source documents listed in §1. No business rules or schema have been invented beyond what the repository already implies.
>
> **Source documents:** `docs/POSTGRESQL_R4_DUAL_DATABASE_AUDIT.md` (PRIMARY), `docs/POSTGRESQL_MIGRATION_AUDIT.md`, `docs/POSTGRESQL_MIGRATION_REMEDIATION_PLAN.md`, `docs/POSTGRESQL_R3_MASTER_DATA_SCHEMA_REPORT.md`.
> **Deliverable:** this specification (`docs/POSTGRESQL_R4_1_TARGET_ARCHITECTURE_SPEC.md`) + the final one-line verdict in §19.

---

## 0. Executive Summary

The migration is blocked by the **dual-database architecture**: an authoritative browser-resident `sql.js` database (`localStorage` key `al_salam_school_sqlite_db_v1`) and a separate, never-synchronized server-side SQLite file (`data/al-salam-server.db`). Only the Academic module is served through a real REST API (`/api/academic/*`) backed by the server DB; every other domain (students, teachers, classes, grades, attendance, fees, library, master data, documents, reports, certificates, audit, settings, notifications, auth/session) is written directly to the browser DB.

This document resolves the five architecture/product decisions required to collapse the two stores into a single canonical server-side PostgreSQL. Four of the five decisions contain at least one item that **cannot be derived from the repository** and requires an explicit product/business choice. The document therefore ends (§19) with:

`BLOCKED — BUSINESS/ARCHITECTURE DECISIONS REQUIRED`

The target architecture (§9) and the migration execution order (§14) are fully specified so that, once the business decisions in §15 are answered, implementation can begin immediately without further architectural ambiguity.

---

## 1. Audit Basis & Scope

**Primary basis:** `POSTGRESQL_R4_DUAL_DATABASE_AUDIT.md` — the read-only audit of Blocker 2 (Dual Database Instances). It provides the caller matrix (§6), the data-ownership matrix (§7), the divergence scenarios (§8), REST coverage (§8/§10), the `localStorage` key inventory (§15), and the file-impact list (§16).

**Secondary basis (cross-referenced, not re-audited):**
- `POSTGRESQL_MIGRATION_AUDIT.md` — confirms the synchronous `IDataSource` seam (§2.4, §3.3), the two unsynchronized runtime paths (§2.1), and the data-migration pipeline (§8).
- `POSTGRESQL_MIGRATION_REMEDIATION_PLAN.md` — confirms the intended target architecture (§1, §7), the dual-DB inventory (§6), and the 12 open decisions (§15). This R4.1 collapses those 12 into the 5 decision areas the user specified.
- `POSTGRESQL_R3_MASTER_DATA_SCHEMA_REPORT.md` — confirms that, post-R3, all 33 `TABLE_MAP` master-data tables + `master_data_audit_log` now exist in the canonical runtime schema `src/lib/sqlite-schema.sql` (§1, §2), but they are still reached only through the **browser-local** path (`db.ts` → `SQLiteRepository` → `querySqlSync`); no server REST route serves them. R3 did not change ownership.

**Out of scope (explicitly not decided here):** the synchronous→asynchronous `IDataSource` refactor (covered by the remediation plan §3), `AcademicYear` version/status gaps, and the PostgreSQL wire-protocol/connection details. These are assumed as pre-conditions and referenced where they intersect the dual-DB decision.

**Constraint:** All factual claims below are grounded in the four documents. Where a claim is an assumption rather than a verified fact, it is labeled `[ASSUMPTION]` under the relevant decision's (B) subsection.

---

## 2. Current Dual-Database Architecture (Recap)

Two independent physical databases, no synchronization path:

| Aspect | Browser DB | Server DB |
|---|---|---|
| Engine | `sql.js` (WASM) persisted to `localStorage` (`al_salam_school_sqlite_db_v1`) | SQLite file `data/al-salam-server.db` |
| Access | `getRealmDB()` / `saveRealmDB()` (`src/lib/db.ts`) → `SQLiteRepository` → `querySqlSync`/`runSqlSync` (`src/lib/sqlite-engine.ts`) | REST API (`server.ts`) → Repository → `IDataSource` → `getSQLiteDB()` |
| Authoritative for | 19 legacy collections + master data + dashboard + reference data (28 screens, `MasterDataCenter`, `AdminDashboard`, `useReferenceData`) | Academic module only (`/api/academic/*`) |
| Synchronization | **None** | **None** |
| Consequence | Edits in the SPA are invisible to the server; server data is invisible to the SPA | A naive cutover loses all browser-side data |

Additional facts established by the R4 audit:
- `getRealmDB()` reads all 19 collections in one synchronous pass; `saveRealmDB()` writes them back via N+1 synchronous `runSqlSync` calls (whole-state write model).
- Only `/api/academic/*` and `/api/ai/*` REST routes exist. There is **no** server route for students, teachers, classes, grades, attendance, fees, library, master data, documents, reports, certificates, audit, settings, notifications, or authentication.
- `AuthService` serializes the current user (including `password_hash`) into `localStorage` (`al_salam_school_current_user_v1`) — a credential-exposure finding (R4 §9).
- Audit is split: SQL `audit_logs` (server, academic) vs `AuditService` `localStorage` store (browser). Settings, documents, calendar events, notifications, and saved reports also carry browser `localStorage` keys alongside any server tables.

---

## 3. Decision Framework & Method

Each of the five decisions below is resolved using a fixed structure:

- **(A) Evidence** — what the repository / audit documents prove today (file + section citations).
- **(B) Facts vs Assumptions** — explicit separation; `[FACT]` claims are verified in the audit, `[ASSUMPTION]` claims are not derivable and flag a business question.
- **(C) Architectural Consequence** — what the choice forces in the target design.
- **(D) Recommended Decision** — the technically sound default, derived from existing code/audit, not invented.
- **(E) Business Decision Required** — the specific product choice that cannot be inferred; marked **BUSINESS DECISION REQUIRED** where applicable.
- **(F) Acceptance Criteria** — how we know the decision is resolved and implementable.

A decision is marked **BLOCKED** if its (E) cannot be answered from the repository. The aggregate verdict (§19) is BLOCKED if any decision is BLOCKED.

---

## 4. Decision 1 — Offline Policy

**(A) Evidence**
- Browser DB is the authoritative store for 28 screens + `MasterDataCenter` + `AdminDashboard` + `useReferenceData` (R4 §6, remediation §6.2).
- All browser writes are synchronous and local; there is no network/connectivity abstraction and no sync layer (R4 §4, §7).
- The server DB is reachable only via the Academic REST API today; no other domain has a server path (R4 §8/§10).

**(B) Facts vs Assumptions**
- `[FACT]` Two independent DBs; no sync; all non-academic writes are local.
- `[FACT]` The app currently functions as an online-or-local single-machine SPA; there is no offline/field-use code path.
- `[ASSUMPTION]` Whether the product *requires* offline or intermittently-connected operation (e.g., attendance capture in a classroom with no Wi-Fi) is **not stated anywhere in the repository or docs**. This is the open business question.

**(C) Architectural Consequence**
- *Server-only (online):* smallest complexity; single source of truth; all screens depend on REST + network. Browser keeps only a non-authoritative UI read-cache.
- *Offline-capable:* requires a bidirectional sync engine (change tracking, conflict resolution, offline write queue, last-write-wins or merge policy) layered between the SPA and the server — a major, separate workstream that directly conflicts with the "single source of truth" goal and multiplies the PostgreSQL cutover risk.

**(D) Recommended Decision**
Adopt **server-only canonical storage with no offline business cache**, consistent with the remediation target architecture (remediation §1, §6.3, §7) and the migration-audit target (migration-audit §7.4). The browser may keep a transient, non-authoritative read-cache for UI responsiveness, but never an authoritative or writable copy of business data. This preserves single-source-of-truth and keeps the PostgreSQL migration tractable.

**(E) Business Decision Required**
**BUSINESS DECISION REQUIRED:** Does the product require offline or intermittently-connected operation for any domain (e.g., attendance, grades entry in non-networked classrooms)? 
- If **No** → proceed server-only (recommended).
- If **Yes** → an offline+synchronization workstream must be separately scoped, estimated, and funded before PostgreSQL cutover; it is out of scope of this specification.

**(F) Acceptance Criteria**
- A written, signed offline requirement (or an explicit "online-only" decision recorded in §18).
- If online-only: zero business tables/collections persisted in browser `localStorage`/`sql.js` after migration; all writes flow through REST.
- If offline-required: an approved sync design (conflict policy, queue, reconciliation) exists before implementation starts.

---

## 5. Decision 2 — Data Ownership

**(A) Evidence**
- Server DB currently owns only the Academic module (R4 §2, §8). 
- Browser DB owns the other 19 collections + master data + dashboard + reference data (R4 §6/§7).
- Post-R3, the master-data tables exist in the *runtime schema* used by both browser and server bootstrap, but they are served only through the browser-local `masterDataService` path; no `/api/master-data` route exists (R3 report §1, §8).
- Remediation §7 already proposes a canonical ownership model: all business domains server-owned; auth session browser-cached only.

**(B) Facts vs Assumptions**
- `[FACT]` Academic is already server/REST-owned and works end-to-end.
- `[FACT]` Master-data tables are structurally present in the schema used by both DBs but only written from the browser today.
- `[FACT]` `audit_logs`, `school_settings`, `saved_reports`, `app_notifications` exist as server tables but are also written from the browser (dual-writer / split ownership).
- `[ASSUMPTION]` Whether any data class is intentionally *browser-only by design* (e.g., purely local UI preferences or in-progress draft reports) is **not documented**.

**(C) Architectural Consequence**
Every business domain must be re-homed to the server PostgreSQL as the single owner. The browser becomes a display/input terminal only. This forces REST endpoints for each domain (Decision 5) and removes all `saveRealmDB` business call sites (remediation §8). Master-data tables must be brought under the server schema/bootstrap (already structurally present post-R3; needs a server route + seeding decision, see Decision 5 and R3 report §8).

**(D) Recommended Decision**
Single canonical ownership: **server PostgreSQL owns all business domains**; the browser `localStorage`/`sql.js` holds only (a) an auth session cache (user id, display name, role, token — never secrets) and (b) explicitly-classified non-business UI preferences. This matches remediation §7 and migration-audit §7.4. The generic master-data CRUD must stop being a second writer of Academic status columns (remediation §11.3).

**(E) Business Decision Required**
**BUSINESS DECISION REQUIRED (mostly confirmational):** Confirm there is no regulatory, privacy, or edge-case requirement for any business data to remain browser-local. Explicitly classify which (if any) `localStorage` keys are non-business UI state vs business data. (If the answer is "none business," the technical recommendation stands and this item is effectively resolved on confirmation.)

**(F) Acceptance Criteria**
- A signed data-ownership matrix (§10) covering every domain and every `localStorage` key identified in R4 §15.
- Every business domain maps to an owning server repository + REST route.
- Zero business write paths remain in the browser after migration.

---

## 6. Decision 3 — Session & Credential Strategy

**(A) Evidence**
- `AuthService` persists the current user object — including `password_hash` — into `localStorage` (`al_salam_school_current_user_v1`) (R4 §9).
- `ConfigService.loadDatabaseConfig()` hardcodes an insecure JWT secret and encryption key (migration-audit §12, §13 risk #12).
- Authentication today is performed client-side against the browser-resident `users` table (R4 §6/§9); there is no server auth/verify endpoint in the REST surface (R4 §8/§10 lists only `/api/academic/*` and `/api/ai/*`).
- `getCurrentUser`/`setCurrentUser` (`src/lib/db.ts`) are used by `App.tsx` for session continuity (remediation §6.2).

**(B) Facts vs Assumptions**
- `[FACT]` `password_hash` is serialized to browser `localStorage`.
- `[FACT]` No server-side credential validation / token issuance endpoint exists today.
- `[FACT]` JWT/encryption secrets are hardcoded insecure defaults in `ConfigService`.
- `[ASSUMPTION]` The desired session mechanism (HttpOnly cookie vs bearer token), token lifetime/refresh policy, and any SSO/2FA requirement are **not specified in the repository**.

**(C) Architectural Consequence**
Authentication must move server-side: validate credentials against the server `users` table, issue a signed token, and **never transmit `password_hash` to the client**. The browser session cache holds only non-secret claims (user id, name, role) + token. Requires new server auth endpoints (part of Decision 5 scope) and token-verification middleware on protected routes. Secrets must become env-driven (migration-audit §12).

**(D) Recommended Decision**
Server-side authentication with a signed token; browser stores only opaque session claims (no `password_hash`, no secret material). Rotate the hardcoded `ConfigService` secrets and move them to env/secret-store. This is the only design compatible with single-source-of-truth and with removing the browser DB (Decisions 1–2).

**(E) Business Decision Required**
**BUSINESS DECISION REQUIRED:** 
1. Session transport — HttpOnly secure cookie vs. bearer token in `localStorage`? 
2. Token lifetime and refresh policy?
3. Are SSO / 2FA / role-based access-control requirements in scope for the initial PostgreSQL cutover?

**(F) Acceptance Criteria**
- No credential material (`password_hash` or equivalent) persists in browser storage.
- Login is validated server-side; a signed token gates protected REST routes.
- `ConfigService` secrets are env-driven and rotated; no hardcoded defaults in production config.

---

## 7. Decision 4 — Existing SQLite Data Migration

**(A) Evidence**
- The browser `localStorage` `sql.js` blob holds all business data entered through the 28 screens + master-data UI (R4 §3, §6, §7).
- The server `data/al-salam-server.db` is bootstrapped from the same `sqlite-schema.sql` + `sqlite-seed.sql` (migration-audit §2.2) but is **not written by any SPA screen** — only the Academic REST API touches it.
- Two divergent physical copies therefore exist (R4 §7, migration-audit §13 risk #2).
- A data-migration pipeline (export → normalize → load in FK order → validate) is already specified for the server→PostgreSQL move (migration-audit §8).

**(B) Facts vs Assumptions**
- `[FACT]` Browser `localStorage` contains live, user-entered business data.
- `[FACT]` Server DB contains seeded/legacy tables but is not the live write target for non-academic domains.
- `[ASSUMPTION]` Which copy is "newer"/authoritative per domain is **not automatically knowable**; typically the browser copy is the live one, but this is not documented.
- `[ASSUMPTION]` Whether the existing browser data is **production data that must be preserved** or disposable demo/test data is **not stated**.

**(C) Architectural Consequence**
Before the browser DB is decommissioned (Decision 1–2), its data must be exported and loaded into server PostgreSQL, or explicitly discarded. If discarded, all entered data is lost at cutover. This requires a one-time browser→server export utility and a load order respecting FKs (migration-audit §8 step 3).

**(D) Recommended Decision**
Build a one-time migration utility: export the browser `sql.js` blob → transform (`INSERT OR REPLACE/IGNORE` → `ON CONFLICT`, `YYYY-MM-DD` text → `DATE`, integer-bool → `BOOLEAN`, strip SQLite triggers) → load into server PostgreSQL in FK dependency order → validate row-count/FK parity (migration-audit §8). Treat the server PostgreSQL as the target of truth; if both copies hold data, prefer the browser copy as live and reconcile/merge per domain. Keep the original browser blob and server file archived for rollback (migration-audit §11).

**(E) Business Decision Required**
**BUSINESS DECISION REQUIRED:** 
1. Is the existing browser `localStorage` data production data that **must** be preserved, or demo/test data that may be discarded?
2. If preserved, which domains are in scope for the one-time migration (all, or a subset)?
3. If both browser and server copies exist for a domain, which wins?

**(F) Acceptance Criteria**
- Documented data-preservation decision per domain.
- Export/load utility verified against a real PostgreSQL instance with row-count and FK parity checks.
- Browser business path removable without data loss (or with an explicit, signed data-loss acceptance).

---

## 8. Decision 5 — Missing REST API Scope

**(A) Evidence**
- Only `/api/academic/*` and `/api/ai/*` REST routes exist (R4 §8/§10, migration-audit §2.1 path 3).
- The 19 browser collections (R4 §6) plus master data, documents, reports, certificates, audit, settings, notifications, auth/session have **no** server route.
- The async `IDataSource` + `UnitOfWork` + Repository + Service + Controller pattern is already proven in the Academic module and is the template for all others (remediation §3–4, §9).

**(B) Facts vs Assumptions**
- `[FACT]` Existing REST surface = Academic + AI only.
- `[FACT]` Domains without REST (derived from R4 §6 collections + R3 report): students, teachers, classes/sections, subjects (non-master), grades, attendance, fee payments, expenses, library books/borrowings, master-data CRUD, documents, reports, certificates, audit logs, settings, notifications, saved reports, parent/student & user/student links, authentication/session.
- `[ASSUMPTION]` Whether cutover must be **all-at-once** or can be **incremental per domain** (strangler-fig) is **not specified**.

**(C) Architectural Consequence**
Each missing domain requires: server repository (async) + service + controller + routes + PostgreSQL tables + (where needed) seeding. This is the bulk of implementation effort and the dominant schedule driver. Sequencing (Decision 5-D, §14) determines risk exposure and the length of any dual-run window.

**(D) Recommended Decision**
Phased REST rollout reusing the Academic pattern:
- **Phase A (foundation):** Authentication/session (Decision 3) + Master-data CRUD (server route for the now-schema-present master tables; R3 report §8).
- **Phase B:** Students, Teachers, Classes/Sections.
- **Phase C:** Grades, Attendance, Fee payments, Expenses.
- **Phase D:** Library, Documents, Reports, Certificates, Audit logs, Settings, Notifications, Saved reports, and the remaining junction/link tables.
Academic is already delivered and serves as the pilot/reference. Master-data tables already exist in the runtime schema (post-R3), reducing DDL work for Phase A.

**(E) Business Decision Required**
**BUSINESS DECISION REQUIRED:** 
1. Must **all** domains be delivered before production cutover, or can cutover be **incremental per domain** (each domain flips to server once its REST + PostgreSQL path is ready)?
2. If incremental, what is the **priority order** of domains, and is there a hard go-live deadline that forces a subset?

**(F) Acceptance Criteria**
- An agreed scope matrix: delivered vs deferred domains, with priority order.
- For each in-scope domain: repository + service + controller + routes exist, implement the async `IDataSource`, and pass the real-PostgreSQL test tiers (migration-audit §10).

---

## 9. Target Architecture (Unified, Single Source of Truth)

Collapsing the two stores yields the following canonical topology (consistent with remediation §1 and migration-audit §7.4):

```
Frontend SPA (no authoritative business-data copy)
   │  HTTP only (REST)  +  auth token (session cache only)
   ▼
REST API (server.ts, Express)
   │  Application services → Use Cases
   ▼
Domain repositories (async interfaces) ── IDataSource (ASYNC)
   │                                      ├─ SQLiteDataSource (temporary fallback, server-side)
   │                                      └─ PostgreSQLDataSource (canonical, pg.Pool)
   ▼
PostgreSQL  ──  single source of truth (schema via migration runner; seeded idempotently)
```

**Principles (all derived, none invented):**
1. Exactly one authoritative store: server PostgreSQL.
2. The browser `sql.js`/`localStorage` business DB is decommissioned; `getRealmDB`/`saveRealmDB` business call sites removed (remediation §8).
3. `IDataSource` is fully async (remediation §3); `DataSourceFactory` supports `'sqlite'` (temporary fallback) and `'postgresql'` (canonical) behind `ConfigService`.
4. Auth is server-side; browser holds only non-secret session claims (Decision 3).
5. Master-data tables (post-R3, already in runtime schema) are served via a server route and owned by PostgreSQL (Decisions 2, 5).
6. No sync engine unless Decision 1 resolves to offline-required (otherwise out of scope).

---

## 10. Canonical Data Ownership Model

| Data domain | Owning layer (target) | Access path (target) | Notes |
|---|---|---|---|
| Legacy school data (students, teachers, classes/sections, grades, attendance, fees, expenses, library, certificates, reports) | Server repositories | Screen → REST → service → repository → PostgreSQL | Currently browser-local (R4 §6) |
| Academic (years, terms, curriculum/subjects, course assignments, calendar days) | Server academic repositories (REST-first) | Screen → REST controller → service → use case → repository → PostgreSQL | Already server-owned (pilot) |
| Master data (33 entities + audit log) | Server master-data service | Screen → service → repository → PostgreSQL (new REST route) | Tables present post-R3; route missing (R3 report §8) |
| Documents, Saved reports, Notifications, Settings, Audit logs | Server repositories | Screen → REST → server repository → PostgreSQL | Currently split browser/server (R4 §7, §15) |
| Auth / session | Server auth service | Login → server validates → token; browser caches non-secret claims | `password_hash` must leave browser (Decision 3) |
| UI preferences / non-business state | Browser `localStorage` (classified) | SPA only | Must be explicitly classified non-business (Decision 2-E) |

**Rules:**
- No browser-writable business tables. `saveRealmDB` is eliminated as a business persistence path.
- One write path per aggregate (AcademicYear pattern).
- No direct `querySqlSync`/`runSqlSync` imports in feature code; route through the async service layer (remediation §7, §8.3).

---

## 11. REST API Surface & Missing Endpoints

**Existing (do not re-build):**
- `POST/GET/PUT/DELETE /api/academic/*` — AcademicYear, Curriculum, CourseAssignment, AcademicCalendar (pilot, complete).
- `/api/ai/*` — AI insights (heuristic + Gemini).

**Missing (must be added; grouped by Decision 5 phase):**
- **Phase A:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`; `GET/POST/PUT/DELETE /api/master-data/*` (33 entities + audit log).
- **Phase B:** `/api/students/*`, `/api/teachers/*`, `/api/classes/*`, `/api/sections/*`.
- **Phase C:** `/api/grades/*`, `/api/attendance/*`, `/api/fees/*`, `/api/expenses/*`.
- **Phase D:** `/api/library/*`, `/api/documents/*`, `/api/reports/*`, `/api/certificates/*`, `/api/audit/*`, `/api/settings/*` (server-owned), `/api/notifications/*`, `/api/saved-reports/*`, plus junction routes (parent/student, user/student, teacher/subject, teacher/class).

Each route reuses the async `IDataSource` + `UnitOfWork` + Repository + Service + Controller stack proven by Academic. No schema change is required for master-data Phase A beyond adding the route (tables already exist post-R3); other phases require the corresponding PostgreSQL tables from the canonical schema.

---

## 12. Session & Credential Handling

Detailed design for Decision 3 (recommended path):
1. **Login:** `POST /api/auth/login` validates the submitted credentials against the server `users` table (bcrypt/Argon comparison — existing `Hash` service in `bootstrap/index.ts`); on success issues a signed token (env-driven secret; rotated). 
2. **Browser cache:** store only `{ userId, name, role, token }` in `localStorage` (`al_salam_school_current_user_v1`) — **never** `password_hash`. `getCurrentUser`/`setCurrentUser` keep working as a session cache only.
3. **Protected routes:** Express middleware verifies the token on every non-public REST call; `AcademicYear` and all new controllers sit behind it.
4. **Logout:** server invalidates (or the client drops) the token; browser session cache cleared.
5. **Secrets:** `ConfigService` must read `JWT_SECRET` / `ENCRYPTION_KEY` from env (`.env.example` gains PG + auth vars); hardcoded defaults removed before any production deployment (migration-audit §12, §13 #12).
6. **No new auth protocol invented** — uses the existing `Token`/`Session`/`Hash` services already registered in the DI composition root.

---

## 13. Browser-Side Data Migration Plan

Detailed design for Decision 4 (recommended path), reusing migration-audit §8:
1. **Extract:** a one-time utility reads the browser `sql.js` blob from `localStorage` (`al_salam_school_sqlite_db_v1`), opens it with `sql.js`, and dumps per-table `SELECT`s in FK order.
2. **Normalize:** rewrite `INSERT OR REPLACE/IGNORE` → `ON CONFLICT`; convert `'YYYY-MM-DD'` text → `DATE`; integer-bool → `BOOLEAN`; strip SQLite triggers (re-add as PG functions/triggers); map `TEXT` PK ids unchanged (migration-audit §6.3).
3. **Load:** apply to server PostgreSQL in dependency order (users/school_classes → teachers/parents → sections → students → subjects → academic → grades/attendance → fees/expenses/certificates/library → notifications/audit/settings/reports → junctions → master-data) (migration-audit §8 step 3).
4. **Validate:** per-table row-count equality + FK integrity + aggregate rehydration (e.g., term counts per year) + fee `remaining_amount` recomputation (migration-audit §8 step 4).
5. **Rollback:** original browser blob + server file archived; `pg_dump` snapshot taken before import (migration-audit §11).
6. **Cutover:** only after validation passes and Decision 4-E is answered; then remove browser business call sites (§14 step 7).

---

## 14. Migration Execution Order

Ordered so each step unblocks the next; steps marked `(BD)` depend on a business decision from §15 and cannot start until answered.

1. **Async `IDataSource` contract** — convert `IDataSource` + `SQLiteDataSource` + `UnitOfWork` + `DataSourceFactory` to async (remediation §3). *Foundation; no business decision.*
2. **Auth/session server-side + REST** — Decision 3 implementation; required before any protected route. *(BD: Decision 3-E)*
3. **Master-data server route + ownership** — serve the post-R3 master tables via `/api/master-data/*`; mark them server-owned. *(No new DDL; route-only.)*
4. **Explicit migration runner** — execute `001/002/003` + master-data on the server DB at bootstrap with idempotency (remediation §9.3). Unblocks empty master-data UI server-side.
5. **Reference-data off `querySqlSync`** — route `ReferenceDataProvider`/`useReferenceData` through the async master-data service (remediation §8.3); resolve dangling hooks (`class_rooms`, `book_categories`, `payment_statuses`) (remediation §9.2 D).
6. **Legacy domain REST rollout (Phases B–D)** — students, teachers, classes, grades, attendance, fees, library, documents, reports, certificates, audit, settings, notifications. *(BD: Decision 5-E scope/order.)*
7. **Browser DB decommission + data migration** — run §13 utility; remove `getRealmDB`/`saveRealmDB` business call sites in the 38 screen/component files (remediation §8). *(BD: Decision 1-E, Decision 4-E.)*
8. **PostgreSQL DataSource** — `PostgreSQLDataSource` behind `DataSourceFactory`; `ConfigService.type='postgresql'` (remediation §3.2.3, §13).
9. **Cutover & archive** — flip `DataSourceFactory` to PG; brief dual-run; archive SQLite; remove `sql.js` asset pipeline (migration-audit §11, §15 Phase 6).

Steps 1, 3, 4, 5, 8 are implementable now. Steps 2, 6, 7 are gated on the business decisions in §15.

---

## 15. Risks Requiring Business Decisions

| # | Decision | Blocking item | What business must answer | Owner |
|---|---|---|---|---|
| 1 | Offline policy (§4) | Online-only vs offline-capable | Is offline/intermittent operation required for any domain? | Product |
| 2 | Data ownership (§5) | Confirm no browser-only business data | Any domain that must stay browser-local? Classify `localStorage` keys. | Product / Data |
| 3 | Session & credential (§6) | Session transport, lifetime, SSO/2FA | Cookie vs bearer; token lifetime; SSO/2FA in scope? | Security / Product |
| 4 | Existing data migration (§7) | Preserve vs discard browser data | Is browser data production? Which domains? Merge policy? | Data / Product |
| 5 | Missing REST scope (§8) | All-at-once vs incremental cutover | Incremental allowed? Priority order + deadline? | Product / Eng |

All five are **BUSINESS DECISION REQUIRED**. Until each is answered, the migration cannot proceed past the gated steps in §14, and the verdict remains BLOCKED.

---

## 16. Acceptance Criteria for Unblock

The specification flips from BLOCKED to READY when **all** of the following hold:
1. Decision 1-E answered (online-only confirmed, or offline workstream separately scoped).
2. Decision 2-E answered (ownership matrix signed; non-business keys classified).
3. Decision 3-E answered (session transport + lifetime + SSO/2FA scope recorded).
4. Decision 4-E answered (per-domain preserve/discard + merge policy recorded).
5. Decision 5-E answered (cutover strategy + domain priority order recorded).
6. The §14 execution order is accepted by Eng + Product, with gated steps explicitly scheduled against the answered decisions.

Until then, implementation of the gated steps (§14 steps 2, 6, 7) must not begin.

---

## 17. Verification & Sign-off Hooks

Evidence that will flip the verdict (no code change here — these are the gates):
- **Decision records:** a signed decision log (§18) capturing each (E) answer with name/date.
- **Target architecture sign-off:** §9 diagram + §10 matrix approved by Eng + Product.
- **REST scope matrix:** §11/§8-F matrix marked delivered vs deferred.
- **Prototype (optional, post-unblock):** a single domain (e.g., Students) cut over end-to-end through the async `IDataSource` → PostgreSQL to validate the pattern before bulk rollout (migration-audit §9 pilot approach, extended beyond Academic).
- **Readiness checklist:** the migration-audit §17 checklist becomes the implementation acceptance tracker once decisions are resolved.

This document itself is the sign-off artifact; no PostgreSQL instance, schema, or code is created by R4.1.

---

## 18. Open Questions & Decision Log

| Decision | Status | Recommended default | Open business question | Answered by |
|---|---|---|---|---|
| 1 Offline policy | **BLOCKED** | Server-only, no offline cache | Required for any domain? | — |
| 2 Data ownership | **BLOCKED** | Server owns all; browser = session/non-business cache | Any browser-only business data? Classify keys. | — |
| 3 Session/credential | **BLOCKED** | Server auth + signed token; no `password_hash` in browser | Cookie vs bearer; lifetime; SSO/2FA scope? | — |
| 4 Existing data migration | **BLOCKED** | Export browser → load PG; prefer browser as live | Preserve or discard? Which domains? Merge? | — |
| 5 Missing REST scope | **BLOCKED** | Phased A→D reusing Academic pattern | Incremental cutover allowed? Priority + deadline? | — |

Status legend: `BLOCKED` = business decision outstanding; `READY` = answered and implementable. All five are BLOCKED at the close of this specification.

---

## 19. Final Verdict

BLOCKED — BUSINESS/ARCHITECTURE DECISIONS REQUIRED
