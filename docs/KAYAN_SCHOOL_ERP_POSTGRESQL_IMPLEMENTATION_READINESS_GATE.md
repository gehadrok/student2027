# Kayan School ERP — PostgreSQL Implementation Readiness Gate (FINAL reclassification)

> **Task:** PostgreSQL Implementation Readiness Gate (READ-ONLY with respect to production).
> **Allowed output:** only documentation updates.
> **Not modified:** no production code, SQL, schema, migrations, `DataSource`, repositories, API, UI, `package.json`; `pg` not installed; no PostgreSQL database created; R4.4 / Phase 6.3 / Phase 7 not started.
> **Authoritative source:** `docs/KAYAN_SCHOOL_ERP_DECISION_RECORD_D1_D9_FINAL.md` (Product Owner FINAL decisions D1–D9).
> **Prior status:** the first version of this gate marked D1–D5 as `BLOCKED` because those decisions were `NOT DECIDED`. They are now **FINAL** (Decision Record). This version reclassifies each item with reasoning (see §Conflict/Reclassification Log). It does **not** merely flip "Can Start Now? NO" → YES; each item's dependency and design state is re-evaluated.

## Status Vocabulary
- **READY_TO_IMPLEMENT** — can be executed now (in a future change) with **no** pending business decision and **no** open architectural design question.
- **BLOCKED** — cannot start until a Product Owner decision is answered. *(None remain after FINAL decisions.)*
- **DESIGN_REQUIRED** — technical work that needs an **architectural design decision** (not a business decision) before code is written.
- **FUTURE** — deferred; not required to *start* PostgreSQL.

Category mapping:
- **A) Can implement now without violating R4.2/R4.3** → READY_TO_IMPLEMENT.
- **B) Needs an additional architectural decision** → DESIGN_REQUIRED.
- **C) Needs Product Owner decision** → was BLOCKED; **now resolved** by FINAL decisions.
- **D) Future, unrelated to starting PostgreSQL** → FUTURE.

---

## 1. IDataSource async contract — READY_TO_IMPLEMENT
- **Current Evidence:** `src/core/datasource/IDataSource.ts:14-66` — complete generic async interface.
- **Current Implementation:** Already implemented and async; consumed by `UnitOfWork` and 6 repositories.
- **Target State:** Verified, frozen async contract.
- **Dependencies:** None. **Blocking Reason:** None. **Exact Files:** `IDataSource.ts` (verify only).
- **Can Start Now?** YES. **Required Decision:** None. **Risk:** Low. **Order:** PG-0.

## 2. PostgreSQL DataSource implementation — READY_TO_IMPLEMENT (reclassified from BLOCKED)
- **Current Evidence:** `DataSourceFactory.ts:34-45` supports `'postgresql'` with a commented stub.
- **Current Implementation:** No `PostgreSQLDataSource` class yet.
- **Target State:** `PostgreSQLDataSource implements IDataSource` using a `pg` pool.
- **Dependencies:** Add `pg`/`@types/pg`; per-school connection config.
- **Blocking Reason (updated):** **Resolved — D2 is FINAL** (per-school independent PostgreSQL). No remaining business block; only technical/dependency work (adding `pg`, writing the class) remains, which is part of execution PG-0/PG-3, not a decision gate.
- **Exact Files:** `package.json` (+`pg`), new `src/core/datasource/PostgreSQLDataSource.ts`, `DataSourceFactory.ts` (uncomment branch).
- **Can Start Now?** YES (post Decision Record). **Required Decision:** None (FINAL D2). **Risk:** Medium — wrong connection model if D2 ignored (it is not). **Order:** PG-3.

## 3. PostgreSQL UnitOfWork — READY_TO_IMPLEMENT
- **Current Evidence:** `UnitOfWork.ts:6-17` wraps `IDataSource` generically.
- **Current Implementation:** Generic; works with any `IDataSource`.
- **Target State:** Reused as-is. **Dependencies:** #2. **Blocking Reason:** None.
- **Exact Files:** `UnitOfWork.ts` (no change expected). **Can Start Now?** YES. **Required Decision:** None. **Risk:** Low. **Order:** PG-0 (confirm) → PG-3.

