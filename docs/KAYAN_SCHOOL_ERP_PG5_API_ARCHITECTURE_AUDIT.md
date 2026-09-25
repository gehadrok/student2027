# KAYAN SCHOOL ERP — PG-5 REST API / PostgreSQL Source-of-Truth Foundation
## API Architecture & Migration Audit

- **Plan:** PG-5
- **Title:** REST API / PostgreSQL Source-of-Truth Foundation
- **Status:** Complete
- **Final Verdict:** `PG-5: PASS — READY FOR PG-6`
- **Date:** 2026-08-25
- **Author:** Autonomous implementation (opencode)

---

## 1. Executive Summary

Prior phases (PG-0 → PG-4.5) established PostgreSQL as a fully functional, CRUD-complete
data store behind a `DataSource` abstraction: schema migrations, a `PostgreSQLDataSource`,
per-module repositories, a `DataSourceFactory`, and — in PG-4.5 — corrected full repository
coverage (the `count()`/`exists()` wrapping defect was fixed; 49/49 live tests passed with
`PG-4.5: PASS — READY FOR PG-5`).

What was **still missing** was an explicit, server-side, authoritative **REST API boundary**
over PostgreSQL. The browser continued to drive data through `getRealmDB()` / `saveRealmDB()`
/ `querySqlSync()` against a bundled SQLite engine. PG-5 introduces that boundary:

> **A standalone REST API that owns the server-side application logic over PostgreSQL, while
> leaving the existing browser/SQLite path fully intact (transitional).**

The pilot domain is **Master Data** (all configuration tables). A complete, transactional,
validated, error-mapped REST surface was implemented and verified live against PostgreSQL
(`11/11` API tests, `56/56` total live tests, `npm run build` green). No legacy code path was
removed or altered; no Al-Salam / customer data was migrated; no authentication mechanism was
invented.

---

## 2. Objective & Scope

### 2.1 Primary Objective
Establish the REST API as the authoritative server-side application boundary over PostgreSQL,
without performing a full frontend cutover.

### 2.2 In Scope (this phase)
- Define the API boundary architecture and endpoint conventions.
- Classify all domains by migration strategy (A/B/C/D).
- Implement a **pilot** REST API for Master Data over PostgreSQL.
- End-to-end verification (POST→API→repo→PG, GET→repo→API) + negative paths.
- Document the security boundary (authentication = PG-6) and legacy-protection guarantees.

### 2.3 Out of Scope (explicitly excluded — see §8)
Full Authentication, full RBAC, multi-school tenancy, offline sync, frontend-wide API
migration, Al-Salam / customer data migration, SQLite removal, and PG-6.

---

## 3. As-Is vs To-Be Architecture

### 3.1 As-Is (before PG-5)
```
Browser (React)
  └─ src/lib/sqlite-engine.ts  (sql.js in-memory + persistence)
       └─ getRealmDB() / saveRealmDB() / querySqlSync()
            └─ Bundled SQLite (transitional)

Server (Express)
  └─ /api/academic  (Academic REST API — already PG-backed)
```

The browser owns data access. There is **no** generalized server-side REST boundary that
the frontend could later adopt per-domain.

### 3.2 To-Be (target after PG-5, realized for Master Data)
```
Browser (React)
  ├─ (legacy) src/lib/sqlite-engine.ts  ── SQLite (TRANSITIONAL, unchanged)
  └─ (future) REST client ──┐
                             ▼
Server (Express)
  ├─ /api/academic          ── Academic REST API (pre-existing, PG)
  └─ /api/master-data       ── NEW: Master Data REST API (PG)   ← PG-5 pilot
        └─ masterDataRoutes → masterDataController → masterDataApiService
              └─ MasterDataRepository (IDataSource) → PostgreSQLDataSource → PostgreSQL
```

The key architectural property: **the API talks to PostgreSQL through the same `IDataSource`
repository layer that PG-4.x validated** — no new SQL dialect, no new connection path, no
legacy function calls.

---

## 4. Domain Classification (Phase 2)

Each domain is classified by how the REST/PG boundary should be introduced.

