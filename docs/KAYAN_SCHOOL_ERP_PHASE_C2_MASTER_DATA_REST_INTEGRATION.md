# Kayan School ERP — Phase C2: Master Data REST Integration

> **Scope: Master Data only.** This frontend is a **client** of the Kayan School ERP REST API.
> No backend, no PostgreSQL, no migrations, no direct database access, no UI redesign, no commit.
> Attendance, Grades, Finance, Library, Calendar, Reports, Documents, AI, RBAC and Auth were **not
> touched**. C3 not started.

---

## 1. Pre-flight findings

| Area | State before C2 |
|---|---|
| Backend REST API | Exists and is protected: `GET/POST /:entityType`, `GET/PUT/DELETE /:entityType/:id`, `POST /:entityType/bulk`, `POST /:entityType/bulk-delete`, all behind `authenticate` + `requirePermission('master_data', action)` (`api/masterDataRoutes.ts`). Contract evidence: `api/pg5.masterData.api.live.test.ts`. |
| Frontend data path | UI (`MasterDataCenter`) → `useMasterData` → `masterDataService` → `masterDataRepository` singleton → browser SQLite. The REST API was **never called from the browser**. |
| Repository interface | `IMasterDataRepository` with 15 methods; only **7** have a backend endpoint. |
| Mode switch | Phase C1 `USE_MOCK` (static `import.meta.env` access). |
| Auth | C1 `ApiClient` injects the bearer token; 401 clears the session, 403 surfaces. |

Key gap: nothing selected between "MockDataSource" and "the REST API", and the service applied
pagination/search/sort client-side, which would double-apply against a server that already does it.

## 2. Master Data endpoints actually used

Base path constant: `KAYAN_MASTER_DATA_PATH = '/api/master-data'`
(`src/modules/master-data/api/masterDataRestRepository.ts`).

| Operation | Method | Path | Request | Success |
|---|---|---|---|---|
| list | `GET` | `/api/master-data/:entityType` | query `page, pageSize, searchQuery, is_active, sortBy, sortOrder` | `200 { data, total, page, pageSize, totalPages }` |
| get | `GET` | `/api/master-data/:entityType/:id` | — | `200 record` / `404` |
| create | `POST` | `/api/master-data/:entityType` | record body | `201 record` |
| update | `PUT` | `/api/master-data/:entityType/:id` | record body | `200 record` / `404` |
| delete | `DELETE` | `/api/master-data/:entityType/:id` | — | `204` / `404` / `409` |
| bulk-create | `POST` | `/api/master-data/:entityType/bulk` | `{ rows: [...] }` | `201 { success, failed, errors }` |
| bulk-delete | `POST` | `/api/master-data/:entityType/bulk-delete` | `{ ids: [...] }` | `200 { success, failed, errors }` |

No endpoint, field, permission, validation rule or response shape was invented.

## 3. Request / response mapping

- `getAll(entityType, filter)` → the client filter is sent as the documented query parameters
  (defaults `page=1`, `pageSize=25`, `sortBy=display_order`, `sortOrder=asc`; `is_active` only when
  provided). The response is validated against the documented shape; anything else raises
  `MasterDataContractError` instead of being guessed at.
- `getAllFlat(entityType, activeOnly)` → the backend has no "flat" endpoint, so the client pages
  through the collection (`page`, `pageSize=100`) until the backend `total` is collected. Only
  documented parameters are used.
- `getById` → `404` maps to `null` (the service contract is `T | null`).
- `update` → `404` maps to `null`; other statuses propagate as `ApiError`.
- `delete` → `204` ⇒ `true`; `404` ⇒ `false`; `409` (referenced rows) propagates so it is never
  reported as a successful delete.
- Bulk results are validated for `{ success, failed, errors }` and error entries are coerced to strings.

**Repository methods with NO backend endpoint** (`isFieldUnique`, `logAudit`, `getAuditLogs`,
`getParentRecords`, `getFieldOptions`, `generateNextNumber`, `getPermission`) throw
`MasterDataRestUnsupportedError`. They are **not** faked client-side. The only in-app caller
(`MasterDataCenter` audit log) already wraps that call in `try/catch`.

## 4. Repository changes

`IMasterDataRepository` is **unchanged**. Added:

