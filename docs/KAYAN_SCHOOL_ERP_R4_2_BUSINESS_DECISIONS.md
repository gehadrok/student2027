# Kayan School ERP R4.2 — Business & Architecture Decisions

> **STATUS: FINAL DECISIONS RECORDED.** All 9 decisions below are now **APPROVED** by the Product Owner. See `docs/KAYAN_SCHOOL_ERP_DECISION_RECORD_D1_D9_FINAL.md`. The `Recommendation` shown for each is the adopted choice; prior `FINAL` / `BUSINESS DECISION REQUIRED` markers are superseded by FINAL status.

> **Task:** R4.2 — Business & Architecture Decisions (READ-ONLY with respect to production).
> **Allowed output:** only this document (`docs/KAYAN_SCHOOL_ERP_R4_2_BUSINESS_DECISIONS.md`).
> **Not modified:** no production code, Domain, Application, Infrastructure, Repository, API, UI, SQL, schema, migrations, package.json; no PostgreSQL installed; no `pg` added; no migration run; `getRealmDB()`/`saveRealmDB()` not deleted; Authentication/RBAC not changed; Phase 6.3 / 7 / Academic Item 2 / R4.3+ not started.
>
> **Source documents actually read:** `docs/KAYAN_SCHOOL_ERP_PRODUCT_READINESS_AUDIT.md`, `docs/POSTGRESQL_R4_1_TARGET_ARCHITECTURE_SPEC.md`, `docs/POSTGRESQL_MIGRATION_REMEDIATION_PLAN.md`, `docs/POSTGRESQL_R4_DUAL_DATABASE_AUDIT.md`. Where the four sources conflict, the code-level citation is treated as the closest to truth.
>
> **Important rule applied throughout:** a *Recommendation* is an engineering study suggestion, **not** a final decision. Every item the repository cannot answer is marked **BUSINESS DECISION REQUIRED** and is **not** guessed.

---

## Decision 1 — Offline Policy

### Current Evidence
- The browser `sql.js` DB (`localStorage` key `al_salam_school_sqlite_db_v1`) is the authoritative store for 28 screens + `MasterDataCenter` + `AdminDashboard` + `useReferenceData` (R4 audit §3, §5, §9).
- There is **no synchronization mechanism** between browser and server; the two `getSQLiteDB()` instances are fully independent (R4 audit §13).
- Only the Academic module is server-backed (`/api/academic/*`); no other domain has a server path (R4 audit §8, R4.1 §2).
- "Works offline today" is an accidental property of local storage, **not** a designed offline capability; there is no connectivity abstraction, offline queue, or conflict-resolution code (R4.1 §4).

### Current State
The SPA reads/writes business data directly to a local `sql.js` database. Because that database lives in the browser, the app continues to function without a network connection — but this is a side-effect of local persistence, not an offline feature. There is no designed offline/online transition, no change tracking, and no sync.

### Options

#### Option A — Online-only (server authoritative)
All business data lives on the server (PostgreSQL). The browser keeps only a session token and non-sensitive UI preferences. No offline writes.

#### Option B — Offline-capable (sync engine)
The browser holds an authoritative-or-cache copy; a bidirectional sync layer (change tracking, conflict-resolution policy, offline write queue) reconciles with the server when connectivity returns.

#### Option C — Partial offline (read-cache only)
Server authoritative for writes; some domains may keep a read-only browser cache for responsiveness, but no offline writes.

### Advantages
- **A:** simplest; single source of truth; least risk; clean PostgreSQL cutover.
- **B:** supports field operation (e.g., attendance in a disconnected classroom); but adds a major, separate architectural component.
- **C:** middle ground; improves perceived performance without write conflicts.

### Risks
- **A:** if the product *requires* offline operation, functionality is lost when connectivity drops.
- **B:** high complexity, conflict-resolution ambiguity, security surface, and direct conflict with single-source-of-truth; multiplies PostgreSQL cutover risk (R4 audit §19, R4.1 §4).
- **C:** risk of stale reads if cache invalidation is weak.