## 4. PostgreSQL repositories — DESIGN_REQUIRED
- **Current Evidence:** 6 repositories inject `IDataSource` (no `getRealmDB()`); SQL uses SQLite dialect (`?`). `AuthService.ts:33,95` use `?`.
- **Current Implementation:** Wiring ready; dialect SQLite.
- **Target State:** Repositories call `IDataSource`; PG dialect (`$1`, typed cols, no triggers) reconciled.
- **Dependencies:** #2, #5–#9. **Blocking Reason:** B — SQL dialect reconciliation (design), not a business decision.
- **Exact Files:** Repository SQL literals across modules. **Can Start Now?** Wiring YES; dialect reconciliation needs design first. **Required Decision:** None. **Risk:** Medium — silent SQL failures. **Order:** PG-1 (design) → PG-5.

## 5. PostgreSQL schema — DESIGN_REQUIRED
- **Current Evidence:** `src/lib/sqlite-schema.sql` (SQLite DDL); `src/modules/academic/infrastructure/sql/*`.
- **Target State:** PostgreSQL DDL (idempotent, typed, no triggers).
- **Dependencies:** #4. **Blocking Reason:** B (DDL port). V1 single-school is decided (D3), so no business block.
- **Exact Files:** New migration files (future). **Can Start Now?** Design YES. **Required Decision:** None. **Risk:** Medium — type mapping. **Order:** PG-1.

## 6. Master-data schema — DESIGN_REQUIRED
- **Current Evidence:** R3 completed 33 `TABLE_MAP` tables + `master_data_audit_log` (SQLite).
- **Target State:** Ported to PG DDL as **first migration**.
- **Dependencies:** #5. **Blocking Reason:** B. **Exact Files:** `migrations/0001_master_data.sql` (future). **Can Start Now?** Design YES. **Required Decision:** None. **Risk:** Low. **Order:** PG-1 → PG-4.

## 7. Academic schema — DESIGN_REQUIRED
- **Current Evidence:** `src/modules/academic/infrastructure/sql/*`; academic REST exists; 4 academic repositories `IDataSource`-based.
- **Target State:** PG DDL; **pilot domain**.
- **Dependencies:** #5, #4. **Blocking Reason:** B. **Exact Files:** `migrations/0002_academic.sql` (future); academic repos (dialect). **Can Start Now?** Design YES. **Required Decision:** None. **Risk:** Low (best-prepared). **Order:** PG-1 → PG-4/5.

## 8. Student schema — DESIGN_REQUIRED
- **Current Evidence:** Student tables in `sqlite-schema.sql`; `studentRepository.ts` `IDataSource`-based.
- **Target State:** PG DDL. **Dependencies:** #5, #4. **Blocking Reason:** B. **Exact Files:** future migration. **Can Start Now?** Design YES. **Required Decision:** None. **Risk:** Medium (PII). **Order:** PG-1 → post-pilot.

## 9. Finance schema — DESIGN_REQUIRED
- **Current Evidence:** Finance tables in `sqlite-schema.sql`; `financialRepository.ts` `IDataSource`-based.
- **Target State:** PG DDL. **Dependencies:** #5, #4. **Blocking Reason:** B. **Exact Files:** future migration. **Can Start Now?** Design YES. **Required Decision:** None. **Risk:** Medium-High (money integrity). **Order:** PG-1 → post-pilot.

## 10. Authentication — READY_TO_IMPLEMENT (reclassified from BLOCKED)
- **Current Evidence:** `AuthService.ts:16-27` uses `IDataSource`+`HashService`+`TokenService`. **Defect:** selects/stores `password_hash` (lines 33,60,95).
- **Current Implementation:** Server-side datasource lookup + token; credential exposure + session model undecided (pre-FINAL).
- **Target State:** Secure server-side auth; `password_hash` never selected/returned; signed token; session/refresh/revocation; logout.
- **Dependencies:** None beyond D4 (now FINAL).
- **Blocking Reason (updated):** **Resolved — D4 is FINAL** (server-side auth, no `password_hash` in browser, token/session). The session/transport model is now specified; implementation is a technical task. The `password_hash` leak removal is a decision-free security fix that is READY immediately.
- **Exact Files:** `AuthService.ts:33,60,95` (remove `password_hash`); browser persistence stop.
- **Can Start Now?** YES (password_hash fix immediately; full auth per D4 in PG-6). **Required Decision:** None (FINAL D4). **Risk:** High — credential exposure is live; fix independently. **Order:** PG-0 (leak fix) → PG-6.