- `api/masterDataRestRepository.ts` — `MasterDataRestRepository implements IMasterDataRepository`
  over the C1 `ApiClient` (so bearer token, 401 and 403 handling are reused as-is), plus
  `KAYAN_MASTER_DATA_PATH`, `MasterDataRestUnsupportedError`, `MasterDataContractError`.
- `repository/masterDataRepositoryProvider.ts` — `getMasterDataRepository()` selects once:
  `USE_MOCK=true` → existing `masterDataRepository` (browser SQLite, unchanged instance);
  `USE_MOCK=false` → `MasterDataRestRepository`. Also `setMasterDataRepository()` (tests) and
  `isServerSidePaginated()`.

`services/masterDataService.ts` (the only existing file modified):
- repository is now injected (`new MasterDataService(repo)`), defaulting to the provider — the
  exported `masterDataService` singleton keeps its shape, so hooks/screens are untouched;
- when the repository paginates server-side, `getPaginated` returns the backend page as-is instead
  of re-filtering/sorting/slicing it a second time;
- repository errors from `create`/`update`/`delete` are mapped into the **existing** result shapes
  (`{ success:false, errors:[…] }` / `{ success:false, error }`) so backend errors surface in the
  current UI instead of becoming unhandled rejections. Mock Mode behaviour is unchanged (the mock
  repository does not throw).

No screen, hook, entity definition, validator, RBAC rule or Auth code was changed.

## 5. Mock Mode result — `USE_MOCK=true`

| Check | Result |
|---|---|
| Provider selects the existing SQLite repository | PASS (unit test) |
| Master Data screen renders, LIST works | PASS (browser) |
| CREATE through the Master Data UI | PASS (browser: “تم إضافة السجل بنجاح”, record listed) |
| Zero `/api/master-data` requests in Mock Mode | PASS (browser network capture) |
| No new token/credential storage key | PASS |
| Admin CRUD (students) create/update/delete + reload | PASS |
| Teacher attendance + persistence | PASS |
| Teacher grade save | PASS (save accepted; teacher-filtered list hides the new row — separately verified with full visibility) |
| Auth: login, four roles, navigation, logout, session hygiene | PASS 9/9 |
| `npm test` / `lint` / `build` / existing master-data runtime suite | PASS |

## 6. Real Mode result — `USE_MOCK=false`

| Check | Result |
|---|---|
| Provider selects `MasterDataRestRepository` (no SQLite fallback) | PASS (unit test) |
| Selection is stable across calls (no silent switch) | PASS (unit test) |
| Endpoints, query mapping, bearer injection, 401/403, bulk payloads, unsupported ops | PASS (16 unit tests) |
| Live CRUD against the Kayan backend | **NOT VERIFIED** — backend unreachable |

## 7. CRUD verification

**Mock Mode (browser, Master Data UI, entity `education_stages`)** — LIST renders, CREATE creates a
record and it is listed. UPDATE / DELETE / reload-persistence through this screen were **not
completed by the automation** (harness instability on the post-reload step, unrelated to the app);
they are covered by the repository unit tests and the existing 317-check runtime suite instead.

**Real Mode** — every operation is verified at the **client contract** level (path, payload,
response validation, error mapping) but **not against a running backend**.

| Operation | Mock Mode | Real Mode (client) | Real Mode (live backend) |
|---|---|---|---|
| LIST | PASS | PASS (unit) | NOT VERIFIED |
| GET | n/a in UI | PASS (unit, incl. 404→null) | NOT VERIFIED |
| CREATE | PASS | PASS (unit, 201) | NOT VERIFIED |
| UPDATE | NOT VERIFIED (UI) / PASS (repo unit) | PASS (unit) | NOT VERIFIED |
| DELETE | NOT VERIFIED (UI) / PASS (repo unit) | PASS (unit, 204/404/409) | NOT VERIFIED |
| BULK-CREATE | n/a in UI | PASS (unit) | NOT VERIFIED |
| BULK-DELETE | n/a in UI (service loops single delete) | PASS (unit) | NOT VERIFIED |
| Errors surfaced | PASS | PASS (unit) | NOT VERIFIED |

## 8. Error handling

| Backend response | Client behaviour |
|---|---|
| `401` | `ApiError(401)` → C1 handler clears the session once → login screen. Never converted into mock data. |
| `403` | `ApiError(403)` surfaced as a forbidden error; session kept. |
| `400` / `409` (duplicate, referenced rows) | Backend message surfaced through the service's existing result shapes. |
| `404` | `getById`/`update` → `null`; `delete` → `false`. |
| Network failure | `ApiError(0)` → clear connection message, no fallback. |
| Unexpected response shape | `MasterDataContractError` (never guessed). |
| Unsupported repository method | `MasterDataRestUnsupportedError` with the operation name. |