### Recommendation
Engineering recommendation (study only, **not** a final decision): **Option A (online-only)** for V1, consistent with R4.1 §9 target architecture and the remediation target (remediation §1, §6.3, §7). If a future requirement proves offline is needed, Option B must be separately scoped, estimated, and funded before any PostgreSQL cutover.

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
هل يتطلب المنتج وضع **Offline** (العمل دون اتصال) لأي نطاق (مثل تسجيل الحضور في فصل بلا إنترنت)؟
- **A) نعم** — يلزم محرك مزامنة (sync engine) مصمّم وممول separately.
- **B) لا** — تخزين مركزي فقط (Online-only).

---

## Decision 2 — Database / Deployment Strategy

### Current Evidence
- The schema assumes exactly one school: `school_settings` is a single row `id=1`; a grep for `tenant`/`school_id`/`organization`/`campus` returns **zero** matches (Product Audit §4, §9).
- `ConfigService` hardcodes `name: 'al_salam_school'` and `persistenceKey: 'al_salam_school_sqlite_db_v1'` (Product Audit §4D).
- Product Audit §8 already compares A/B/C across 11 criteria and recommends A for V1.

### Current State
Today there is one embedded SQLite database per process (browser or server file), with no tenant keys and no multi-instance topology. The product is effectively single-school and single-install.

### Options

#### Option A — PostgreSQL مستقل لكل مدرسة (Per-school independent PostgreSQL)
Each school installation gets its own PostgreSQL database (and ideally its own deployment).

#### Option B — PostgreSQL مشترك + school_id (Shared DB + `school_id`)
One database cluster; every business table carries a `school_id`; isolation enforced by query scoping.

#### Option C — PostgreSQL schema/database isolation (Schema/DATABASE-per-tenant)
One cluster; each tenant gets its own schema or dedicated database within the cluster.

### Database / Deployment Comparison

| Criterion | A. Per-school DB | B. Shared + `school_id` | C. Schema/DATABASE-per-tenant |
|---|---|---|---|
| Security | High (physical isolation) | Lower (bug/SQLi can leak across schools) | High |
| Data isolation | Strongest | Weakest (relies on discipline) | Strong |
| Backup | Per-install, simple | Shared; per-tenant restore complex | Per-tenant, moderate |
| Restore | Trivial per school | Needs filtered dump | Moderate |
| Deployment | N installs, more ops | 1 deploy, scales easier | Middle |
| Maintenance | N schema upgrades | 1 upgrade path | N schemas, harder |
| Scalability | Limited by per-instance | Best (single cluster) | Good |
| Cost | Higher (N DB instances) | Lower | Middle |
| Migration | Run per install | One run, all tenants | Run per tenant |
| Support | Per-customer context | Shared instance context | Per-tenant context |
| Disaster Recovery | Per-school RPO/RTO | Global, coarse | Per-tenant |

### Advantages
- **A:** clean isolation, simple per-customer backup/restore, matches an "installable product" distribution model, lowest schema-change risk (no `school_id` retrofit).
- **B:** easiest to scale and operate centrally; cheapest.
- **C:** balances isolation and operational density.

### Risks
- **A:** higher per-customer ops cost; no built-in cross-school reporting.
- **B:** a single bug or missing `school_id` filter exposes all schools; weak isolation.
- **C:** schema upgrades across many schemas are operationally hard.

### Recommendation
Engineering recommendation (study only, **not** a final decision): **Option A (per-school independent PostgreSQL)** for the first commercial release, because the current schema has no `school_id` (retrofitting B is high-risk) and A gives clean isolation + simple DR per customer. Design configuration/deployment so a future consolidation to B/C is possible **without** changing domain logic (keep repositories isolated per datasource; introduce `school_id`/tenant context only at the connection/seed boundary if ever consolidating). This matches Product Audit §8.

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
1. هل تحصل كل مدرسة على **PostgreSQL مستقل** (A)، أم قاعدة **مشتركة + school_id** (B)، أم **عزل schema/database** (C)؟
2. هل النشر **Kayan-hosted** أم **on-premise لكل مدرسة**؟
3. إن كان hosted، ما العزل المفضّل (صفّ/صفوف أم قواعد منفصلة)؟

