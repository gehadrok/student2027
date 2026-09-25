# Kayan School ERP — Product Readiness Audit

> **Phase:** Product Architecture Readiness Audit (READ-ONLY).
> **No production code, SQL, schema, UI, package configuration, or PostgreSQL configuration was modified to produce this document.** This is an analysis/specification derived from the actual repository plus the existing PostgreSQL migration documents (`POSTGRESQL_MIGRATION_AUDIT.md`, `POSTGRESQL_MIGRATION_REMEDIATION_PLAN.md`, `POSTGRESQL_R4_DUAL_DATABASE_AUDIT.md`, `POSTGRESQL_R4_1_TARGET_ARCHITECTURE_SPEC.md`, `POSTGRESQL_R3_MASTER_DATA_SCHEMA_REPORT.md`). No business rules were invented; items that cannot be derived from the repository are marked **BUSINESS DECISION REQUIRED**.
>
> **Product vision (from intake):** a generic, installable School ERP under *Kayan Soft*, sellable to many schools, with per-school data isolation and configuration-driven branding/identity/permissions — not a single-school (Al-Salam) system.

---

## 1. Executive Summary

The current codebase is a **single-school, single-tenant, Al-Salam-specific SPA** with a browser-resident SQLite database (`sql.js` in `localStorage`) as the authoritative store for nearly all domains, and a separate server-side SQLite file that serves only the Academic REST module. It is **not** productized:

- **Branding is hardcoded to Al-Salam / "مدرسة خالد ابن الوليد الضالع/جحاف"** in `ConfigService`, seed data, ~10 UI fallback constants, and storage keys. There is **no `Kayan` branding anywhere** in the code; `index.html` still says "My Google AI Studio App".
- **Configuration is hardcoded/Al-Salam-specific**: currency `YER`, timezone `Asia/Aden`, language `ar`, RTL literally hardcoded in JSX, watermark/report headers naming the specific school, default school name/email/phone in seed.
- **No tenant/school/organization/campus concept exists** (grep for `tenant`/`school_id`/`organization`/`campus` returns zero). The schema assumes exactly one school (`school_settings` is a single row, `id=1`).
- **RBAC is primitive**: only 4 roles (`admin|teacher|student|parent`) as a hardcoded union; authorization is scattered inline `currentUser.role === 'admin'` checks across screens — no permission/resource/action matrix, no tenant scope.
- **Authentication is client-side only**: `AuthService` reads the `users` table from the browser DB and returns `password_hash` into `localStorage` (a credential-exposure defect). There is **no server auth endpoint**.
- **Two unsynchronized stores** (browser `localStorage` SQLite + server `data/al-salam-server.db`), only the Academic module served via REST.

The product can be made sellable, but **multiple architecture/business decisions are unresolved** (offline policy, per-school vs multi-tenant DB strategy, data-preservation at cutover, RBAC model/scope, support-access policy, RPO/RTO). The audit therefore ends (§21) with:

`BLOCKED — BUSINESS/ARCHITECTURE DECISIONS REQUIRED`

---

## 2. Current Architecture

**Stack:** React/Vite SPA + Express server; DDD/Clean-Architecture layers; persistence entirely through `sql.js` (SQLite WASM).

**Three runtime data paths (from `POSTGRESQL_MIGRATION_AUDIT.md` §2.1):**
1. **SPA screens (dominant):** `getRealmDB()`/`saveRealmDB()` (`src/lib/db.ts`) → `SQLiteRepository` → `querySqlSync`/`runSqlSync` (`src/lib/sqlite-engine.ts`) → browser `sql.js` in `localStorage` (`al_salam_school_sqlite_db_v1`).
2. **Repository modules (students/teachers/financial/master-data/dashboard):** Service → Repository → `IDataSource` (sync) → `getSQLiteDB()` — browser OR server instance depending on import context.
3. **Academic module (server-only REST):** SPA → `academicApiClient` → `server.ts` → `academicRoutes` → Services → SQLite\*Repositories → server `sql.js` (`data/al-salam-server.db`).