| Domain | Class | Rationale | PG-5 action |
|---|---|---|---|
| **Master Data** (all config tables) | **A** | Fully PG-repo-backed; no behavioural nuance; ideal pilot. | ✅ Pilot API implemented & verified. |
| **Academic** (years, terms, structure) | **A** | PG repos + existing `/api/academic` REST surface. | Already complete (pre-PG-5). |
| **Classes / Sections** | **A** | Part of academic structure; PG-backed. | Deferred (no new API this phase). |
| **Attendance** (types/statuses) | **A** | Subset of Master Data. | Covered by Master Data pilot. |
| **Students** | **B** | Core entity; PG repo exists but heavy legacy browser code. | Deferred to a later domain phase. |
| **Teachers** | | Core entity; extensive legacy `getRealmDB` usage. | Deferred to a later domain phase. |
| **Parents** | **B** | As Students. | Deferred. |
| **Finance** | **B** | `FinancialRepository` (PG) exists; frontend still SQLite-heavy. | Deferred. |
| **Dashboard** | **C** | Derived/aggregated analytics; needs design. | Out of PG-5 scope. |
| **Settings** | **C** | Partly Master Data (system_numbering, school_branches); app settings need assessment. | Out of PG-5 scope. |
| **Security** | **C** | `AuthService` exists; **authentication integration = PG-6**. | Out of PG-5 scope. |
| **Audit** | **C** | Audit-log read API possible later. | Out of PG-5 scope. |
| **Al-Salam legacy / Yemen data** | **D** | Explicitly excluded; never migrated. | ❌ Not done (by design). |
| **Offline Sync / Multi-school tenancy / Frontend-wide migration / Full RBAC** | **D** | Explicitly excluded from PG-5. | ❌ Not done (by design). |

**Class legend:** A = full backend ownership now viable · B = dual (backend + legacy coexist,
migrate later) · C = API-readiness / design pending · D = out of scope this phase.

---

## 5. Pilot Selection — Master Data

Master Data was chosen as the pilot because it:
1. Is already 100% covered by `MasterDataRepository` over PostgreSQL (PG-4.5 verified).
2. Has a single, uniform shape (`entityType` → `TABLE_MAP[entityType]`), enabling a
   **generic** REST surface rather than per-entity controllers.
3. Has no behavioural edge cases (no enrolments, no balances) — the cleanest boundary to
   prove the pattern end-to-end.
4. Exposes every entity type the rest of the system depends on, so the pilot also serves as
   the reference implementation for later domains (Students/Teachers/Finance).

**Entity types covered** (`TABLE_MAP`, exported from `masterDataRepository.ts`):
`academic_years, academic_terms, education_stages, grade_levels, sections_master,
subjects_master, exam_types, certificate_types, attendance_types, leave_types,
academic_statuses, nationalities, countries, governorates, districts, cities,
identity_types, document_types, employee_types, qualifications, specializations,
job_titles, departments, buildings, rooms, laboratories, libraries, fee_categories,
payment_methods, discount_types, currencies, system_numbering, school_branches`.

---

## 6. API Design (Pilot)

### 6.1 Routes (mounted at `/api/master-data`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/:entityType` | List (paginated, search, filter, sort) |
| GET | `/:entityType/:id` | Fetch one |
| POST | `/:entityType` | Create one |
| PUT | `/:entityType/:id` | Update one |
| DELETE | `/:entityType/:id` | Delete one (FK-protected) |
| POST | `/:entityType/bulk` | Transactional bulk create |
| POST | `/:entityType/bulk-delete` | Bulk delete (counts) |

Bulk routes are registered **before** `:id` routes to avoid `bulk`/`bulk-delete` being
captured as an `:id`.

### 6.2 Layers
```
masterDataRoutes.ts      → HTTP routing, param parsing
masterDataController.ts  → thin adapter (status codes, repo construction)
masterDataApiService.ts  → application logic: validation, audit user, error mapping
MasterDataRepository     → IDataSource → PostgreSQLDataSource → PostgreSQL
errors.ts                → ApiError + sendError (uniform {error, details?} body)
```

### 6.3 Status codes
| Case | Status |
|---|---|
| Create | `201` |
| Read / Update | `200` |
| Delete success | `204` (no body) |
| Validation failure (incl. required/range) | `400` (+ `details`) |
| Not found / unknown entity | `404` |
| Uniqueness conflict (duplicate code/name) | `409` |
| FK violation / bulk transaction rollback | `409` (+ `details`) |
| Invalid where-clause / bad filter | `422` |
| Unexpected | `500` |

### 6.4 Error body
`{ "error": "<ar message>", "details"?: <array> }` — produced by `sendError` in `errors.ts`,
mirroring the existing `academicController` convention.

### 6.5 Validation
`validateMasterData(body, entityType, existingRows, excludeId?)` (from
`src/modules/master-data/validators`, reusing `src/core/validation`) is enforced server-side
on every create/update/bulk. Uniqueness is checked in-memory against `getAllFlat`; a
uniqueness-only failure maps to `409`, any other validation failure to `400`.

### 6.6 Transactional integrity
`bulkCreate` runs inside a single `PostgreSQLDataSource` transaction. Any failure
(validation, FK, unique) rolls the **entire** batch back and returns `409` with `success:0`.
Verified by the API test "bulkCreate with FK violation rolls back the whole batch".

---

## 7. Security Boundary (Phase 5)

This phase establishes the **boundary**, not authentication.