---

## Decision 3 — Multi-School Model

### Current Evidence
- Zero multi-school primitives: no `organization`, `school`, `campus`, or `tenant` entities; `school_settings` is a single row `id=1` (Product Audit §9).
- `parent_students` junction already exists (a parent can link multiple students today) — this is the only multi-link relation present (Product Audit §9).

### Current State
The system models exactly one school. There is no concept of an organization owning multiple schools, nor campuses, nor cross-school users.

### Options

#### Option A — Single School Deployment (V1)
V1 is single-school per installation (consistent with Decision 2 Option A). The data model is designed so future multi-campus/multi-school can be added without rewriting domain logic.

#### Option B — Multi-School Platform (at V1)
V1 already supports `Organization → School → Campus` with users spanning schools.

#### Option C — Single-school V1, optional multi-campus later
Single school now; `school_id`/campus introduced later as an additive dimension, not a rewrite.

### Advantages
- **A:** smallest V1; matches current schema; lowest risk.
- **B:** supports group/chain schools from day one; but requires `school_id` everywhere now.
- **C:** pragmatic middle path.

### Risks
- **A:** if a customer is actually a group of schools, V1 cannot serve them.
- **B:** large schema/query churn; high initial risk.
- **C:** deferred work, but manageable if the model is deliberately designed for it.

### Recommendation
Engineering recommendation (study only, **not** a final decision): **Option A for V1**, with the architecture deliberately designed to allow future multi-campus (Decision 2 Option A + a forward-compatible model). This is the lowest-risk path and matches the current single-school schema.

### Multi-School Concept Model (documented, relations NOT invented)
The intended hierarchy from the intake: `Organization → School → Campus → AcademicYear → User/Role/Permission`, with `Student`, `Teacher`, `Finance`, `Operations` under School/Campus. The following relationships **must be decided by the product owner**; they are not derivable from code:
- Can a `User` operate in more than one `School`?
- Can a `Teacher` work in more than one `Campus`?
- Can a `Parent` link to more than one `Student`? (today: **yes**, via `parent_students`)
- Can a `Student` transfer between `Schools`?
- Is `AcademicYear` per-school or per-organization?

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
هل V1 يكون **Single School Deployment** أم **Multi-School Platform**؟ وهل يلزم دعم مستقبلي لعدة مدارس/فروع تحت نفس المنظمة (Organization)؟
- **A) Single School في V1**، مع تصميم متوافق مستقبلًا.
- **B) Multi-School من V1**.
- **C) أحتاج مقارنة/تفاصيل إضافية**.

---

## Decision 4 — RBAC Scope

### Current Evidence
- `UserRole = 'admin' | 'teacher' | 'student' | 'parent'` — only 4 roles (Product Audit §10, `src/types.ts:1`).
- `AuthService` (`src/core/auth/AuthService.ts`) queries the `users` table from the **browser** datasource and **returns `password_hash` in the result (`:60`)**, which `setCurrentUser` persists to `localStorage` — a credential-exposure defect (Product Audit §10, R4 audit §14).
- Authorization is scattered inline `currentUser.role === 'admin'` checks across `GradesScreen`, `FinancialScreen`, `AttendanceScreen`, `TimetableScreen`, `StudentsScreen`, `ClassesScreen`, `LibraryScreen`; `Sidebar` uses `roles: [...]` arrays for menu visibility (Product Audit §10).
- No permission/resource/action matrix; no tenant scope.

### Current State

#### Authentication — Current State
- **Where authentication happens:** client-side. `AuthService.login` reads the `users` table from the browser DB and verifies the password locally (R4 audit §9, Product Audit §10).
- **Where session is stored:** `localStorage` key `al_salam_school_current_user_v1` (`src/lib/db.ts:10`), containing the full user object **including `password_hash`**.
- **Does `password_hash` reach the browser?** **YES** — it is returned by `AuthService` and persisted to `localStorage` (defect).
- **Is there server-side authentication?** **NO** — no `/api/auth/*` endpoint exists (R4 audit §8).
- **Is there API authentication?** **NO** — REST surface is only `/api/academic/*` and `/api/ai/*`, neither gated by auth.