**Server surface:** only `/api/academic/*` (`src/modules/academic/api/academicRoutes.ts`) and `/api/ai/*` (`src/lib/ai-client.ts` fetches). No auth, no other domain APIs.

**Roles:** `UserRole = 'admin' | 'teacher' | 'student' | 'parent'` (`src/types.ts:1`). Authorization = inline `role ===` checks + `Sidebar` `roles` arrays. No permission service.

**Config:** `ConfigService` (`src/core/config/ConfigService.ts`) reads env with hardcoded Al-Salam/Yemen defaults; in a browser SPA `process.env` is unset, so defaults always apply.

---

## 3. Productization Assessment

| Dimension | Today | Product-ready? |
|---|---|---|
| Branding | Al-Salam hardcoded; no Kayan brand | ❌ |
| Multi-school | Single school, no tenant keys | ❌ |
| Configuration | Hardcoded constants/defaults | ❌ |
| RBAC | 4 roles, inline checks | ❌ |
| Auth | Client-side, exposes `password_hash` | ❌ |
| Data ownership | Browser DB authoritative | ❌ |
| REST coverage | Academic + AI only | ❌ |
| Tenant isolation | None | ❌ |
| Audit trail | Split browser/server, partial | ⚠️ |
| Backup/restore | Config only, no PG impl | ⚠️ |
| Localization | RTL hardcoded, `ar` default | ⚠️ |

**What exists and is reusable (generic, not school-specific by nature):** the DDD layering, `IDataSource`/`UnitOfWork`/`EventBus` seams, the Academic module's full REST stack (proven pattern), the master-data `TABLE_MAP` + CRUD engine (33 entities), `ConfigService` abstraction (even if defaults are wrong), `AuthService`/`IAuthProvider` seam, `AuditService` seam, `LocalStorageProvider`, `system_numbering` generator, the `school_settings` single-row model (a starting point for config).

**What blocks selling to another school (answer to intake question 13):** hardcoded Al-Salam identity everywhere; single-school schema with no `school_id`; client-side auth with credential leakage; no tenant isolation; no per-school configuration/branding pipeline; no RBAC; no server-side persistence for non-academic domains; no backup/restore implementation; no installation/customer identity.

---

## 4. Al-Salam Coupling Audit

**A. Product branding (must become Kayan School ERP by Kayan Soft):**
- `src/core/config/ConfigService.ts:63` — `appName: 'Al-Salam School Management System'`.
- `src/modules/master-data/types/index.ts:2` — comment "Al-Salam School ERP".
- `index.html` `<title>My Google AI Studio App</title>` (placeholder; not even Al-Salam).

**B. Demo/seed data (must be separated, clearly marked demo):**
- `src/lib/sqlite-seed.sql:2,8-24` — school name "مدرسة خالد ابن الوليد الضالع/جحاف", email `info@khaled-school.edu.ye`, phone, address, website; users `u1..u10` with `@khaled.edu.ye` emails and literal `password_hash` values.
- `src/lib/sqlite-schema.sql:2`, `src/lib/db/schema.sql:2` — header comments naming Al-Salam + the specific school.

**C. Hard-coded business logic (school-specific constants in code):**
- Default school name fallback `"مدرسة خالد ابن الوليد الضالع/جحاف"` in `SettingsScreen.tsx:63`, `sqlite-repository.ts:16`, `dashboardRepository.ts:326`, `UnifiedPrintLayout.tsx:38`, `CertificatesScreen.tsx:119/127/217/315`, `ReportsScreen.tsx:110/860`, `AIInsightsScreen.tsx:162`, `ActiveReportPrintView.tsx:616`, `AdminDashboard.tsx:173`.
- Default English name `"KHALID IBN AL-WALEED SCHOOL - DHALEA/JAHAF"` in `UnifiedPrintLayout.tsx:39`, `ReportPreviewModal.tsx:41`.
- `ConfigService.ts:100` watermark `'مدرسة خالد بن الوليد - رسمي'`; `:104` reportHeader naming "الجمهورية اليمنية - وزارة التربية والتعليم - مدرسة خالد ابن الوليد الثانوية".

