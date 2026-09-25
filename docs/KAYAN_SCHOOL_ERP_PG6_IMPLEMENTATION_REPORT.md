# KAYAN SCHOOL ERP — PG-6 Authentication & RBAC Foundation
## Implementation Report

- **Plan:** PG-6
- **Title:** Server Authentication + RBAC Foundation (PostgreSQL)
- **Status:** Complete
- **Final Verdict:** `PG-6: PASS — READY FOR PG-7`
- **Date:** 2026-08-25
- **Author:** Autonomous implementation (opencode)

---

## 1. Objective Met

Implemented a server-side authentication and centralized RBAC boundary over PostgreSQL,
reusing the existing approved `AuthService`/`TokenService`/`HashService` design and the
PG-4.x `users / roles / permissions / user_roles / role_permissions` tables. The PG-5
Master Data API is now protected by `authenticate` + `requirePermission` guards with
deny-by-default.

---

## 2. What Was Built

### 2.1 Files created
| File | Purpose |
|---|---|
| `src/core/auth/RbacService.ts` | Central permission evaluation: User→Role→Permission→Resource→Action, deny-by-default. |
| `src/core/auth/authMiddleware.ts` | `authenticate` (Bearer JWT) + `requirePermission(resource, action)` guards. |
| `src/core/auth/authRoutes.ts` | `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/profile`, `POST /api/auth/logout`. |
| `src/core/auth/rbacTestSeed.ts` | **Test-only** RBAC seed (admin/teacher roles, `master_data` perms, two users). Removed in `after()`. |
| `src/core/auth/pg6.auth.live.test.ts` | 14 live auth/RBAC scenarios. |
| `docs/KAYAN_SCHOOL_ERP_PG6_AUTH_RBAC_PREFLIGHT_AUDIT.md` | Phase 1 read-only inventory (this phase's companion). |
| `docs/KAYAN_SCHOOL_ERP_PG6_IMPLEMENTATION_REPORT.md` | This report. |

### 2.2 Files modified
| File | Change |
|---|---|
| `src/core/security/TokenService.ts` | Real **HMAC-SHA256** over `header.body` (was a non-cryptographic simulation); secret from `AUTH_SECRET` env (no hardcoded fallback credential); portable via Web Crypto (`crypto.subtle`) so the module is browser-bundle-safe; `generate`/`verify` are now async. |
| `src/core/auth/AuthService.ts` | **Fixed a critical bug:** `hashService.verify(...)` was called without `await`, so password checks never ran — any password was accepted. Now awaited. Also returns `email` in `AuthResult`. |
| `src/core/auth/IAuthProvider.ts` | `AuthResult.email` added. |
| `src/modules/master-data/api/masterDataRoutes.ts` | Every route wrapped with `authenticate` + per-action `requirePermission('master_data', action)`. |
| `src/modules/master-data/api/masterDataController.ts` | Passes the authenticated principal's id as the audit user. |
| `src/modules/master-data/api/masterDataApiService.ts` | Accept a `defaultAuditUser` (authenticated principal) instead of a hardcoded `'api'`. |
| `src/lib/db.ts` | **Frontend boundary fix:** `setCurrentUser` now strips `password_hash`/`passwordHash` before writing to `localStorage`. |
| `server.ts` | Mounts `createAuthRouter()` at `/api/auth`. |
| `pg5.masterData.api.live.test.ts` | Updated to authenticate (Master Data API is now protected). |

---

## 3. RBAC Model (Phase 5)

```
User ─(user_roles)→ Role ─(role_permissions)→ Permission ─→ Resource + Action
```

- Centralized in `RbacService`; no scattered `role ===` checks server-side.
- Deny-by-default: unknown user / missing link / no matching permission ⇒ empty set ⇒ denied.
- Semantic status split: **401** unauthenticated, **403** authenticated-but-unauthorized.
- API-level enforcement on the Master Data API: GET→`read`, POST→`create`, PUT→`update`,
  DELETE→`delete`, bulk→`create`/`delete`.
- **School scope (D3):** single deployment = one school; no `school_id` FK injected into
  every table.

---

## 4. Authentication API (Phase 4)

| Endpoint | Auth | Behavior |
|---|---|---|
| `POST /api/auth/login` | public | Server-side credential verification via `AuthService` (datasource + `HashService`); issues HMAC-SHA256 JWT. Generic error (no user/password distinction). |
| `POST /api/auth/refresh` | authenticated | Re-issues a JWT from a valid token. |
| `GET /api/auth/profile` | authenticated | Returns user + permission codes; **never** `password_hash`. |
| `POST /api/auth/logout` | authenticated | Stateless: client discards token (server-side revocation deferred — documented). |

**Security guarantees (Phase 3):** `password_hash` is never selected into any response,
never sent to the frontend, never stored in `localStorage`; verification is server-side;
passwords/credentials are never logged and never appear in source-controlled config
(`AUTH_SECRET` is read from the environment).

---

## 5. Security Fixes (notable)

1. **Password verification was bypassed** — `AuthService.login` omitted `await` on the
   async `hashService.verify`, so `isValid` was always a truthy Promise and *any* password
   succeeded. Now correctly awaited. (Caught by the new PG-6 "invalid password → 401" test.)
2. **Weak token signature** — replaced the non-cryptographic "hash simulation" with real
   HMAC-SHA256; removed the hardcoded default secret from source.
3. **`password_hash` in browser persistence** — `db.ts` `setCurrentUser` now strips it
   before `localStorage` write.

---

## 6. Test Evidence (Phase 8 / Phase 10)

Run serially against live `kayan_school_erp` PostgreSQL:

| Suite | Tests | Result |
|---|---|---|
| `pg4.migrations.live.test.ts` (idempotency) | 14 | ✅ |
| `pg4.repositories.live.test.ts` | 5 | ✅ |
| `pg4.sweep.live.test.ts` (FK/orphan) | 3 | ✅ |
| `postgres.live.test.ts` | 14 | ✅ |
| `pg45.repositories.coverage.live.test.ts` | 9 | ✅ |
| `pg5.masterData.api.live.test.ts` | 11 | ✅ |
| `pg6.auth.live.test.ts` | 14 | ✅ |
| **Total** | **70** | **0 failures** |

The 14 PG-6 scenarios: valid login; invalid password→401; unknown user→401;
password_hash exclusion; authenticated profile; unauthenticated API→401; authenticated
unauthorized→403; authorized→201; permission denial; role/permission mapping; refresh;
logout; Master Data authorization matrix; no credential leakage.

`npm run build` → **success**. `tsc --noEmit` → only pre-existing, unrelated frontend
errors (`App.tsx`, `GlobalSearchBar.tsx`, `ActiveReportPrintView.tsx`); no PG-6 errors.

---

## 7. Scope Control (strict)

| Constraint | Adhered |
|---|---|
| No Al-Salam / customer data migration | ✅ |
| No deletion of browser SQLite / `getRealmDB` / `saveRealmDB` | ✅ (untouched) |
| No frontend-wide API migration | ✅ (only server-side boundary added) |
| No offline sync / multi-school tenancy | ✅ |
| No fabrication of the 14-role matrix / permission catalog | ✅ |
| Did not start PG-7 | ✅ |

### 7.1 Production seed = DESIGN_REQUIRED
Per PG-6 strict rule, the **production** role/permission/user seed was **not fabricated**.
- Evidenced role names (`admin`, `teacher`, `student`, `parent`) come from the `users.role`
  CHECK constraint and frontend `role ===` usage.
- The full permission matrix and the initial admin provisioning are **DESIGN_REQUIRED —
  EVIDENCE REQUIRED** and intentionally left unseeded. Production therefore defaults to
  **deny-by-default** until an operator provisions roles/permissions/users.
- Test scaffolding (admin/teacher roles, `master_data` permissions, two users) exists
  **only** in `rbacTestSeed.ts`, inserted in test `before()` and removed in `after()` —
  it never runs in production.

---

## 8. Handoff to PG-7

1. **Provision production RBAC**: finalize the 14-role / permission matrix (DESIGN_REQUIRED)
   and seed an initial admin user (operational task).
2. **Extend protection** to `/api/academic` and `/api/ai/*` (currently transitional/unprotected).
3. **Frontend cutover**: rewire `LoginScreen`/`db.ts` to call `/api/auth/*` and carry the
   bearer token; replace scattered `role ===` UI checks with permission-driven rendering.
4. **Revocation**: consider server-side token revocation (refresh-token store / denylist).
5. **Password hashing**: consider salted hashing (e.g., bcrypt/argon2) — current SHA-256 is
   unsalted (documented limitation, not changed to avoid breaking existing hashes).

---

## 9. Final Verdict

All PG-6 acceptance criteria satisfied: server-side authentication over PostgreSQL with
real HMAC-SHA256 tokens, centralized deny-by-default RBAC protecting the Master Data API,
`password_hash` removed from every response and from browser persistence, 70/70 live tests
green, build passing, scope strictly honored, and the production seed explicitly flagged
DESIGN_REQUIRED (not fabricated).

**`PG-6: PASS — READY FOR PG-7`**
