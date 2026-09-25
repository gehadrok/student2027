# KAYAN SCHOOL ERP — PG-6 Authentication & RBAC Foundation
## Phase 1 — Read-Only Preflight Audit

- **Plan:** PG-6
- **Title:** Server Authentication + RBAC Foundation (PostgreSQL)
- **Status:** Preflight complete (no production code modified)
- **Date:** 2026-08-25
- **Author:** Autonomous implementation (opencode)

> This document is strictly read-only inventory. No source files were modified while
> producing it. Code changes begin in Phase 2+.

---

## 1. Scope of Inventory

Auth/security surface inspected:

- `AuthService` (server)
- `IAuthProvider`
- `users` table (PostgreSQL + browser SQLite)
- `roles`, `permissions`, `user_roles`, `role_permissions` tables
- existing auth routes/controllers (none found)
- JWT/session code (`TokenService`, `SessionService`)
- current localStorage authentication (`src/lib/db.ts`)
- password handling (`HashService`)
- current role checks (`role === ...`)
- protected/unprotected API endpoints (`server.ts`)
- audit/security code (`audit_logs`, `addAuditLog`)

---

## 2. Existing Authentication Architecture

### 2.1 Server-side (`src/core/auth`, `src/core/security`)
| Component | File | Notes |
|---|---|---|
| `AuthService` | `src/core/auth/AuthService.ts` | `login()` queries `users` by email+status, verifies `password_hash` via `HashService`, issues token via `TokenService`. Holds a **stateful `currentUser` singleton** — unsuitable for multi-user concurrent REST (see §6). |
| `IAuthProvider` | `src/core/auth/IAuthProvider.ts` | Interfaces: `LoginRequest`, `AuthResult`, `UserCredentials`. `UserCredentials.passwordHash?` documented as server-side-only, never to be returned/persisted. |
| `HashService` | `src/core/security/HashService.ts` | Web Crypto SHA-256. `verify()` = `hash(plain) === stored`. **Unsalted** (weakness — see §6). |
| `TokenService` | `src/core/security/TokenService.ts` | "Simulated JWT" — base64 header/body + **non-cryptographic signature** (`hash` simulation, NOT HMAC). Hardcoded default secret `'al-salam-school-jwt-secret-key'` (source-controlled credential — see §6). |
| `SessionService` | `src/core/security/SessionService.ts` | **Browser-only** (`localStorage` key `al_salam_session_v2`). Stores token + `user` payload (no `password_hash`). Not wired into app yet. |
| `EncryptionService` | `src/core/security/EncryptionService.ts` | Present; not used by current auth path. |

### 2.2 Frontend authentication (`src/lib/db.ts`, `LoginScreen.tsx`)
- `getRealmDB()` / `setCurrentUser()` / `getCurrentUser()` drive login against **browser SQLite**.
- `setCurrentUser(user)` → `localStorage.setItem('al_salam_school_current_user_v1', JSON.stringify(user))`.
- **`SQLiteRepository.getUsers()` (line 140) SELECTs `password_hash`** and maps it to `passwordHash` (line 157). The returned `User` therefore carries `passwordHash`, and `getCurrentUser()` can return it from `localStorage`. → **`password_hash` reaches browser persistence** (confirmation pending Phase 7 scan; classed as likely **A** defect).
- `LoginScreen.handleQuickDemoLogin(role)` performs demo login with in-memory demo users (no real credential check).
- `AuthService`/`SessionService` (core) are currently **not referenced** by the frontend or server routes — orphaned foundation.

### 2.3 Server endpoints (`server.ts`)
| Endpoint | Protected? |
|---|---|
| `GET /api/health` | No (intended public) |
| `POST /api/ai/*` (analyze-student, chat, timetable-conflicts, insights) | **No** (unprotected) |
| `GET/POST /api/academic` (via `createAcademicRouter`) | **No** |
| `GET/POST/PUT/DELETE /api/master-data` (via `createMasterDataRouter`, PG-5) | **No** (target of Phase 6) |
| `/api/auth/*` | **Does not exist** (to be added in Phase 4) |

---

## 3. Database Security Tables (PostgreSQL)

Source: `migrations/postgres/`. Created in `004_students_teachers.sql` (users) and `008_security_organization.sql` (the rest).

### 3.1 `users` (`004_students_teachers.sql`)
```
id TEXT PK
name TEXT NOT NULL
role TEXT NOT NULL CHECK (role IN ('admin','teacher','student','parent'))
email TEXT NOT NULL UNIQUE
password_hash TEXT NOT NULL
linked_teacher_id / linked_student_id / linked_parent_id TEXT
status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended'))
```
- `role` is **constrained to exactly 4 values** — concrete evidence for role names.