**D. Configuration that must move to database (per-school, not code):**
- `ConfigService` defaults: `currency 'YER'`, `timeZone 'Asia/Aden'`, `language 'ar'`, `dateFormat 'DD/MM/YYYY'`, `appVersion`, JWT/encryption secrets (insecure defaults).
- `gradingSystem 'percentage'`, `invoicePrefix 'INV-2026-'` (`sqlite-repository.ts:45-46`, `SettingsScreen.tsx:92-93`).
- `attendance_lock_hour '09:00'` (seed).
- RTL is literally `dir="rtl"` in `App.tsx:146` and ~40 components/screens — must become config-driven (`direction` from school locale).

**Storage-key coupling (all `al_salam`-prefixed, must be namespaced per installation/tenant):**
- `db.ts:10` `al_salam_school_current_user_v1`
- `sqlite-engine.ts:70` `al_salam_school_sqlite_db_v1`
- `sqlite-repository.ts:95,129` `al_salam_school_extended_settings_v1`
- `LocalStorageProvider.ts:19` prefix `al_salam_storage_`
- `SessionService.ts:9` `al_salam_session_v2`
- `AuditService.ts:15` `al_salam_audit_logs`
- `CalendarScreen.tsx:14` `al_salam_school_calendar_events_v2`
- `DocumentCenterScreen.tsx:17` `al_salam_school_user_documents_v2`
- `ConfigService.ts:78-80` `name: 'al_salam_school'`, `persistenceKey: 'al_salam_school_sqlite_db_v1'`

---

## 5. Configuration Audit

The intake §3 requires a config model: school name, legal name, logo, favicon, address, phone, email, website, country, city, timezone, locale, default language, RTL/LTR, currency, academic calendar, grading system, attendance policy, working days, weekend, invoice/student/employee numbering.

**Today's actual config surface:**
- `school_settings` table (`sqlite-schema.sql:292` `school_name`, plus `name_en, phone, email, address, website, admin_name, academic_year, current_term, logo_url, primary_color, enable_sms_alerts, enable_ai_analysis, attendance_lock_hour`). Reached only via browser `getRealmDB` (not server-config).
- `ConfigService` (env-with-defaults): appName, appVersion, environment, language, timeZone, dateFormat, currency, sessionTimeout, 2FA flag, security secrets, printing (paper size, watermark, reportHeader/Footer), notification providers, backup (freq/retention/location), cache.
- `system_numbering` table (`sqlite-schema.sql:908`) drives invoice/student/employee numbering (master-data `generateNextNumber`).
- `gradingSystem`, `invoicePrefix` are `SchoolSettings` fields (`types.ts:231-232`) with code defaults.

**Gaps vs required model:** no country, city, favicon, legal name, working-days/weekend, full attendance *policy* (only `attendance_lock_hour`), academic-calendar config as data. **All of these must become data rows / a config document in PostgreSQL, per school**, not constants. **BUSINESS DECISION REQUIRED:** which of these are mandatory vs optional per edition, and the default values for a generic install (currently Yemen/YER/Arabic defaults are inappropriate for a generic product).

---

## 6. Branding Audit

| Item | Current | Required |
|---|---|---|
| Product name | "Al-Salam School Management System" (`ConfigService.ts:63`) | **Kayan School ERP** (by Kayan Soft) |
| HTML title | "My Google AI Studio App" | Kayan School ERP |
| School name | Hardcoded "مدرسة خالد ابن الوليد الضالع/جحاف" | Per-school config (DB) |
| Logo | Seed URL (unsplash) | Per-school upload (object storage) |
| Colors | `primary_color '#1e3a8a'` seed | Per-school config |
| Identity strings in print/headers | Hardcoded school + ministry name | Per-school config |
| RTL/LTR | Literal `dir="rtl"` | From school locale/direction config |
| Storage keys | `al_salam_*` | Installation/tenant-namespaced |

