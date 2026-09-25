# Kayan School ERP — Phase C1: Real Auth API Integration

> **LIVE AUTH = NOT VERIFIED.** The Kayan School ERP backend was **not reachable** from the
> development environment, so no successful live authentication was performed or simulated.
> Everything below describes the **client contract** and the verified Mock Mode / Real Mode
> behaviour; live authentication stays NOT VERIFIED until the backend is reachable and tested.

> **Scope:** authentication only. This frontend is a **client** of the Kayan School ERP REST API.
> No backend, no PostgreSQL, no migrations, no direct database access, no UI redesign, no commit.
> Module data integration (students, teachers, classes, subjects, attendance, grades, finance,
> library, calendar, reports, documents) is **out of scope** and belongs to later phases.

---

## 0. Backend requirements to connect the real Kayan API (acceptance checklist)

The client is complete and waiting only for a backend that satisfies the following. Nothing here
is a client guess: each item is what the client already sends or already requires.

### 0.1 Required endpoints

| # | Operation | Method | Path | Request | Auth |
|---|---|---|---|---|---|
| R1 | Login | `POST` | `/api/auth/login` | credentials (see 0.2) | none |
| R2 | **Profile — mandatory** | `GET` | `/api/auth/profile` | none | `Authorization: Bearer <token>` |
| R3 | Logout | `POST` | `/api/auth/logout` | none | `Authorization: Bearer <token>` |

R2 is **required, not optional**: login does not return permissions, so `/api/auth/profile` is the
only source of the session identity and the permission list. If the deployment does not expose it,
live authentication cannot be completed without inventing behaviour — which is not done here.