#### RBAC — Current vs Target
- **Current:** `if (currentUser.role === 'admin')` — a single hardcoded role check; no resource/action granularity; no school scope.
- **Target (proposed, not implemented):** `Role → Permission → Resource → Action → School Scope`.

### Options

#### Option A — Minimal expansion
Keep the role-centric model; broaden the 4 roles into the requested 14 baseline roles; coarse permission flags; no cross-school scope.

#### Option B — Full RBAC
`Role → Permission → Resource → Action → School/Tenant Scope`, with a permission matrix and server-enforced authorization middleware.

#### Option C — Full RBAC + Kayan Support roles
Option B plus explicit, audited Kayan Soft support roles for customer assistance.

### Advantages
- **A:** fastest; low risk.
- **B:** real authorization; supports multi-user, multi-role, future multi-school scope.
- **C:** enables supported customers while staying accountable.

### Risks
- **A:** insufficient for a commercial multi-user product; no resource/action control.
- **B/C:** requires modeling the full permission matrix and server-side enforcement; larger build.

### Recommendation
Engineering recommendation (study only, **not** a final decision): **Option B** — a real `Role → Permission → Resource → Action → School Scope` model, built on the existing `AuthService`/`IAuthProvider` seam, with server-side authentication (no `password_hash` in browser). The 14 baseline roles from the intake must each be justified by a requirement; roles are not implemented "just because they are in the list." This matches Product Audit §10.

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
1. ما **مصفوفة الأدوار والصلاحيات** الدقيقة المطلوبة في V1 (أي الأدوار الـ14 فعليًا لازمة، وما موارد/إجراءات كل دور)؟
2. هل يمكن لـ **Kayan Soft Support** الوصول إلى بيانات العميل؟ وإن نعم:
   - بأي أدوار؟
   - هل يُسجَّل **كل تدخل** في Audit Trail؟
3. كيف يُمنع الوصول العابر للمدارس (cross-school) على مستوى البيانات؟

---

## Decision 5 — Cutover / Data Preservation

### Current Evidence
- The browser `localStorage` `sql.js` blob holds all live, user-entered business data for the 28 screens + master-data UI (R4 audit §3, §7).
- The server `data/al-salam-server.db` is bootstrapped from the same `sqlite-schema.sql` + `sqlite-seed.sql` but is **not** written by any SPA screen — only the Academic REST API touches it (R4 audit §4).
- Two **divergent** physical copies therefore exist (R4 audit §1, §7).
- No export path for browser data beyond the seed (R4 audit §19).

### Current State
Al-Salam's live operational data sits in the browser `localStorage` database. The server database contains only seeded/Academic data. They have diverged and there is no reconciliation path today.

### Al-Salam Data Classification (intake §11)
The sources do **not** state whether the existing Al-Salam browser data is production, demo, seed, or customer data. What is verifiable:
- `sqlite-seed.sql` contains **school-specific demo/seed data** (school name "مدرسة خالد ابن الوليد الضالع/جحاف", users `u1..u10` with `@khaled.edu.ye` emails and literal `password_hash` values) — clearly **Seed/Demo** (Product Audit §4B).
- The browser `localStorage` data is **user-entered** through the SPA and is the live operational copy — for Al-Salam as the pilot customer this is effectively **Customer/Production** data, but this cannot be confirmed as a formal classification from the sources.

Because the classification cannot be derived from the repository, it is a business decision. **No data is deleted** in this task (hard rule).

### Options

#### Option A — Preserve all browser data
Export the browser `sql.js` blob and load it into PostgreSQL (transform + validate per R4.1 §13).

#### Option B — Discard (treat as demo)
Do not migrate; reseed a clean installation for the new product.

#### Option C — Selective per-domain
Preserve some domains, discard others (e.g., keep real students/finance, drop test records).