**Rule compliance:** No Al-Salam logo/name should remain in production code except clearly-separated seed/demo data. Today it is interleaved with business logic (fallback constants). This must be refactored to a branding/config layer. (No code changed — this is the finding.)

---

## 7. Data Ownership

Target (single source of truth = PostgreSQL), built on `POSTGRESQL_R4_1_TARGET_ARCHITECTURE_SPEC.md` §7/§10:

| Data type | Owner (target) | Today |
|---|---|---|
| Students, Teachers, Classes/Sections, Subjects | PostgreSQL | Browser DB |
| Grades, Attendance, Finance (fees/expenses) | PostgreSQL | Browser DB |
| Library, Certificates, Reports, Documents | PostgreSQL (+ object storage for files) | Browser DB / split |
| Master data (33 entities) | PostgreSQL | Browser DB (post-R3 tables exist in schema only) |
| Academic (years/terms/curriculum/calendar) | PostgreSQL | **Already server** (Academic REST) |
| Audit logs | PostgreSQL (`audit_logs`) | Split browser/server |
| Settings | PostgreSQL (`school_settings`, per school) | Browser DB |
| Notifications, Saved reports | PostgreSQL | Browser DB |
| Auth/session | Server-side auth infra | Client-side; `password_hash` in browser |
| UI preferences (non-sensitive) | Browser `localStorage` only | Browser (acceptable) |

**Hard rule:** `getRealmDB()`/`saveRealmDB()` must not remain the source of truth for business data after migration (intake §7). Do not delete them yet; a decommission plan is in §12.

---

## 8. Database Strategy

Compare the three options for a product sold to many schools:

| Criterion | A. Per-school DB | B. Shared DB + `school_id` | C. Schema/DATABASE-per-tenant |
|---|---|---|---|
| Security | High (physical isolation) | Lower (bug/SQLi leaks across schools) | High |
| Backup | Per-install, simple | Shared; per-tenant restore complex | Per-tenant, moderate |
| Restore | Trivial per school | Needs filtered dump | Moderate |
| Deployment | N installs, more ops | 1 deploy, scales easier | Middle |
| Maintenance | N schema upgrades | 1 upgrade path | N schemas, harder |
| Scalability | Limited by per-instance | Best (single cluster) | Good |
| Cost | Higher (N DB instances) | Lower | Middle |
| Data isolation | Strongest | Weakest (relies on discipline) | Strong |
| Migrations | Run per install | One run, all tenants | Run per tenant |
| Support | Per-customer context | Shared instance context | Per-tenant context |
| DR | Per-school RPO/RTO | Global, coarse | Per-tenant |

**Recommendation (technical):** For the **first commercial release**, adopt **Option A (independent PostgreSQL database per school installation)** because (a) the current schema is single-school with no `school_id`, so B would require retrofitting `school_id` into every table/query — high risk; (b) A gives clean data isolation and simple backup/restore per customer; (c) it matches a "installable product" distribution model. **Design the configuration and deployment so that a future consolidation to B/C is possible without changing domain logic** (keep repositories isolated per datasource; introduce a `school_id`/tenant context only at the connection/seed boundary if ever consolidating).

**BUSINESS DECISION REQUIRED:** (1) Per-school independent deployment (A) vs hosted multi-tenant (B/C)? (2) If hosted, schema vs row isolation? (3) Single global Kayan-hosted instance vs on-premise per-school installs? This determines the entire deployment/support topology.

---

## 9. Multi-School Strategy

**Current state:** zero multi-school primitives. `school_settings` is a single row `id=1`; no `organization`, `school`, `campus`, `tenant` entities; no `school_id` on any business table.

**Required concept model (from intake §14):**
`Organization` → `School` → `Campus` → `AcademicYear` → `User/Role/Permission`, with `Student`, `Teacher`, `Finance`, `Operations` hanging under School/Campus.