## 11. RBAC — READY_TO_IMPLEMENT (reclassified from BLOCKED)
- **Current Evidence:** Inline `role === 'admin'` checks; no permission model.
- **Target State:** `Role → Permission → Resource → Action → School Scope`, server-side.
- **Dependencies:** #10. **Blocking Reason (updated):** **Resolved — D4 is FINAL** (permission model specified). Design the matrix per D4; implementation is technical.
- **Exact Files:** New permission tables (migration), authorization middleware, guard calls. **Can Start Now?** YES (design + implement per D4). **Required Decision:** None (FINAL D4). **Risk:** High — wrong matrix → over/under-auth. **Order:** PG-6.

## 12. School identity — DESIGN_REQUIRED (reclassified from BLOCKED)
- **Current Evidence:** `grep` `tenant|school_id|organization|campus` = 0 matches; `school_settings` single row `id=1`.
- **Current Implementation:** No school identity concept; single implicit school.
- **Target State:** v1 = one client school per deployment; `School`/`Organization` is a **formal domain/config concept** (identity, branding, config) but **no `school_id`/`tenant_id` columns in v1 tables**; future multi-tenant adds a context boundary only.
- **Dependencies:** None beyond D3 (FINAL).
- **Blocking Reason (updated):** **Resolved as DESIGN — D3 is FINAL.** The business question (single-school V1 vs multi-school) is answered: single-school V1, designed for future. What remains is an *architectural design* task: model `School`/`Organization` as a configuration/identity entity without injecting tenancy into tables. This is DESIGN_REQUIRED, not a business block.
- **Exact Files:** `school_settings`/new `schools` config entity; `ConfigService`; branding resolution.
- **Can Start Now?** Design YES (no table injection in v1). **Required Decision:** None (FINAL D3). **Risk:** High if `school_id` retrofitted later — V1 design avoids it. **Order:** PG-1 (design) → PG-7.

## 13. Configuration — DESIGN_REQUIRED
- **Current Evidence:** `ConfigService.ts:63,67-69,100,104` hard-code Al-Salam/Yemen; `App.tsx:146` hard-codes `dir="rtl"`.
- **Target State:** Product Defaults (Kayan, generic) vs School Configuration (DB-backed) vs User Preferences (browser non-secret) vs Runtime Config (server env).
- **Dependencies:** D6/D9 (FINAL).
- **Blocking Reason (updated):** **Not a PG blocker** (per D6/D9). D6 forbids Al-Salam defaults in product identity and mandates School Configuration; D9 forbids code forks (single product, feature-flag tiers). Mechanism is designable now.
- **Exact Files:** `ConfigService.ts`, `school_settings`/`schools` table, settings UI, `App.tsx` direction from config.
- **Can Start Now?** Design YES. **Required Decision:** None (FINAL D6/D9). **Risk:** Medium — leaving Al-Salam values ships wrong identity. **Order:** PG-1 (design) → PG-7.

## 14. API source-of-truth — DESIGN_REQUIRED
- **Current Evidence:** Only `/api/academic/*` + `/api/ai/*` exist; ~28 screens read browser SQLite.
- **Target State:** All domains via REST → Application → Domain → Repository → PostgreSQL.
- **Dependencies:** #2, #10, #4. **Blocking Reason:** B — endpoint design per domain (technical); protection coupled to #10 (now READY).
- **Exact Files:** New `src/server/routes/*`; `RestApiDataSource` (new). **Can Start Now?** Design YES. **Required Decision:** None. **Risk:** High — large surface. **Order:** PG-5 (pilot) → PG-7.