### Advantages
- **A:** no data loss for the pilot customer.
- **B:** cleanest start; avoids migrating low-quality/test data.
- **C:** balances both.

### Risks
- **A:** migrates potentially mixed demo+real data; needs cleansing.
- **B:** permanent loss of live Al-Salam operational data.
- **C:** requires a per-domain ruling.

### Recommendation
Engineering recommendation (study only, **not** a final decision): **Option A (preserve)** as the safe default, using the R4.1 §13 extraction→transformation→validation→load pipeline, keeping the original browser blob archived for rollback. This avoids irreversible data loss. It is **not** a final decision.

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
هل بيانات Al-Salam الحالية (الموجودة في متصفح المدرسة) هي **Production/Customer data** يجب الحفاظ عليها، أم **Demo/Seed data** يمكن تجاهلها عند الانتقال؟
- **A) حفظ كل البيانات** (migrate).
- **B) تجاهل** (reseed نظيف).
- **C) حفظ جزئي حسب النطاق** — حدد النطاقات.

---

## Decision 6 — Configuration Defaults

### Current Evidence
- `ConfigService` (`src/core/config/ConfigService.ts`): `appName 'Al-Salam School Management System'` (`:63`), `currency 'YER'` (`:69`), `timeZone 'Asia/Aden'` (`:67`), `language 'ar'` (`:66`), watermark `'مدرسة خالد بن الوليد - رسمي'` (`:100`), reportHeader naming the specific school (`:104`).
- RTL is **literally hardcoded** as `dir="rtl"` in `App.tsx:146` and ~40 components/screens (Product Audit §4D, §6).
- `gradingSystem 'percentage'`, `invoicePrefix 'INV-2026-'` defaults in `sqlite-repository.ts:45-46` / `SettingsScreen.tsx:92-93` (Product Audit §5).
- `school_settings` single row holds name/logo/colors/contact but is reached only via browser `getRealmDB`, not a server config API (Product Audit §5).

### Current State
School identity, locale, currency, and branding are hardcoded as Al-Salam/Yemen constants in code, seed, and UI fallbacks. There is no install-time configuration and no per-school configuration pipeline.

### Options

#### Option A — Generic defaults + install-time configuration
No hardcoded school identity; a first-run install wizard captures school name/logo/locale/currency/etc., stored as **School Configuration** in the database.

#### Option B — Regional defaults, all configurable
Keep sensible regional defaults but ensure every value is overridable per school.

#### Option C — Required fields enforced at install
Certain configuration fields are mandatory before the system can be used.

### Product Default vs School Configuration vs Hard-coded

| Value | Today | Should be |
|---|---|---|
| Product name | Hard-coded "Al-Salam School Management System" | **Product Default** = "Kayan School ERP" |
| School name / logo / colors / contact | Hard-coded fallbacks + seed | **School Configuration** (DB) |
| Country / City / Currency / Timezone / Language / RTL | Hard-coded (YER/Asia-Aden/ar/rtl) | **School Configuration** (DB); Product Default only as placeholder |
| Academic calendar / grading / attendance policy / numbering | Partly hard-coded, partly `school_settings` | **School Configuration** (DB) |
| Watermark / report header | Hard-coded school name | **School Configuration** (DB) |

### Advantages
- **A:** clean rebranding; same build serves any school.
- **B:** faster onboarding with sane defaults.
- **C:** guarantees required data is present.

### Risks
- **A:** more onboarding UX work (wizard).
- **B:** risk of shipping with inappropriate defaults if not overridden.
- **C:** friction if a required field is unknown at install.

### Recommendation
Engineering recommendation (study only, **not** a final decision): **Option A** — no Al-Salam-specific constant in code; all school identity is **School Configuration** in the database, with a neutral **Product Default** for the Kayan product itself. RTL/locale must become config-driven, not a literal `dir="rtl"`. This matches Product Audit §5/§6.

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
ما القيم الافتراضية لتثبيت **عام (generic)** لمدرسة جديدة (country/currency/locale/language/RTL) بدل Yemen/YER/Arabic؟
- **A) قيم محايدة + معالج إعداد (install wizard)** يملؤها العميل.
- **B) قيم افتراضية إقليمية قابلة للتعديل**.
- هل يلزم **فرض حقول مطلوبة** عند التثبيت؟