**Domain decisions that must be recorded (each BUSINESS DECISION REQUIRED):**
- Can a `User` operate in more than one `School`? (e.g., a teacher across branches) → implies a user–school membership table.
- Can a `Teacher` work in more than one `Campus`?
- Can a `Parent` link to more than one `Student`? (Today yes — `parent_students` junction exists.)
- Can a `Student` transfer between `Schools`? → historical enrollment vs current.
- Is `AcademicYear` per-school or per-organization?
- Is the first release single-school-per-install (Option A) with the model *designed* for future multi-campus, or must multi-school be functional at v1?

These cannot be derived from code; they shape the schema and the `school_id`/tenant strategy in §8.

---

## 10. Authentication / RBAC

**Current (insufficient for a commercial product):**
- `UserRole = 'admin'|'teacher'|'student'|'parent'` (`types.ts:1`) — only 4 roles.
- `AuthService` (`src/core/auth/AuthService.ts`): queries `users` from the **browser** datasource, verifies password via `hashService.verify`, then **returns `password_hash` in the result** (`:60`) which `setCurrentUser` persists to `localStorage` (`db.ts`) — credential exposure.
- No server auth endpoint; login is fully client-side.
- Authorization: inline `currentUser.role === 'admin'` checks in `GradesScreen`, `FinancialScreen`, `AttendanceScreen`, `TimetableScreen`, `StudentsScreen`, `ClassesScreen`, `LibraryScreen`, etc.; `Sidebar` `roles: [...]` arrays for menu visibility. **No permission/resource/action model, no tenant scope.**

**Required baseline roles (intake §9):** Kayan Super Admin, Organization Admin, School Admin, Principal, Academic Coordinator, Teacher, Accountant, HR, Librarian, Counselor, Parent, Student, Driver, Transport Manager. These must map to `Permission → Resource → Action → School/Tenant scope`. No role should be implemented "just because it is in the list" — each must be justified by a requirement.

**BUSINESS DECISION REQUIRED:**
1. Exact role→permission matrix (which roles actually needed at v1 vs later).
2. Can Kayan Soft support staff access a customer's school? If yes: with what roles, and **must every intervention be written to the Audit Trail** (intake §9)? 
3. Tenant scope enforcement: how are cross-school accesses prevented at the data layer?

---

## 11. REST API Coverage

Existing: `/api/academic/*` (full CRUD for years/terms/curriculum/course-assignment/calendar) + `/api/ai/*` (analysis only). All other domains are browser-DB-only.