### 0.2 Expected login request (R1)

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@kayan.test", "password": "<plaintext over TLS>" }
```

- `email` is trimmed; the client sends **nothing else** — no role, no permissions, no client
  claims, no device metadata.
- Transport must be HTTPS outside local development. The client sends no credentials to any host
  other than the configured base URL.

### 0.3 Expected token response (R1)

```json
{ "token": "<opaque string>", "user": { "id": "…", "name": "…", "email": "…", "role": "admin" } }
```

- `token` must be an **opaque** string. The client never decodes, parses, or trusts its claims.
- Only `token` is consumed from this response. The nested `user` object is **not** treated as the
  session identity; the profile endpoint is authoritative.
- A `2xx` response without a usable token is treated as a failed login (fail closed).

### 0.4 Expected profile response fields (R2)

```json
{
  "id": "u1",
  "name": "…",
  "email": "…",
  "role": "admin",
  "status": "active",
  "permissions": ["master_data:read"]
}
```

| Field | Required | Use |
|---|---|---|
| `id` | **yes** | session identity; a response without it is rejected |
| `role` | **yes** | must be one of the role values in 0.6 |
| `name`, `email` | yes (display) | navbar/profile display |
| `status` | recommended | `active` / suspended account handling |
| `permissions` | **yes** (for RBAC UI) | raw server strings, used verbatim; never derived from the role |

Optional, mapped when present: `phone`, `photo`, `avatarColor`, `linkedStudentIds`,
`linkedTeacherId`, `lastLogin`. Any other field (including `password_hash`) is dropped by the
client's whitelist.

### 0.5 401 and 403

| Status | Meaning to the client | Behaviour |
|---|---|---|
| `401` on R1 | invalid credentials | mapped to `invalid_credentials`; the backend message is shown; no session created |
| `401` on R2/R3 | session invalid or expired | session cleared once, UI returns to the login screen |
| `403` | authenticated but not authorized | mapped to `forbidden`; **never** shown as a credential error, and the session is **not** cleared |

`401` and `403` must remain distinct on the backend: collapsing them would make a permission problem
look like a login problem.

### 0.6 Role values

The client accepts **only** these four values, and fails closed on anything else:

`admin` · `teacher` · `student` · `parent`

- Any other role value (e.g. a custom per-school role allowed by D4) is rejected at login with
  `unsupported_role` and the token is discarded.
- The client never infers permissions from the role. If the deployment uses custom roles, the
  mapping must be agreed and added deliberately.

### 0.7 Error envelope

Expected shape (tolerated variants in parentheses):

```json
{ "error": "human readable message", "details": "…", "code": "…" }
```

- `error` (or `message`, or a string `details`) supplies the user-visible message.
- `code` is optional and passed through untouched.
- Non-JSON error bodies (HTML error pages, proxy output) are **never** reflected to the user; a
  generic message with the status is shown instead.
- A transport failure (host unreachable, DNS, TLS, offline) surfaces as a clear connection error.

### 0.8 Refresh / revocation — DESIGN_REQUIRED

- The client performs **no automatic token refresh**. The only re-issue call is an explicit,
  never-invoked helper.
- No refresh-token rotation, no denylist, no revocation endpoint is assumed or implemented.
- If the deployment requires refresh tokens or server-side revocation, the token lifecycle must be
  extended deliberately as a separate decision.

### 0.9 Connection checklist before live verification

1. `VITE_KAYAN_API_BASE_URL` (or `KAYAN_API_BASE_URL`) points at the Kayan deployment — no host is
   hardcoded in the client.
2. `VITE_USE_MOCK=false` is set **and** the app is reloaded (the switch is read at startup).
3. R1/R2/R3 exist with the paths and shapes above.
4. A provisioned account exists whose role is one of the four values in 0.6.
5. CORS/same-origin allows the SPA origin, and TLS is valid.
6. Then, and only then, a live login may be attempted and reported as PASS.

---

## 1. Pre-flight findings (Phase B implementation as found)

| Component | State before C1 |
|---|---|
| `AuthGateway` (`src/lib/auth/contract.ts`) | Complete: `login`, `logout`, `AuthSession`, `AuthUser`, `AuthFailure`, role whitelist |
| `MockAuthGateway` | Complete: preserves the Phase A login behaviour and messages |
| `RealAuthGateway` | Present but **not injectable** (module-level `apiClient`/`tokenStore`) → untestable without a network, and it requested `/auth/login` while the documented and in-repo mount is `/api/auth/login` |
| `AuthContext` | Complete: `status`, `login`, `logout`, `refreshSession`, `switchRole`, `can`; 401 handler registration |
| `ApiClient` | Complete: bearer injection, 401 → `onUnauthorized`, 403 → thrown, normalized `ApiError` |
| Session contract | Complete: `{ user, permissions, token, mode, authenticatedAt }`, credential-free by whitelist |
| Token handling | `MemoryTokenStore` only; no token in `localStorage`; no client-side decode/verification |
| `USE_MOCK` | **DEFECT:** `src/lib/runtime/mode.ts` read `import.meta.env` **dynamically** (`(import.meta as any).env`), which Vite cannot statically replace. In the browser the flag always resolved to the default `mock`, so `USE_MOCK=false` was unreachable. Found by C1 verification, not by the Phase B unit tests (they run in Node, where `process.env` is used). |

---

## 2. API endpoints actually used

| Operation | Method | Path | Auth |
|---|---|---|---|
| Login | `POST` | `/api/auth/login` | none |
| Profile / session | `GET` | `/api/auth/profile` | `Authorization: Bearer <token>` |
| Logout | `POST` | `/api/auth/logout` | `Authorization: Bearer <token>` |
| Re-issue (explicit only, never automatic) | `POST` | `/api/auth/refresh` | bearer |

Base URL comes only from `KAYAN_API_BASE_URL` / `VITE_KAYAN_API_BASE_URL` (empty ⇒ same origin).
No host, port, IP, or credential is hardcoded; asserted by a unit test.

The path prefix is a single exported constant, `KAYAN_AUTH_BASE_PATH = '/api/auth'`
(`src/lib/auth/realAuthGateway.ts`). If the deployed Kayan API exposes a different prefix, that
constant is the only place to change — no screen, repository, or contract depends on the literal.

---

## 3. Request / response mapping

**Login request** — only the two credential fields, email trimmed:

```json
{ "email": "user@kayan.test", "password": "…" }
```

**Login response consumed** (server shape, Phase A in-repo contract for reference):

```json
{ "token": "<opaque>", "user": { "id": "…", "name": "…", "email": "…", "role": "admin" } }
```

Only `token` is taken from the login response. The login `user` object is **not** trusted as the
session identity.

**Profile response consumed** — the single source of the session user and permissions:

```json
{ "id": "…", "name": "…", "email": "…", "role": "admin", "status": "active",
  "permissions": ["master_data:read"] }