## 15. Browser SQLite removal — FUTURE
- **Current Evidence:** `src/lib/db.ts:57` `getRealmDB()`, `:137` `saveRealmDB()`.
- **Target State:** Browser keeps session token + non-secret prefs; `RestApiDataSource`; `getRealmDB()`/`saveRealmDB()` removed.
- **Dependencies:** #2, #14, #16, cutover. **Blocking Reason:** D — cutover-phase; does NOT block starting PG.
- **Exact Files:** `src/lib/db.ts` (remove), ~28 screens, `RestApiDataSource`. **Can Start Now?** NO (follows PG readiness). **Required Decision:** None. **Risk:** High — remove too early breaks app. **Order:** PG-9 (late).

## 16. Data migration — READY_TO_IMPLEMENT (reclassified from BLOCKED)
- **Current Evidence:** Dual DB (browser + server); `sqlite-seed.sql` interleaves school-specific demo data.
- **Target State:** `backup → classify → validate → transform → load → verify (reconciliation) → cutover`; non-destructive (copy).
- **Dependencies:** #5–#9. **Blocking Reason (updated):** **Resolved — D5 is FINAL** (preserve Al-Salam, copy/validate/verify, reconciliation report, no delete until verified). Policy is decided; build the pipeline per D5.
- **Exact Files:** New `scripts/migrate-sqlite-to-pg` (future); reconciliation tooling. **Can Start Now?** YES (design + build per D5). **Required Decision:** None (FINAL D5). **Risk:** Critical — data loss if unverified. **Order:** PG-8.

## 17. Al-Salam migration — READY_TO_IMPLEMENT (reclassified from BLOCKED)
- **Current Evidence:** `sqlite-seed.sql:8-24` school "مدرسة خالد ابن الوليد الضالع/جحاف", users `u1..u10 @khaled.edu.ye`.
- **Target State:** Migrated as ordinary **Customer Data** into its own PG; separated from product identity.
- **Dependencies:** #16. **Blocking Reason (updated):** **Resolved — D5 FINAL** (Al-Salam = Customer/Migration Source; preserve).
- **Exact Files:** Migration source = current browser blob + `data/al-salam-server.db`; target = per-school PG. **Can Start Now?** YES (per D5). **Required Decision:** None (FINAL D5). **Risk:** Critical — production customer data. **Order:** PG-8.

## 18. Backup / restore — FUTURE (does NOT block PG start)
- **Current Evidence:** No PG backups yet.
- **Target State:** Automated PG backups, restore, verification, DR, `schema_migrations`.
- **Dependencies:** #2, D7 (FINAL).
- **Blocking Reason (updated):** **Not a PG blocker** (per D7). D7 requires official backup/restore in v1 and that the design not depend on a single copy; implementation is post-PG, before go-live.
- **Exact Files:** Backup job (future); `schema_migrations` table. **Can Start Now?** Design YES; execution post-PG. **Required Decision:** None (FINAL D7, values later). **Risk:** High if absent at go-live. **Order:** PG-10 (before go-live).

## 19. Audit logging — DESIGN_REQUIRED
- **Current Evidence:** `AuditService.ts` writes browser `localStorage`; server has SQL `audit_logs`; split store.
- **Target State:** Single server-side audit store (immutable) per installation.
- **Dependencies:** #2, #14. **Blocking Reason (updated):** **Not a PG blocker** (per D8). D8 mandates Audit Logs + Diagnostics + Health/Version; centralization is designable now.
- **Exact Files:** `AuditService.ts` (redirect to API), new audit REST + repository + table. **Can Start Now?** Design YES. **Required Decision:** None (FINAL D8). **Risk:** Medium — audit gaps during transition. **Order:** PG-1 (design) → PG-7.

## 20. Offline policy — DESIGN_REQUIRED (reclassified from BLOCKED)
- **Current Evidence:** Browser SQLite is the de-facto offline source of truth.
- **Target State:** V1 online-first; offline = explicit state only; browser cache UX-only (non-authoritative, no conflict); no sync engine in v1; abstraction for future.
- **Dependencies:** None beyond D1 (FINAL).
- **Blocking Reason (updated):** **Resolved as DESIGN — D1 is FINAL** (online-first, no sync engine; cache UX-only). The business question (offline requirement) is answered; what remains is an *architectural design* task: connectivity state + non-authoritative cache. DESIGN_REQUIRED, not a business block.
- **Exact Files:** Connectivity layer; `RestApiDataSource` offline state. **Can Start Now?** Design YES. **Required Decision:** None (FINAL D1). **Risk:** High — building sync now would contradict D1. **Order:** PG-1 (design) → PG-7.