| Domain | Repository | Service | API | Frontend client | Screens | Browser DB dep | PG ready | Missing endpoints |
|---|---|---|---|---|---|---|---|---|
| Academic | ✅ (4) | ✅ | ✅ REST | ✅ academicApiClient | Academic* | No (server) | ✅ | none (pilot) |
| AI | – | – | ✅ `/api/ai` | ai-client | AIChatAssistant, AIInsights | No | n/a | n/a |
| Users/Auth | `SQLiteRepository` | – | ❌ | none | Login, SwitchUser | **Yes** | ❌ | `/api/auth/*` |
| Students | `studentRepository`(skeleton) | – | ❌ | none | StudentsScreen | **Yes** | partial | full CRUD |
| Teachers | `teacherRepository` | – | ❌ | none | TeachersScreen | **Yes** | partial | full CRUD |
| Classes/Sections | `SQLiteRepository` | – | ❌ | none | ClassesScreen | **Yes** | ❌ | full CRUD |
| Subjects | `SQLiteRepository` | – | ❌ | none | SubjectsScreen | **Yes** | ❌ | full CRUD |
| Grades | `SQLiteRepository` | – | ❌ | none | GradesScreen | **Yes** | ❌ | full CRUD |
| Attendance | `SQLiteRepository` | – | ❌ | none | AttendanceScreen | **Yes** | ❌ | full CRUD |
| Finance (fees/expenses) | `financialRepository` | `financialService` | ❌ | `useFinancial` | FinancialScreen | **Yes** | partial | full CRUD |
| Library | `SQLiteRepository` | – | ❌ | none | LibraryScreen | **Yes** | ❌ | full CRUD |
| Certificates | `SQLiteRepository` | – | ❌ | none | CertificatesScreen | **Yes** | ❌ | full CRUD |
| Documents | `SQLiteRepository` | – | ❌ | none | DocumentCenterScreen | **Yes** (localStorage) | ❌ | full CRUD + storage |
| Reports/Saved | `SQLiteRepository` | – | ❌ | none | ReportsScreen | **Yes** (localStorage) | ❌ | full CRUD |
| Master data | `masterDataRepository` | `masterDataService` | ❌ | none | MasterDataCenter | **Yes** | ✅ (schema) | `/api/master-data/*` |
| Settings | `SQLiteRepository` | – | ❌ | none | SettingsScreen | **Yes** | ❌ | `/api/settings` |
| Notifications | `SQLiteRepository` | – | ❌ | none | NotificationCenter | **Yes** | ❌ | full CRUD |
| Audit logs | `SQLiteRepository`/`AuditService` | – | ❌ | none | ReportsScreen | **Yes** (split) | ❌ | `/api/audit` |

**Goal topology (intake §8, §16):** Frontend → REST API → Application → Domain → Repository → PostgreSQL. No screen may touch the DB directly. This requires building the missing endpoints (phased per `POSTGRESQL_R4_1` §14).

---

## 12. Browser DB Decommission Plan

(Must NOT delete `getRealmDB`/`saveRealmDB` until all screens move to API — intake hard rules 2,3,9.)

1. **Freeze new business logic in `db.ts` path.** No new `getRealmDB`/`saveRealmDB` call sites.
2. **Stand up async `IDataSource` + REST for each domain** (§11, §14). Reuse Academic as template.
3. **Per-domain screen migration:** replace `getRealmDB()` reads with async service/API calls; replace `saveRealmDB()` writes with async API writes. Screens already import `getCurrentUser`/`subscribeRealmDB` — keep those only as session/notification cache.
4. **Reference data:** `useReferenceData`/`ReferenceDataProvider` off `querySqlSync` → async master-data service.
5. **Settings/branding:** move `school_settings` reads/writes to server config API; remove hardcoded Al-Salam fallbacks (§4).
6. **Validate zero business call sites:** grep `getRealmDB`/`saveRealmDB` returns only session/non-business usage.
7. **Data migration** (§13) then **remove** the browser business DB path; keep only `localStorage` for non-sensitive UI prefs + auth session token (no `password_hash`).
8. **Remove `sql.js` asset pipeline** once no screen references it.

---

## 13. PostgreSQL Migration Strategy

(Per intake §15; do not delete Al-Salam data; builds on `POSTGRESQL_MIGRATION_AUDIT.md` §8 and `POSTGRESQL_R4_1` §13.)

```
SQLite Browser DB → Extraction → Transformation → Validation → PostgreSQL → Reconciliation → Cutover
```

- **Extraction:** read browser `sql.js` blob from `localStorage` (`al_salam_school_sqlite_db_v1`); dump per-table in FK order.
- **Transformation:** `INSERT OR REPLACE/IGNORE` → `ON CONFLICT`; `'YYYY-MM-DD'` → `DATE`; integer-bool → `BOOLEAN`; strip SQLite triggers; keep `TEXT` PKs.
- **Validation:** row-count equality per table; FK integrity; **duplicate detection** (e.g., duplicate `code`/receipt); **orphan detection** (child rows with no parent); **checksum/reconciliation** report; **failed-record report** (rejected rows → reject table, never abort mid-batch).
- **Load order** (dependency-first): users/school_classes → teachers/parents → sections → students → subjects → academic → grades/attendance → fees/expenses/certificates/library → notifications/audit/settings/reports → junctions → master-data.
- **Reconciliation:** re-run counts + spot FK checks post-load.
- **Rollback:** archive original browser blob + server file; `pg_dump` snapshot before import; reversible.
- **Seed parity:** port `sqlite-seed.sql` to idempotent PG seed with a **clearly separated demo/seed dataset** (§4B), not merged into production config.