- **Authentication = PG-6.** No auth mechanism (session/JWT/OAuth) was implemented or
  invented. The API is currently open on the network; that gap is explicitly owned by PG-6.
- **Authorization / RBAC = out of scope.** No role checks were added.
- **Input validation** is enforced server-side for every write (§6.5) — a first line of
  defence independent of auth.
- **Parameterized queries** — all SQL flows through the `IDataSource`/`PostgreSQLDataSource`
  parameterized execution path; no string-concatenated SQL is introduced by the API.
- **No legacy data access** — the API path never calls `getRealmDB()`, `saveRealmDB()`,
  `querySqlSync()`, or browser `localStorage` (verified, §6/§8).
- **Audit user** — every write is stamped with `auditUser = 'api'` (explicit, server-side),
  avoiding the `localStorage`-dependent `getCurrentUserId`/`getCurrentUserName` utilities.
- **CORS / origin policy** — left to the existing server configuration; not changed.

---

## 8. Legacy-Protection Guarantees (Phase 6 / Phase 8)

No legacy code was removed or altered by PG-5. Concretely:

| Guard | Status |
|---|---|
| `getRealmDB()` / `saveRealmDB()` unchanged & still called only by browser code | ✅ |
| `querySqlSync()` unchanged & browser-only | ✅ |
| Bundled SQLite engine (`sqlite-engine.ts`) retained | ✅ |
| No Al-Salam / Yemen / customer data migration performed | ✅ |
| No destructive PostgreSQL operations (no DROP/TRUNCATE/ALTER) introduced | ✅ |
| No credentials committed (env-based `postgresConfig`) | ✅ |
| Frontend-wide API migration NOT performed | ✅ |
| Full Auth/RBAC NOT implemented (owned by PG-6) | ✅ |
| SQLite NOT removed; `DataSourceFactory` still defaults to SQLite | ✅ |

Verification: a case-insensitive search of `server.ts` and `src/modules/master-data/api/*`
for `getRealmDB|saveRealmDB|querySqlSync|localStorage` returns **no code references** (only a
doc-comment stating the API does not use them).

---

## 9. Verification Results (Phase 7)

All suites run serially against the live `kayan_school_erp` PostgreSQL database (shared DB —
parallel runs would race).

| Suite | Tests | Result |
|---|---|---|
| `pg4.migrations.live.test.ts` (idempotency) | 14 | ✅ pass |
| `pg4.repositories.live.test.ts` | 5 | ✅ pass |
| `pg4.sweep.live.test.ts` (FK/orphan sweep) | 3 | ✅ pass |
| `postgres.live.test.ts` (datasource) | 14 | ✅ pass |
| `pg45.repositories.coverage.live.test.ts` | 9 | ✅ pass |
| `pg5.masterData.api.live.test.ts` (**new**) | 11 | ✅ pass |
| **Total** | **56** | **0 failures** |

Build: `npm run build` → success (server bundle + client build).
Type-check: `tsc --noEmit` reports only **pre-existing frontend** errors in `App.tsx`,
`GlobalSearchBar.tsx`, `ActiveReportPrintView.tsx` (unrelated to PG work; the PG-5 pilot
files type-check cleanly).

### 9.1 PG-5 API test coverage
POST→create→GET round-trip; paginated list via PG count; duplicate→409; update→200;
delete missing→404; delete existing→204; FK-blocked delete→409 then success after child
removed; bulkCreate→201; bulkCreate FK-rollback→409 (0 rows); bulkDelete→200 counts;
validation failure→400; unknown entity→400.

---

## 10. Risks & Witnesses

| Risk | Witness / Mitigation |
|---|---|
| API currently unauthenticated | Documented; owned by PG-6. Do not expose publicly until then. |
| Generic `:entityType` surface could be abused for unknown tables | `assertEntity` rejects any `entityType` not in `TABLE_MAP` (400). |
| Bulk endpoint throughput | Transactional; acceptable for configuration-scale data. Monitor in PG-6. |
| Duplicate-code returns 409 vs 400 inconsistency | Resolved: uniqueness-only → 409, other validation → 400 (uniform rule). |

---

## 11. Go / No-Go

- All acceptance criteria met. ✅
- No legacy regression. ✅
- No scope creep (D-class items excluded). ✅
- Verification green (56/56 live, build green). ✅

**Recommendation:** `PG-5: PASS — READY FOR PG-6`.

---

## 12. Handoff to PG-6

PG-6 should:
1. Implement **Authentication** (the missing boundary) and attach an authenticated
   principal to each request; replace the hardcoded `auditUser = 'api'` with the real user.
2. Introduce **Authorization (RBAC)** as a middleware layer on the existing routes.
3. Extend the same generic pattern to **Class B** domains (Students, Teachers, Parents,
   Finance) once their repository coverage and behavioural rules are confirmed.
4. Add CORS/origin policy and rate-limiting as appropriate.