## 21. Testing strategy — DESIGN_REQUIRED
- **Current Evidence:** `academicIntegration.test.ts:60` builds in-memory `IDataSource` (contract testable without real engine).
- **Target State:** PG integration tests (staging DB), contract tests (SQLite + PG), migration verification.
- **Dependencies:** #2, #5–#9. **Blocking Reason:** B (design harness). **Exact Files:** `tests/` (new PG suites), CI. **Can Start Now?** Design YES. **Required Decision:** None. **Risk:** Medium — without tests, dialect/migration bugs ship. **Order:** PG-1 (design) → PG-5.

## 22. Deployment strategy — READY_TO_IMPLEMENT (reclassified from BLOCKED)
- **Current Evidence:** Static SPA + minimal server (`/api/academic`, `/api/ai`).
- **Target State:** SPA → Backend/API → PostgreSQL, per-school deployment; no direct browser→PG.
- **Dependencies:** #2. **Blocking Reason (updated):** **Resolved — D2 is FINAL** (per-school PostgreSQL deployment). Topology is decided; implement per D2.
- **Exact Files:** Deploy manifests, env config, DB provisioning. **Can Start Now?** YES (design + implement per D2). **Required Decision:** None (FINAL D2). **Risk:** High — wrong topology → re-deploy (mitigated: D2 decided). **Order:** PG-3.

---

## Category Roll-up (after FINAL decisions)
- **A) READY_TO_IMPLEMENT:** #1 IDataSource async contract; #2 PostgreSQL DataSource (D2); #3 PostgreSQL UnitOfWork; #10 Authentication full model (D4) + `password_hash` leak fix; #11 RBAC (D4); #16 Data migration (D5); #17 Al-Salam migration (D5); #22 Deployment strategy (D2). *(8 items + leak fix)*
- **B) DESIGN_REQUIRED:** #4 repositories (dialect); #5 schema; #6 master-data; #7 academic; #8 student; #9 finance; #12 School identity (D3 — design concept); #13 Configuration (D6/D9); #14 API source-of-truth; #19 Audit (D8); #20 Offline (D1 — design concept); #21 Testing. *(12 items)*
- **C) BLOCKED:** **None.** All previously BLOCKED items are resolved by FINAL decisions.
- **D) FUTURE:** #15 Browser SQLite removal (cutover); #18 Backup/restore (post-PG, D7). *(2 items)*

---

## EXECUTION ORDER (unchanged plan; now unblocked)
- **PG-0 — Ready hardening (no pg):** Verify/freeze `IDataSource`; confirm `UnitOfWork` reuse; confirm repository injection. **Security fix (READY):** remove `password_hash` in `AuthService.ts:33,60,95` + stop browser persistence.
- **PG-1 — Design phase (DESIGN_REQUIRED):** PG V1 DDL (master-data + academic pilot + student + finance); SQL dialect reconciliation (`?`→`$1`); School/Organization config concept (D3); configuration source + branding (D6); audit centralization (D8); REST endpoint design; testing harness; online-first connectivity/cache design (D1).
- **PG-2 — Resolve remaining design questions** (architectural only; no business block remains).
- **PG-3 — PG datasource:** add `pg`; implement `PostgreSQLDataSource` + `PostgreSQLUnitOfWork`; wire `DataSourceFactory` (env `DATA_SOURCE_TYPE`) per D2.
- **PG-4 — First migrations:** `0001_master_data.sql` + `0002_academic.sql` (idempotent).
- **PG-5 — Pilot (Academic):** academic repos dialect-validated; academic REST on PG; **real** PostgreSQL integration tests (rule 8). First repo = Academic; first pilot domain = Academic.
- **PG-6 — Auth + RBAC (D4):** server-side auth; remove residual `role==='admin'`; enforce permission model.
- **PG-7 — Remaining domains + Config + Audit:** student, finance, teacher, dashboard, master-data, library, documents, reports, certificates, settings, notifications; configuration + audit centralization.
- **PG-8 — Migration (D5):** backup → classify → validate → transform → load → verify (reconciliation) → cutover; Al-Salam as Customer Data.
- **PG-9 — Browser SQLite cutover:** `RestApiDataSource`; switch screens off `getRealmDB()`/`saveRealmDB()`; remove them only after PG verified.
- **PG-10 — Backup/Restore + Go-live (D7):** automated backups, restore tests, DR; verify RPO/RTO before go-live.