**BUSINESS DECISION REQUIRED (intake §6):** Is the existing browser data production data that **must** be preserved, or demo data that may be discarded? If preserved, which domains, and merge policy if both copies exist? (This gates the cutover in §12 step 7.)

---

## 14. Backup / Restore

`ConfigService.loadBackupConfig()` already defines `autoBackupFrequency`, `backupRetentionDays`, `backupLocation` (default `'local'`) — but there is **no implementation** for PostgreSQL (only conceptual). For a commercial product each school needs:

- Automated backup (scheduled PG dump / managed snapshot)
- Manual backup (admin-triggered)
- Restore procedure (tested)
- Backup verification (integrity check)
- Retention policy
- Schema migration version (`schema_migrations` table)
- Disaster recovery procedure

**BUSINESS DECISION REQUIRED:** Define **RPO** (recovery point objective) and **RTO** (recovery time objective) per edition/SLA. Do not invent values. Also: who stores backups (customer vs Kayan-hosted) ties to §8 deployment decision.

---

## 15. Supportability

Intake §10 requires, from day one: installation ID, school/customer ID, application version, DB schema version, health check, diagnostics, error logs, audit logs, backup/restore status, migration status, support mode, controlled remote diagnostics.

**Available seams today:** `ConfigService.appVersion`; `BackupConfig`; `AuditService` (split); DI `verify-di-smoke`. **Missing:** installation ID, customer/school ID, schema version tracking (a `schema_migrations` table must be introduced by the migration runner), health-check endpoint, diagnostic/error-log aggregation, support mode.

**Hard rule (intake §10):** any Support Access must be **explicit, authenticated, authorized, time-limited, audited, revocable**. **No remote-access/backdoor mechanism** may be created.

**BUSINESS DECISION REQUIRED:** Is there a Kayan-hosted support/observability backend, or is support purely on-premise/customer-run? If hosted, what telemetry is permitted (privacy/compliance)? These define the supportability architecture.

---

## 16. Customization

| Customization | Classification |
|---|---|
| School branding (name/logo/colors/contact) | **Configuration** (DB + object storage) |
| Academic years / terms | **Configuration** (data) |
| Grades / sections / subjects | **Configuration** (data, master-data) |
| Grading rules | **Configuration** (today `gradingSystem` enum — needs rule model) |
| Attendance rules / policy | **Configuration** (today only `attendance_lock_hour`) |
| Fee categories | **Configuration** (master-data) |
| Invoice / student / employee numbering | **Configuration** (`system_numbering`) |
| Document templates | **Configuration** (data + storage) — needs template engine |
| Notification templates | **Configuration** (needs template store) |
| Permissions (role→perm) | **Configuration** (RBAC model, §10) |
| Workflows (approvals, etc.) | **Requires Development** (no workflow engine exists) |

No customization may require source-code changes (intake §3, §12). Workflows are explicitly out of easy scope.

---

## 17. Product Editions

**Proposed modules (intake §13, proposal only, no implementation, no prices/features assumed):**
- Core (config, auth, RBAC, audit, backup)
- Academic (years/terms/curriculum/calendar)
- Student (admissions, profiles, guardians)
- Attendance
- Finance (fees, expenses, invoicing)
- HR (staff, payroll-ready)
- Operations (library, transport, documents)
- Communication (notifications, portals)
- Analytics
- AI

**Proposed tiers (indicative only):** Basic / Professional / Enterprise — feature/module bundling to be decided commercially. (No prices or final feature lists assumed.)

---

## 18. Implementation Roadmap