---

## Decision 7 — RPO / RTO

### Current Evidence
- `ConfigService.loadBackupConfig()` defines `autoBackupFrequency`, `backupRetentionDays`, `backupLocation` (default `'local'`), but there is **no PostgreSQL implementation** — conceptual only (Product Audit §14).
- No RPO or RTO values exist anywhere in the repository or docs.

### Current State
Backup is configurable in name only; no automated backup, restore, verification, or retention is implemented for PostgreSQL. No recovery objectives are defined.

### Options

#### Option A — Per-edition SLA
Basic / Professional / Enterprise each have different RPO/RTO and retention.

#### Option B — Single standard RPO/RTO
One target for all customers.

#### Option C — Customer-defined
The customer sets their own RPO/RTO within product limits.

### Advantages
- **A:** matches commercial tiers.
- **B:** simpler to operate.
- **C:** flexible for large customers.

### Risks
- **A/B/C:** inventing numeric RPO/RTO values would be wrong — they are a business/compliance choice.

### Recommendation
Engineering recommendation (study only, **not** a final decision): define RPO/RTO **per edition** (Option A) and implement automated backup/restore/verification + a `schema_migrations` version table (Product Audit §14). **No numeric values are invented here.**

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
ما **RPO** (نقطة الاسترداد) و **RTO** (زمن الاسترداد) المطلوبان لكل إصدار؟ وما **سياسة الاحتفاظ بالنسخ الاحتياطية**؟
- لا تُخمَّن الأرقام؛ تُحدَّد تجاريًا.

---

## Decision 8 — Kayan Soft Support Model

### Current Evidence
- No support/telemetry backend exists; no installation ID, customer/school ID, schema version tracking, or health-check endpoint (Product Audit §15).
- `AuditService` is split (browser `localStorage` vs SQL `audit_logs`) — partial audit only (Product Audit §15, R4 audit §14).
- Hard rule from intake: any Support Access must be **explicit, authenticated, authorized, time-limited, audited, revocable**; **no backdoor/remote-access mechanism** may be created.

### Current State
There is no Kayan Soft support channel, no observability backend, and no remote access of any kind. Support today would be entirely customer-run / on-premise.

### Options

#### Option A — On-premise / customer-run
No Kayan access to customer data; support is the customer's responsibility.

#### Option B — Hosted with controlled support access
Kayan can access a customer's environment only through an explicit, authenticated, authorized, time-limited, audited, and revocable mechanism.

#### Option C — Hybrid
Routine support on-premise; escalated diagnostics via Option B.

### Advantages
- **A:** strongest privacy/isolation; simplest compliance.
- **B:** enables real support; accountable via audit.
- **C:** balances both.

### Risks
- **A:** slow incident resolution; Kayan blind to issues.
- **B:** privacy/compliance exposure if not strictly controlled.
- **C:** operational complexity.

### Recommendation
Engineering recommendation (study only, **not** a final decision): **Option B** with strict controls (Authenticated / Authorized / Explicit / Time-limited / Audited / Revocable), and **no backdoor**. Every Kayan intervention must land in the Audit Trail. This matches Product Audit §15.

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
هل يمكن لـ **Kayan Soft Support** الوصول إلى بيانات العميل؟
- **A) لا** — دعم on-premise فقط.
- **B) نعم** — بآلية صارمة (مصادَق عليها/مصرَّح بها/صريحة/محدودة زمنيًا/مُدقَّقة/قابلة للإلغاء).
- وإن نعم: ما المقاييس (diagnostics/health/version/logs) المسموح جمعها لأغراض الدعم؟

---

## Decision 9 — Product Editions

### Current Evidence
- Product Audit §17 proposes modules (Core, Academic, Student, Attendance, Finance, HR, Operations, Communication, Analytics, AI) and tiers (Basic / Professional / Enterprise) as **indicative only**, with no prices or final feature lists (Product Audit §17).