### 3.2 `roles`, `permissions`, `user_roles`, `role_permissions` (`008_security_organization.sql`)
- All four tables exist but are **EMPTY**.
- Migration comment: *"Seed values (the 14-role / permission matrix) are DEFERRED to PG-6 per PG-4.1 Design D §4.4 — no invented roles/permissions here."*

### 3.3 `audit_logs` (`008`)
- `id, user_id, user_name, user_role, action, details, timestamp, ip`. FK to `users`.

### 3.4 `school_settings` (`008`)
- Generic 1-row placeholder (no Al-Salam/Yemen values).

---

## 4. Role / Permission Evidence

### 4.1 Evidenced role names
`admin`, `teacher`, `student`, `parent` — confirmed by:
- `users.role` CHECK constraint (`004_students_teachers.sql:32`).
- ~30 frontend files using `role === 'admin' | 'teacher' | 'student' | 'parent'` (e.g. `AttendanceScreen.tsx`, `FinancialScreen.tsx`, `Navbar.tsx`, `Sidebar.tsx`, `LoginScreen.tsx`).

### 4.2 Permission catalog
**No permission catalog exists anywhere in the source tree.** No `permissions` seed, no permission-code constants, no `requirePermission` calls.

### 4.3 Classification (per PG-6 strict rule)
- The **four role names** are evidenced (DB constraint + frontend) → may be referenced.
- The **full 14-role / permission matrix** is **DESIGN_REQUIRED — EVIDENCE REQUIRED**. Do NOT fabricate.
- The initial admin user / provisioning is operational and **DESIGN_REQUIRED**.

---

## 5. Current Authorization Mechanism

Authorization today is **scattered, client-side `role ===` checks** in ~30 UI files (e.g.
`{currentUser.role === 'admin' && <AdminButton/>}`). There is no server-side, centralized,
resource/action permission evaluation. This is the anti-pattern PG-6 Phase 5 must replace.

---

## 6. Findings (raw, classified in Phase 9)

| # | Area | Observation | Preliminary class |
|---|---|---|---|
| F1 | `TokenService` | Signature is non-cryptographic (`hash` simulation), not HMAC-SHA256; default secret hardcoded in source. | **A** (defect) → harden in Phase 3/4 |
| F2 | `HashService` | Password hashing is SHA-256 **without salt**. | **A/B** → document; algorithm upgrade deferred (would break existing hashes) |
| F3 | `AuthService` | Stateful `currentUser` singleton — not safe for concurrent REST. | **A** → replace with stateless token model |
| F4 | `db.ts` / `SQLiteRepository` | `password_hash` selected and persisted to `localStorage`. | **A** → fix in Phase 7 |
| F5 | Server | No `/api/auth/*`; all APIs unprotected. | **B** (transitional) → Phase 4/6 |
| F6 | Frontend | Authorization via scattered `role ===`. | **B** (transitional) → Phase 5 replaces server-side; frontend migration deferred |
| F7 | RBAC seed | `roles`/`permissions`/`user_roles`/`role_permissions` empty. | **DESIGN_REQUIRED** (do not fabricate) |

---

## 7. What PG-6 Will and Will Not Do (preflight conclusions)

**Will implement (supported by existing approved design):**
- Server-side authentication endpoints reusing `AuthService` (datasource + `HashService` + `TokenService`), hardened to real HMAC-SHA256 + env secret.
- Central `RbacService` (User→Role→Permission→Resource→Action), deny-by-default.
- `authenticate` + `requirePermission` middleware; apply to PG-5 Master Data API.
- Phase 7 fix to stop `password_hash` reaching browser persistence.
- Live security tests (14 scenarios).

**Will NOT do (strict scope):**
- Fabricate the 14-role matrix or a permission catalog (production seed = DESIGN_REQUIRED).
- Perform frontend-wide API migration.
- Migrate Al-Salam data, remove SQLite, delete `getRealmDB`/`saveRealmDB`, implement offline sync, multi-school tenancy, or start PG-7.
- Invent an auth mechanism beyond the existing `AuthService`/`TokenService` design.

**Test-only scaffolding (clearly labeled, not production seed):**
- Roles `admin`/`teacher`, `master_data` permissions, and test users will be inserted in
  test `before()` hooks and removed in `after()`. Production remains deny-by-default
  until an operator provisions roles/permissions/users (DESIGN_REQUIRED).