## 9. Tests

| Suite | Result |
|---|---|
| `npm test` (now 71 tests, incl. 16 new Master Data REST + 3 provider) | **71/71 pass** |
| `npm run lint` | 9 errors — identical pre-existing baseline, none in C2 files |
| `npm run build` | **PASS** |
| `npx tsx scripts/run-master-data-runtime.mjs` (existing) | **317 pass / 0 fail** |
| Browser: Mock Mode Master Data (LIST/CREATE/no REST calls) | PASS |
| Browser: Mock Mode full regression (admin CRUD, teacher, auth, roles) | PASS |
| Live PostgreSQL suite `pg5.masterData.api.live.test.ts` | NOT RUN (requires a live PG database) |

## 10. Build
`npm run build` → PASS (Vite bundle + `dist/server.cjs`).

## 11. Exact files changed

- **new** `src/modules/master-data/api/masterDataRestRepository.ts`
- **new** `src/modules/master-data/api/masterDataRestRepository.test.ts`
- **new** `src/modules/master-data/repository/masterDataRepositoryProvider.ts`
- **new** `src/modules/master-data/repository/masterDataRepositoryProvider.test.ts`
- **new** `docs/KAYAN_SCHOOL_ERP_PHASE_C2_MASTER_DATA_REST_INTEGRATION.md`
- **modified** `src/modules/master-data/services/masterDataService.ts` (injection, server-side
  pagination passthrough, error mapping)
- **modified** `package.json` (test script)

## 12. Backend contract mismatches

1. **`getAllFlat` has no endpoint.** Implemented by paging the documented collection endpoint. If
   the deployment should expose a dedicated "all/lookup" endpoint or a maximum page size, decide
   explicitly.
2. **No audit endpoints.** `logAudit` / `getAuditLogs` are unsupported in Real Mode; the Master
   Data audit tab will be empty. The backend must expose an audit endpoint, or the tab must be
   hidden in Real Mode — a product decision, not a client guess.
3. **No permission-introspection endpoint.** `getPermission` is unsupported in Real Mode; the UI
   must rely on the C1 session permissions when the backend is connected.
4. **No `isFieldUnique` endpoint.** Client-side uniqueness validation is retained in the service
   (it already existed); the backend re-validates authoritatively.
5. **No `generateNextNumber` / `getFieldOptions` / `getParentRecords` endpoints.** Unsupported in
   Real Mode; the corresponding UI affordances (numbering preview, option lists, parent lookups)
   will not work until the backend provides them.
6. **Path prefix** `/api/master-data` — change `KAYAN_MASTER_DATA_PATH` only if the deployment differs.
7. **Permissions** are `master_data:read|create|update|delete` server-side; the client sends no
   permission of its own and never treats UI visibility as authorization.

## 13. DESIGN_REQUIRED

1. Live verification of all seven operations against a reachable backend (with a provisioned
   account holding `master_data:*`).
2. Audit-log endpoint (or a decision to hide the audit tab in Real Mode).
3. Lookup/paging limits for `getAllFlat`, and a maximum page size.
4. Permission-introspection endpoint for entity-level `can_view/can_create/...`.
5. `generateNextNumber` / `getFieldOptions` / `getParentRecords` endpoints if those UI features
   are required in Real Mode.
6. Session continuity: the C1 token is in-memory, so a reload re-authenticates before master data
   can be fetched.
7. Pre-existing and unchanged: browser DB still carries `password_hash` (RB-1) and the SPA bundle
   still carries default signing/encryption constants (RB-2); browser SQLite is still the source of
   truth for every other module.

## 14. LIVE MASTER DATA = **NOT VERIFIED**

The Kayan backend was not reachable from this environment. No live master-data request succeeded,
none was simulated, and no live CRUD claim is made.

## 15. Status: **READY_FOR_REVIEW**

Client-side Master Data REST integration is complete, Mock Mode is verified unchanged, all errors
match the documented backend contract, and every real-mode behaviour that could be verified without
the backend has been. Closing item 14 requires a reachable Kayan deployment and a provisioned
`master_data` account. **C3 is not started.**