### Current State
All modules ship in a single application; there is no edition/tier concept, no feature gating, and no packaging distinction.

### Options

#### Option A — Tiered bundles
Basic / Professional / Enterprise, each bundling a subset of modules.

#### Option B — Single all-in-one product
No tiers; every installation gets everything.

#### Option C — Modular add-ons
Base product + purchasable module add-ons.

### Advantages
- **A:** supports differentiated pricing/GTM.
- **B:** simplest to build and document.
- **C:** flexible per-customer.

### Risks
- **A:** requires feature-flag/entitlement design.
- **B:** cannot segment the market.
- **C:** complex entitlement management.

### Recommendation
Engineering recommendation (study only, **not** a final decision): **Option A** — Basic / Professional / Enterprise tiers bundling the proposed modules. Pricing and exact feature lists are **commercial decisions, out of scope** for this document. This matches Product Audit §17.

### FINAL DECISION STATUS
FINAL (see Decision Record D1–D9)

### Decision Needed
ما **الإصدارات النهائية** (Basic / Professional / Enterprise) وما **الوحدات المشمولة** في كل إصدار؟
- (الأسعار خارج النطاق؛ تُحدَّد تجاريًا.)

---

## PostgreSQL Gate

PostgreSQL implementation must **not** begin before the decisions that directly affect database topology, school identity, authentication, authorization, data ownership, migration strategy, and offline policy are resolved with product-owner sign-off.

| Decision | Status | Blocks PostgreSQL? | Why |
|---|---|---|---|
| 1. Offline Policy | BLOCKED | **YES** | Determines whether a sync engine / offline store must exist before DB design. |
| 2. Database / Deployment Strategy | BLOCKED | **YES** | Determines DB topology (per-school vs shared `school_id` vs schema isolation). |
| 3. Multi-School Model | BLOCKED | **YES** | Determines school/tenant identity and whether `school_id` is required in schema. |
| 4. RBAC Scope (Auth + Authz) | BLOCKED | **YES** | Determines authentication model and authorization/tenant-scope enforcement at the data layer. |
| 5. Cutover / Data Preservation | BLOCKED | **YES** | Determines migration strategy and whether existing data must be preserved. |
| 6. Configuration Defaults | BLOCKED | NO* | Config is data, not topology; should be resolved before packaging, not before PG start. |
| 7. RPO / RTO | BLOCKED | NO* | Affects backup/restore implementation, not DB topology. |
| 8. Kayan Soft Support Model | BLOCKED | NO* | Affects supportability architecture, not DB topology. |
| 9. Product Editions | BLOCKED | NO* | Affects packaging/GTM, not DB topology. |

\* These four do not block the start of PostgreSQL implementation but must be resolved before the product is released/sold.

---

## Target Product & Data Boundary

### Target Product Vision (documentation only; not implemented)
```
Kayan Soft
    ↓
Kayan School ERP
    ↓
Customer School
    ↓
Users / Students / Teachers / Operations
```
Architecture target:
```
Frontend (no authoritative business data)
    ↓
REST API
    ↓
Application
    ↓
Domain
    ↓
Repository
    ↓
PostgreSQL (Source of Truth)
```
Cross-cutting services (built later, not now): Authentication, Authorization (RBAC), Audit, Notifications, Storage, Backup, Observability.

### Product Boundary & Data Classification (must not be mixed)
- **Product Configuration** — Kayan product identity, edition, module entitlements, build version. Same for all customers.
- **Customer Data** — the school's operational records (students, teachers, finance, grades, attendance, documents, etc.). Isolated per school.
- **Demo Data** — clearly separated seed/demo datasets used for evaluation; never merged into production customer data.
- **System Data** — schema version (`schema_migrations`), installation ID, health/diagnostics metadata.
- **Audit Data** — immutable audit trail of actions; must converge to one server store (R4 audit §14).
- **Operational Data** — backup status, migration status, runtime logs; per installation.