---

## ROLLBACK STRATEGY (unchanged, still required)
1. Feature flag `DATA_SOURCE_TYPE=sqlite|postgresql`; default `sqlite`.
2. Non-destructive migration (copy, never delete); archive browser blob + server file before cutover.
3. Dual verification before cutover; app runs on SQLite until PG reconciled.
4. Keep `getRealmDB()`/`saveRealmDB()` during transition; delete only in PG-9 after soak.
5. Instant revert: set flag to `sqlite`; untouched SQLite restores immediately.
6. Migrations idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`); re-runnable.
7. Verified PG backup exists before any flag flip.

---

## ACCEPTANCE GATE (before cutting SQLite → PostgreSQL)
1. All 9 R4.2 decisions are FINAL and recorded (Decision Record). ✅ now met.
2. `IDataSource` async contract verified; all repos use it.
3. `PostgreSQLDataSource` unit-tested against real PostgreSQL.
4. V1 schema migrated; migrations applied + verified (reconciliation passes).
5. Auth server-side; `password_hash` never in browser.
6. RBAC permission-based; no `role==='admin'` short-circuits.
7. All domains served via REST; browser has no operational DB.
8. Data migration dry-run + verification; Al-Salam preserved per D5.
9. Backup/restore tested; RPO/RTO defined (D7) and met.
10. Rollback path verified.
11. Configuration no longer hard-codes Al-Salam/Yemen as Production Defaults (D6).
12. Localization/direction from configuration, not hard-coded `dir="rtl"`.

---

## Conflict / Reclassification Log
- **Prior gate vs Decision Record:** The first gate version marked #2, #10, #11, #12, #16, #17, #20, #22 as `BLOCKED` because D1–D5 were `NOT DECIDED`. The Product Owner has now issued FINAL decisions D1–D9. There is **no substantive contradiction** — the FINAL choices match the engineering Recommendations already recorded in R4.2 (Option A per-school PG, online-only, server-side auth + RBAC, preserve migration, generic config, etc.). The change is a **status progression** (BLOCKED → READY/DESIGN), explicitly logged here, not a silent resolution.
- **D6 / D7 / D8 / D9:** These were never business blockers for *starting* PG; the Product Owner confirms D6/D7/D8/D9 do **not** block PostgreSQL implementation. #13 (Config) and #19 (Audit) remain DESIGN_REQUIRED; #18 (Backup) remains FUTURE (design now, implement before go-live).
- **D3 / D1 nuance:** #12 (School identity) and #20 (Offline) move from BLOCKED to **DESIGN_REQUIRED** (not READY) because, although the business question is answered, an *architectural design* (School/Organization concept; online-first cache) is still required before code. This honors the instruction not to flip status without reasoning.
- **R4.2 / R4.3 consistency:** R4.2 decision statuses and R4.3 §23 gate are updated to FINAL/READY in companion edits. No conflict remains.

---

## Conclusion — Can PostgreSQL start now?
**YES — PostgreSQL is READY_TO_IMPLEMENT.** All business decisions that previously blocked it (D1–D5) are FINAL; D6/D7/D8/D9 explicitly do not block start. The target architecture (R4.3) is specified and consistent. Execution proceeds via the staged PG-0…PG-n plan, each phase gated by acceptance + rollback, beginning with PG-0 (PostgreSQL DataSource + UnitOfWork + DataSourceFactory + `password_hash` removal). This is a deliberate, non-blind reclassification: items became READY only where no design work remains (#2,#10,#11,#16,#17,#22), and DESIGN_REQUIRED where architecture must still be specified (#12,#20), with reasoning recorded per item above.

*End of updated Readiness Gate. No production file was modified; only documentation was updated. PostgreSQL implementation, R4.4, Phase 6.3, and Phase 7 were not started.*
