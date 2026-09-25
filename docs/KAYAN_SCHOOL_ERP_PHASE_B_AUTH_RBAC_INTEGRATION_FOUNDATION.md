# Kayan School ERP — Phase B: Auth / RBAC Integration Foundation

> **Scope:** frontend integration boundary only. This phase connects *nothing* new to a backend.
> It prepares this project to talk to the **existing Kayan School ERP REST API** later while
> **Mock Mode keeps working exactly as in Phase A**.
>
> **Explicitly not done in Phase B:** no new Express server, no new PostgreSQL database, no
> migrations, no full REST integration, no new screens, no UI redesign, no speculative
> permission matrix, no business-rule changes, `MockDataSource` / browser SQLite not removed,
> no Phase C, no commit.

---

## 1. Pre-flight findings

The primitives named in the Phase B brief did **not** exist in this repository before Phase B.
They were created here as the integration boundary:

| Expected primitive | Pre-flight state |
|---|---|
| `AuthContext` / `useAuth` | **Absent.** `App.tsx` read `getCurrentUser()` directly, plus a 5 s polling `setInterval`. |
| `can()` / `CAPABILITY_PROFILES` | **Absent.** RBAC was a hardcoded `roles: UserRole[]` array inside `Sidebar.tsx` plus scattered `role ===` checks in screens. |
| `ApiClient` | **Absent.** Two independent raw `fetch` call sites (`academicApiClient.ts`, `ai-client.ts`); no token, no 401/403 handling. |
| `MockDataSource` | **Absent.** "Mock" is browser sql.js SQLite (`src/lib/sqlite-engine.ts` + `sqlite-repository.ts`), static seed, and hardcoded UI fallbacks. |
| `USE_MOCK` | **Absent.** No mock/live switch existed anywhere (source, env, config). |

Additional pre-flight findings that shaped the design:

1. **Five divergent identity models** — `User` (`types.ts`), `LoginRequest`/`AuthResult`
   (`IAuthProvider.ts`), `UserCredentials`, `TokenPayload` (`TokenService.ts`), `Session`
   (`SessionService.ts`). `User` *requires* `passwordHash`, so an API-shaped user could not be
   assigned to it. Phase B adds **one** frontend session contract and reuses `UserRole`.
2. **Fail-open auto-login.** `getCurrentUser()` falls back to the first seeded user
   (`ORDER BY name ASC`) when no session is stored, so a fresh browser is authenticated without
   a login event. Verified in the browser: a fresh profile boots straight into a session as a
   teacher-role profile. **Preserved on purpose** in Mock Mode (Phase A behaviour) and explicitly
   forbidden in Live Mode; removal is a cutover task, not a Phase B task.
3. **Password material already reaches the browser** in Mock Mode: `SQLiteRepository.getUsers()`
   selects `password_hash`, and the whole browser SQLite database is persisted base64-encoded in
   `localStorage`. Pre-existing; not introduced by Phase B; scheduled for removal with the
   browser-database decommission.