Rule: Demo/Seed data and Production/Customer data must never be mixed (intake hard rule 8). The seed file (`sqlite-seed.sql`) currently interleaves school-specific demo data with schema — this must be separated before any generic install (Decision 5, Decision 6).

---

## Business Decision Matrix

| ID | Decision | Current State | Recommendation | Final Decision | Status |
|---|---|---|---|---|---|
| 1 | Offline Policy | Browser DB authoritative; no sync; no designed offline | Online-only (A) for V1 | FINAL | FINAL (see Decision Record) |
| 2 | Database / Deployment | Single SQLite; no `school_id`; no tenant | Per-school independent PostgreSQL (A) for V1 | FINAL | FINAL (see Decision Record) |
| 3 | Multi-School Model | Single school; no org/campus entities | Single-school V1, designed for future | FINAL | FINAL (see Decision Record) |
| 4 | RBAC Scope | 4 roles; inline checks; client-side auth; `password_hash` in browser | Full RBAC + server-side auth; no `password_hash` in browser | FINAL | FINAL (see Decision Record) |
| 5 | Cutover / Data Preservation | Live data in browser; server seeded; divergent | Preserve (migrate) with archive + rollback | FINAL | FINAL (see Decision Record) |
| 6 | Configuration Defaults | Hard-coded Al-Salam/Yemen constants; RTL literal | Generic defaults + School Configuration (DB) | FINAL | FINAL (see Decision Record) |
| 7 | RPO / RTO | Backup config only; no impl; no values | Per-edition RPO/RTO (values TBD) | FINAL | FINAL (see Decision Record) |
| 8 | Kayan Soft Support Model | No support backend; no remote access | Controlled, audited support access (B) | FINAL | FINAL (see Decision Record) |
| 9 | Product Editions | Single app; no tiers | Basic/Pro/Enterprise tiers | FINAL | FINAL (see Decision Record) |

---

## Decisions Required From Product Owner

الرجاء الإجابة مباشرة على الأسئلة التالية (لا تُجاب نيابة عنك):

1. **Offline Policy**
   هل يلزم وضع Offline لأي نطاق؟
   - A) نعم — يلزم محرك مزامنة مصمّم.
   - B) لا — تخزين مركزي فقط.

2. **Database / Deployment**
   هل تحصل كل مدرسة على PostgreSQL مستقل (A)، أم قاعدة مشتركة + school_id (B)، أم عزل schema/database (C)؟ وهل النشر Kayan-hosted أم on-premise؟

3. **Multi-School Model**
   هل V1 يكون Single-School أم Multi-School؟ وهل يلزم دعم مستقبلي لعدة مدارس/فروع تحت منظمة واحدة؟

4. **RBAC Scope**
   ما مصفوفة الأدوار/الصلاحيات المطلوبة في V1؟ وهل يمكن لـ Kayan Support الوصول لبيانات العميل، وإن نعم بأي أدوار ومع تسجيل كل تدخل في Audit Trail؟

5. **Cutover / Data Preservation**
   هل بيانات Al-Salam الحالية Production تُحفظ أم Demo تُتجاهل؟ وما النطاقات المشمولة؟

6. **Configuration Defaults**
   ما القيم الافتراضية لتثبيت عام (country/currency/locale/language/RTL)؟ وهل يلزم معالج إعداد (install wizard)؟

7. **RPO / RTO**
   ما RPO و RTO المطلوبان لكل إصدار؟ وما سياسة الاحتفاظ بالنسخ الاحتياطية؟ (لا تُخمَّن الأرقام)

8. **Kayan Soft Support Model**
   هل يمكن لـ Kayan Soft Support الوصول لبيانات العميل؟ وإن نعم، ما آلية الوصول وما المقاييس المسموح جمعها؟

9. **Product Editions**
   ما الإصدارات النهائية (Basic/Professional/Enterprise) وما الوحدات المشمولة في كل منها؟ (الأسعار خارج النطاق)

---

KAYAN SCHOOL ERP R4.2:
FINAL — BUSINESS DECISIONS APPROVED (see Decision Record D1–D9)