Post-audit phased plan (intake §17), each phase gated on prerequisites; **no execution in this task**:

- **R4.1** — Product Architecture (this document's foundation)
- **R4.2** — Business Decisions (resolve §20 items)
- **R4.3** — Tenant/School Model (Org→School→Campus; `school_id`/isolation per §8/§9 decision)
- **R4.4** — PostgreSQL DataSource (async `IDataSource` + `PostgreSQLDataSource`)
- **R4.5** — PostgreSQL Schema (port canonical + master-data; per-school or shared per §8)
- **R4.6** — Repository Migration (students/teachers/finance/master-data/dashboard → async PG)
- **R4.7** — API Coverage (build missing REST per §11)
- **R4.8** — Frontend API Migration (screens off `getRealmDB`)
- **R4.9** — SQLite Decommission (browser business DB removed per §12)
- **R4.10** — Migration/Cutover (§13; preserve or discard per business decision)
- **R4.11** — Backup/Restore (§14 implementation)
- **R4.12** — Product Packaging (branding/config/installer; Kayan School ERP distribution)

---

## 19. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Al-Salam coupling in code/seed/keys | Blocks rebranding/sale | Config + branding layer; separate demo seed |
| 2 | Client-side auth + `password_hash` in browser | Critical security defect | Server-side auth (§10); never persist hash |
| 3 | No tenant/school isolation | Cannot serve multiple schools | §8/§9 decision + model |
| 4 | Primitive RBAC | No real authorization | Role→perm→resource→action matrix |
| 5 | Two unsynced stores | Data loss at cutover | §13 migration + §12 decommission |
| 6 | Hardcoded locale/RTL/currency | Wrong for other schools | Config-driven (§5) |
| 7 | No backup/restore impl | No DR for customers | §14 |
| 8 | Sync/offline ambiguity | Scope creep | §20 decision |
| 9 | Support-access unclear | Compliance/security | §15 decision; no backdoor |

---

## 20. Business Decisions Required

Each item below **cannot be derived from the repository** and blocks product readiness:

1. **Offline policy** — required for any domain, or online-only? (intake §6, `POSTGRESQL_R4_1` §4)
2. **Deployment/DB strategy** — per-school independent (A) vs hosted multi-tenant shared (B) vs schema isolation (C)? On-premise vs Kayan-hosted? (§8)
3. **Multi-school model** — user-in-multiple-schools, teacher-multi-campus, student-transfer, academic-year scope? (§9)
4. **RBAC scope** — exact role→permission matrix; Kayan support access + audit of interventions? (§10)
5. **Data preservation at cutover** — preserve existing Al-Salam browser data or discard; which domains? (§13, `POSTGRESQL_R4_1` §7)
6. **Configuration defaults** — generic defaults for a new install (country/currency/locale/language/RTL) replacing Yemen/YER/Arabic? (§5)
7. **RPO / RTO** — per edition/SLA. (§14)
8. **Supportability model** — hosted telemetry vs on-premise; permitted diagnostics. (§15)
9. **Edition/module bundling** — which modules/tiers at v1. (§17)

Until these are answered, implementation phases R4.3–R4.12 cannot start with confidence.

---

## 21. Final Recommendation

The system is a functional **single-school Al-Salam SPA**, not yet a productizable School ERP. The architecture has good bones (DDD seams, a proven Academic REST stack, a master-data engine) but is uniformly coupled to one school's identity, has no tenant model, no real RBAC, client-side auth that leaks credentials, and a browser-resident authoritative database unsynchronized with the server. All required fixes are identifiable and sequenced (§18), but **nine business/architecture decisions (§20) are unresolved** and cannot be inferred from the code.

No production code, SQL, schema, UI, or PostgreSQL configuration was modified. PostgreSQL implementation, R4.2, and all execution phases are explicitly out of scope for this task.

KAYAN SCHOOL ERP PRODUCT READINESS:
BLOCKED — BUSINESS/ARCHITECTURE DECISIONS REQUIRED