4. **Hardcoded secrets in the SPA bundle** — `ConfigService.ts` JWT/encryption fallbacks and
   `EncryptionService.ts` are constructed by the browser bootstrap (`main.tsx` →
   `initializeInfrastructure`). Pre-existing, untouched in Phase B (see DESIGN_REQUIRED #1).
5. **Token model is not browser-verifiable.** `SessionService` verifies tokens with its own
   browser `TokenService`, which cannot validate a server-signed token. Phase B therefore treats
   the token as **opaque** and never signs or verifies it in the browser.
6. **Scattered role checks / cross-role exposure** (global search, keyboard shortcuts, library,
   documents, calendar, certificates) — documented, not changed: replacing them is Phase C work
   (PG-6 handoff #3).
7. **Server-side evidence available for the auth contract** (uncommitted Phase A server work):
   `POST /api/auth/login`, `GET /api/auth/profile`, `POST /api/auth/refresh`,
   `POST /api/auth/logout`, bearer auth, `401` from `authenticate`, `403` from
   `requirePermission`, and permission codes `master_data:read|create|update|delete`.
8. **Only `master_data:*` permission codes are evidenced.** The production RBAC seed is
   intentionally empty (deny-by-default) per PG-6 §7.1, so no wider matrix may be invented.

---

## 2. Mode switch (the future cutover)

`src/lib/runtime/mode.ts` is the single place that decides the mode; no module reads the
environment on its own.

| Variable | Read by | Meaning |
|---|---|---|
| `USE_MOCK` | Node context | `true` = Mock Mode, `false` = Live Mode |
| `VITE_USE_MOCK` | browser bundle | same, because Vite only exposes `VITE_*` |
| `KAYAN_API_BASE_URL` | Node context | base URL of the existing Kayan REST API |
| `VITE_KAYAN_API_BASE_URL` | browser bundle | same |

`USE_MOCK` **defaults to `true`**, so `USE_MOCK=true` keeps the exact Phase A behaviour.
`KAYAN_API_BASE_URL` defaults to empty (same-origin: dev server / reverse proxy) and must never
contain credentials, tokens, or secrets. Both are documented in `.env.example`.

```
Mock Auth/Data  ──USE_MOCK=true──▶  mockAuthGateway + browser SQLite repositories
                 ──USE_MOCK=false─▶  realAuthGateway + Kayan REST API (ApiClient)
```

---

## 3. Auth contract

Source of truth: `src/lib/auth/contract.ts`.

### Session shape

```ts
interface AuthUser {                       // never contains credential material
  id: string; name: string; email: string; role: 'admin'|'teacher'|'student'|'parent';
  status?: string; phone?: string; photo?: string; avatarColor?: string;
  linkedStudentIds?: string[]; linkedTeacherId?: string; lastLogin?: string;
}

interface AuthSession {
  user: AuthUser;
  permissions: readonly string[];          // server-issued codes; [] in Mock Mode
  token: string | null;                    // opaque; in-memory only
  mode: 'mock' | 'live';
  authenticatedAt: string;
}
```

`toAuthUser()` builds `AuthUser` from a **whitelist** of fields, so `passwordHash`,
`password_hash`, `password` and any unknown backend field can never enter the frontend session
(enforced by tests).

### Operations

| Operation | Mock Mode | Live Mode |
|---|---|---|
| login | `mockAuthGateway.login` — identical Phase A credential check and messages | `POST /auth/login` → store opaque token → `GET /auth/profile` for permissions |
| logout | clears the Phase A current-user entry | best-effort `POST /auth/logout`, **always** clears the client session |
| current profile / session | `restoreMockSession()` from the Phase A session entry | `GET /auth/profile` |
| token handling | none | `MemoryTokenStore` only — **no token in `localStorage`** |
| 401 | not applicable | `ApiClient` raises `ApiError(401)` → the provider clears the session exactly once → `anonymous` |
| 403 | not applicable | `ApiError(403)` is surfaced; **the session is not cleared** |
| role switch | mock-only demo/switch affordance (`switchRole`) | disabled; the switcher is not rendered |

`AuthContext` exposes `status` (`initializing` / `authenticated` / `anonymous`), `user`,
`session`, `permissions`, `failure`, `login`, `logout`, `refreshSession`, `switchRole`, `can`.
`useAuth()` throws outside its provider, matching the existing `useToast` idiom.

**No parallel authentication was created.** The mock gateway only wraps the existing Phase A
login path; the live gateway only calls the existing `/api/auth/*` endpoints.

---

## 4. RBAC contract

`Role → Permission → Resource → Action` is preserved, with the frontend acting as **UX only**.

- `PermissionAction = 'read' | 'create' | 'update' | 'delete'`
- `Capability = 'ui:<resource>:<action>'` — a **frontend** capability, deliberately namespaced so
  it can never be confused with a backend permission code.
- `CAPABILITY_PROFILES` maps each of the four evidenced roles to its capabilities. It mirrors the
  previously hardcoded `Sidebar` role arrays **exactly** (19 / 10 / 9 / 10 items), so navigation
  visibility is unchanged in Mock Mode. Parity is asserted by tests.
- `CAPABILITY_PERMISSION_BINDING` maps capability → server permission code. It is intentionally
  **empty**: the only evidenced codes are `master_data:*`, and inventing the rest is forbidden.
- `can()` resolution:
  - Mock Mode → role capability profile.
  - Live Mode → `session.permissions.includes(binding[capability])`; **unbound ⇒ denied**.
  - No session, unknown role, unknown capability, or missing action ⇒ **denied**.
- Real authorization stays server-side (`authenticate` + `requirePermission`). Frontend `can()`
  hides UI only; it is not a security boundary, and hiding a control is not authorization.

---

## 5. Data scope contract

`src/lib/api/dataScope.ts` documents the expectation per role without inventing relationships or
backend rules. It is declarative only — the client never filters and never sends a scope
parameter (`requestParameter: null`, `clientSideFiltering: 'forbidden'`).

| Role | Expected scope | Subject | Evidence used |
|---|---|---|---|
| Admin | `school` | all school records | admin-only Sidebar destinations |
| Teacher | `assigned` | assigned classes | Sidebar label "طلاب فصولي" + TeacherDashboard |
| Student | `own` | own record only | Sidebar labels "جدولي الدراسي", "سجل الحضور", "درجاتي ونتاجي", "شهاداتي التقديرية" |
| Parent | `children` | linked children only | Sidebar labels "متابعة الأبناء", "درجات الأبناء", "الأقساط والرسوم" |

Every entry carries its `openQuestions` (relationship source, assignment source, resource list)
so nothing is silently assumed. `isClientSideScopingPermitted()` returns `false` by design.

---

## 6. API adapter

`src/lib/api/ApiClient.ts` + `src/lib/api/index.ts`:

- one configured `apiClient` (base URL, token provider, 401 handler registration);
- `Authorization: Bearer <token>` attached when a token exists, never for `withAuth: false`;
- query serialization, JSON body/headers, `AbortSignal` support, injectable `fetch` for tests;
- all failures normalized to `ApiError` with `status`, `kind`
  (`unauthorized` / `forbidden` / `client` / `server` / `network`), and the backend
  `{ error, details }` envelope; non-JSON bodies are never reflected back to the UI;
- `401` → `onUnauthorized` (session cleared once by the provider); `403` → thrown, session kept;
- no automatic refresh loop (the current server "refresh" only re-issues, it is not rotation).

Consumers: `academicApiClient.ts` now delegates to `apiClient` and its `AcademicApiError` extends
`ApiError`, so the academic hooks/screens are unchanged. `ai-client.ts` is intentionally **not**
rewired in Phase B (its heuristic fallback semantics need a product decision — DESIGN_REQUIRED #6).

---

## 7. DESIGN_REQUIRED

1. Remove the hardcoded JWT/encryption fallbacks from `ConfigService` / `EncryptionService` (they
   ship in the SPA bundle today). Needs a bootstrap decision, not an auth-contract change.
2. Decommission the browser SQLite mock database (only then can `password_hash` stop existing in
   the browser) and delete the mock auto-login fallback.
3. Final permission matrix and the capability → permission binding, plus production role/permission
   provisioning (already DESIGN_REQUIRED in PG-6 §7.1).
4. Canonical guardian/ownership relationship (`parent_students` vs `user_linked_students` vs
   `students.parent_id`), multi-guardian and primary-guardian semantics.
5. Canonical authenticated-user → student/teacher record relationship, and the exact resource list
   for "own data" / "children data".
6. Token persistence strategy: today the token is in-memory only (a reload re-authenticates). An
   HttpOnly cookie or refresh-token rotation requires backend support; until then this is the D4
   aligned choice.
7. Custom roles beyond the four evidenced ones (D4 allows them) — the frontend currently fails
   closed for any other role value.
8. Field-level visibility matrix (health, guardian contact, finance, documents, notes).
9. Whether `ai-client.ts` heuristic fallbacks must be suppressed on `401`/`403` in Live Mode.
10. Audit identity in Live Mode: `addAuditLog` still reads the browser current-user entry.
11. Master Data API identifier handling (`sortBy` / body keys used as SQL identifiers) — server
    side defect found in pre-flight, out of Phase B scope.
12. Product identity strings (Al-Salam / Yemen / YER) still hardcoded in product code (D6).

---

## 8. Files changed / added

**Added (frontend boundary only):**

- `src/lib/runtime/mode.ts` — `USE_MOCK` / mode / API base URL resolution
- `src/lib/api/ApiClient.ts` — shared client
- `src/lib/api/errors.ts` — `ApiError`, envelope parsing, 401/403 helpers
- `src/lib/api/dataScope.ts` — declarative data scope contract
- `src/lib/api/index.ts` — configured `apiClient`, `MemoryTokenStore`, 401 handler registry
- `src/lib/auth/contract.ts` — auth/session/role contract and failure mapping
- `src/lib/auth/capabilities.ts` — `CAPABILITIES`, `CAPABILITY_PROFILES`, `can()`
- `src/lib/auth/mockAuthGateway.ts` — Mock Mode gateway (Phase A behaviour, unchanged)
- `src/lib/auth/realAuthGateway.ts` — Live Mode gateway for the existing `/api/auth/*`
- `src/lib/auth/AuthContext.tsx` — `AuthProvider` / `useAuth`
- `src/lib/auth/index.ts` — public surface
- `src/lib/api/ApiClient.test.ts`, `src/lib/auth/capabilities.test.ts`, `src/lib/auth/contract.test.ts`

**Modified (no UI redesign, no new screens):**

- `src/App.tsx` — auth state via `useAuth`; removed the 5 s user polling; unknown role no longer
  falls back to the admin dashboard
- `src/components/LoginScreen.tsx` — credentials go through the auth boundary; demo cards and the
  demo-password note are Mock-Mode only
- `src/components/Navbar.tsx` — role switcher hidden outside Mock Mode; `settings` optional
- `src/components/Sidebar.tsx` — visibility driven by capabilities instead of inline role arrays
- `src/components/SwitchUserModal.tsx` — delegates to `switchRole` instead of writing storage
- `src/modules/academic/presentation/api/academicApiClient.ts` — routed through `ApiClient`
- `.env.example` — documents `USE_MOCK` / `VITE_USE_MOCK` / API base URL
- `package.json` — `npm test` script (Phase B tests + existing `AuthService.security.test.ts`)

---

## 9. Verification actually executed

| Check | Command / method | Result |
|---|---|---|
| Unit + contract tests | `npm test` | **36/36 pass** |
| Existing auth security test | included in `npm test` | pass |
| Type check | `npm run lint` | 9 errors, all pre-existing (`ActiveReportPrintView`, `GlobalSearchBar`); was 11 before Phase B — the two `App.tsx` prop errors are gone; **0 in Phase B files** |
| Production build | `npm run build` | pass (Vite bundle + `dist/server.cjs`) |
| Mock login (valid / invalid) | headless Edge via CDP | pass — Phase A messages preserved |
| Four roles + role-specific navigation | headless Edge via CDP | pass — nav sets identical to Phase A (19/10/9/10) |
| Role-specific dashboards | headless Edge via CDP | pass (admin/teacher/student/parent render) |
| Logout | headless Edge via CDP | pass — session cleared, login screen shown |
| No password material in the persisted session | headless Edge via CDP | pass — 255-byte entry, no `password*` |
| Mock data read path | headless Edge via CDP | pass — students table renders 3 seeded rows |
| Mock CRUD (data layer) | `npx tsx scripts/run-master-data-runtime.mjs` | **317 passed, 0 failed** (real SQLite) |
| Mock CRUD (browser add/edit/delete modal) | headless Edge via CDP | **NOT VERIFIED** — see finding below |
| Live Mode against a real Kayan backend | — | **NOT VERIFIED** — the existing backend integration is Phase C; deny-by-default verified by unit test only |
| Live PostgreSQL suites | `pg6.auth.live.test.ts`, `pg5…live.test.ts` | not run (require a live PG database; out of Phase B scope) |

**Mock CRUD browser finding (honest):** driving the students *add* modal through headless
automation was not reliable. The identical script was run against the **pre-Phase-B** UI (Phase B
UI files temporarily stashed) and failed the same way, so this is a **pre-existing UI/automation
instability, not a Phase B regression**. The students read path and the data-layer CRUD both pass.

---

## 10. Status

**READY_FOR_REVIEW** — the integration boundary exists, Mock Mode is unchanged and verified, the
build and tests pass, and no backend, database, migration, screen, or permission rule was invented.
Live Mode is intentionally deny-by-default until the permission binding and ownership model are
decided (DESIGN_REQUIRED #3–#5). **Phase C is not started.**