```

**Mapping rules**

- `toAuthUser()` keeps a whitelist: `id, name, email, role, status, phone, photo, avatarColor,
  linkedStudentIds, linkedTeacherId, lastLogin`. Everything else — including `password_hash`,
  `password`, and any unknown field — is dropped. A unit test feeds a profile containing
  `password_hash`/`password` and asserts they never reach the session.
- `role` must be one of the four evidenced roles; any other value fails closed
  (`unsupported_role`) and the token is discarded.
- `permissions` are kept as the raw server strings. **No permission is invented and none is
  derived from the role.** The frontend `can()` layer remains UX-only; authorization is server-side.
- Token handling stays inside the auth layer (`MemoryTokenStore`). Nothing decodes, parses, or
  trusts token claims.

**Failure mapping**

| Backend response | `AuthFailure.reason` | Behaviour |
|---|---|---|
| `401` on login or profile | `invalid_credentials` | token cleared, message from the backend envelope |
| `403` | `forbidden` | authorization failure, never reported as a credential problem |
| transport failure | `network` | clear Arabic connection message, token cleared |
| `5xx` | `server` | backend message, token cleared |
| role outside the four | `unsupported_role` | fails closed, token cleared |

---

## 4. Mock Mode result

`USE_MOCK=true` (default) → `MockAuthGateway`, unchanged behaviour:

| Check | Result |
|---|---|
| Mock login (valid / invalid password message) | PASS |
| Four roles + role-specific navigation | PASS (19 / 10 / 9 / 10) |
| Logout | PASS |
| Session storage free of `password*` | PASS |
| Admin CREATE / UPDATE / DELETE + reload persistence | PASS |
| Teacher attendance (record + persistence) | PASS |
| Teacher grade save | PASS (save accepted; teacher-filtered list does not display the new row — verified separately with full visibility) |
| Zero `/api/auth/*` requests in Mock Mode | PASS |

## 5. Real Mode result

`USE_MOCK=false` → `RealAuthGateway` over the shared `ApiClient`. Verified in a browser with a
second dev instance configured with `VITE_USE_MOCK=false`:

| Check | Result |
|---|---|
| No mock auto-session / no auto-login | PASS |
| Mock-only demo role cards hidden | PASS |
| No navigation before authentication | PASS |
| No auth request before the user submits | PASS |
| Login attempt goes to `POST /api/auth/login` | PASS (observed on the wire) |
| Failure shows a clear error, **no silent fallback to Mock Mode** | PASS (stayed on the login screen, no session, no navigation) |
| No token/credential written to browser storage | PASS |

**LIVE AUTH = NOT VERIFIED.** The Kayan School ERP backend is not reachable from this environment
(no configured base URL; the request returned 404 from a local instance without the auth API). No
successful live login was performed, simulated, or claimed. The table above verifies **Real Mode
client behaviour only** — it is not evidence that the real backend authenticates successfully.
Closing this requires the backend requirements in §0 and a real environment.

---

## 6. Security findings

**Verified in this phase**

- No credential material can enter the session: the user projection is a whitelist, verified by test.
- The token is opaque and in-memory only; it is never written to `localStorage`, never decoded, and
  never used for client-side authorization.
- `401` clears the session; `403` does not — authentication and authorization failures stay distinct.
- A failed real login never falls back to the mock gateway, so a broken backend cannot silently
  downgrade into demo data.

### 6.1 Release blockers / tasks (pre-existing — recorded, NOT fixed in C1)

These are **not** C1 defects and were **not** changed in this pass. They must be closed before any
production release.

| ID | Blocker | Where | Required task | Owner phase |
|---|---|---|---|---|
| **RB-1** | **Mock database blob contains `password_hash`.** The whole browser SQLite database is persisted base64-encoded in `localStorage`, and the `users` table inside it carries `password_hash` values, so any user with browser storage access can recover password hashes. | `src/lib/sqlite-engine.ts` (persist), `src/lib/sqlite-repository.ts` (`getUsers()` selects `password_hash`) | Remove credential material from the browser database and stop persisting it to web storage. Blocked by the browser-database decommission (D5 migration not started). Until then: Mock Mode is a **demo/transitional** path, not a production path. | before production |
| **RB-2** | **Hardcoded signing/encryption defaults ship in the SPA bundle.** Literal fallback secrets in the config layer are reachable from the browser bootstrap, so client code can construct a token service with a known secret. | `src/core/config/ConfigService.ts`, `src/core/security/EncryptionService.ts`, constructed via `initializeInfrastructure()` in `src/main.tsx` | Remove the literal defaults; treat the browser as having **no** signing/encryption capability (the Phase B auth layer already treats the server token as opaque and never signs or verifies it). | before production |
| RB-3 | Mock auto-login fallback: with no stored session, Mock Mode restores the first seeded user. | `src/lib/db.ts` (`getCurrentUser`) | Remove at live cutover. Real Mode never uses this path. | C2 / cutover |
| RB-4 | Role switching inside the app (no credential re-entry) is available in Mock Mode. | `SwitchUserModal` via `AuthContext.switchRole` | Mock-only affordance; already hidden outside Mock Mode. Keep hidden. | cutover |

RB-1 and RB-2 are the two items requested to be recorded as release blockers; RB-3/RB-4 are listed
for completeness. **No code was changed for any of them in this pass.**

---

## 7. Backend contract mismatches (integration requirements)

1. **Auth path prefix.** The client now calls `/api/auth/*`. If the deployed Kayan API uses a
   different prefix, change `KAYAN_AUTH_BASE_PATH` only. Not invented — taken from the documented
   contract and the existing in-repo mount.
2. **Login does not return permissions.** The client must call `/api/auth/profile` after login.
   If the deployed API returns permissions in the login response instead, only the gateway mapping
   changes.
3. **Login user object is not authoritative.** The client uses `/api/auth/profile` for identity and
   permissions. If the deployed API does not expose `/api/auth/profile`, the session contract has no
   other evidenced source — an integration blocker to resolve, not to guess.
4. **Role vocabulary.** The client accepts only `admin | teacher | student | parent` and fails closed
   otherwise. D4 allows custom per-school roles; the deployed role strings must be mapped here.
5. **Logout is stateless** in the in-repo contract (no revocation). If the deployed API requires a
   refresh-token or revocation flow, token lifecycle must be extended deliberately — none is invented.
6. **Error envelope.** The client reads `{ error | message | details, code }`. A different envelope
   needs a parser change in `src/lib/api/errors.ts` only.

---

## 8. DESIGN_REQUIRED

1. Live contract confirmation for the points in §0 and §7 (requires access to the Kayan deployment).
2. **Refresh-token / revocation strategy** — no automatic refresh is implemented or invented; see §0.8.
3. Session continuity across reloads in Real Mode (token is in-memory, so a reload re-authenticates).
4. Custom roles beyond the four evidenced ones (D4) — currently rejected fail-closed; see §0.6.
5. Field-level visibility of the profile projection (health, guardian contact, finance).
6. Whether the profile endpoint should be called on every boot, or a lighter session-introspection
   endpoint should be added by the backend.
7. Pre-existing items tracked as release blockers in §6.1 (RB-1 mock DB `password_hash`,
   RB-2 hardcoded signing/encryption defaults); browser data is still authoritative for all modules.

---

## 9. Files changed (C1 only)

- `src/lib/auth/realAuthGateway.ts` — endpoint prefix constant, dependency-injectable
  `createRealAuthGateway()` (default instance unchanged in behaviour), no invented refresh.
- `src/lib/auth/realAuthGateway.test.ts` — **new** 12 contract tests (paths, mapping, 401, 403,
  network, role gate, logout, no refresh, no `password_hash`).
- `src/lib/runtime/mode.ts` — **defect fix**: static `import.meta.env.*` access so Vite actually
  exposes `VITE_USE_MOCK` / `VITE_KAYAN_API_BASE_URL` to the browser.
- `src/lib/runtime/mode.test.ts` — **new** 3 tests (mock default, no hardcoded host, source report).
- `package.json` — `npm test` now includes the two new suites.
- `docs/KAYAN_SCHOOL_ERP_PHASE_C1_REAL_AUTH_INTEGRATION.md` — this document; updated in the final
  review pass to add §0 (backend acceptance checklist) and §6.1 (release blockers). **Documentation
  only — no code change in that pass.**

No screen, repository, database, migration, or Auth/RBAC rule was changed.

---

## 10. Status

**C1 implementation: READY_FOR_REVIEW (accepted).** The client is complete and unchanged.

**LIVE AUTH = NOT VERIFIED.** The Kayan backend was not reachable from the development
environment; no successful live authentication was performed, simulated, or claimed.

**Release blockers open (not fixed, see §6.1):** RB-1 mock DB blob contains `password_hash`;
RB-2 hardcoded signing/encryption defaults in the SPA bundle.

**To close live verification:** satisfy §0.9 (endpoints, shapes, role values, provisioned account,
CORS/TLS, `VITE_USE_MOCK=false` + reload), then attempt a real login and report the result.

**C2 is not started.**
