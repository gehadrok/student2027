# Kayan School ERP — PG-4.1 Design Resolution

> **Phase:** PG-4.1 (DESIGN RESOLUTION ONLY). No production code, SQL, schema, migration, UI, `package.json`, or config was modified while producing this document.
> **Only artifact:** `docs/KAYAN_SCHOOL_ERP_PG4_1_DESIGN_RESOLUTION.md`.
> **Upstream:** PG-0/PG-1/PG-2/PG-3 = `PASS`; PG-4.0 = `READY_TO_IMPLEMENT`; PG-4.1 begins the DESIGN_REQUIRED items from PG-4.0 (A–F).
> **Constraints honored:** no Al-Salam data migration, no SQLite removal, no UI change, no auth behavior change yet, no PG-5, no R4.4 / Phase 6.3/7. Static/read-only verification only.
> **Governing docs:** `docs/KAYAN_SCHOOL_ERP_DECISION_RECORD_D1_D9_FINAL.md`, `..._R4_3_TARGET_ARCHITECTURE.md`, `..._READINESS_GATE.md`, `..._PG4_READINESS_AUDIT.md`.

---

## 0. Method & Evidence Base (read-only)

Inspected (no mutation):
- `src/lib/sqlite-schema.sql` (canonical 3NF runtime schema, 58 tables + 4 junction + indexes + triggers).
- `src/lib/sqlite-seed.sql` (Al-Salam customer/demo seed — **all rows are Al-Salam**).
- `migrations/001_master_data.sql` (SQLite-flavored master-data DDL + generic reference seed + Al-Salam/Yemen geo rows).
- `migrations/postgres/001_kayan_pilot_schema.sql` (7-table PG pilot already applied in PG-3).
- `src/core/datasource/sqlDialect.ts` (`DEFAULT_CONFLICT_TARGETS`, `INSERT OR REPLACE/IGNORE` translation).
- `src/modules/master-data/repository/masterDataRepository.ts` (`TABLE_MAP` 33 tables; `create()` uses plain `INSERT`).
- `src/core/auth/AuthService.ts`, `src/core/config/ConfigService.ts`, `src/lib/sqlite-repository.ts`, `src/modules/dashboard/repository/dashboardRepository.ts`, `src/lib/ai-client.ts`.
- Repo insert-style grep: `financialRepository`, `teacherRepository`, `studentRepository` use `INSERT OR REPLACE`; **academic repos (`SQLiteAcademicYearRepository`, `SQLiteCourseAssignmentRepository`, `SQLiteCurriculumRepository`, `SQLiteAcademicCalendarRepository`) use plain `INSERT INTO`**; `masterDataRepository` uses plain `INSERT`.

---

## 1. DESIGN A — D6 Seed Data Boundary

### 1.1 Classification table (per requested columns)
`Production-safe?` = safe as generic product default. `Migration-only?` = loaded only during Al-Salam migration (D5). `Demo-only?` = must never reach production. `Requires school config?` = value belongs in School Configuration, not product default.

| Source value / table group | Classification | PostgreSQL destination | Prod-safe? | Migration-only? | Demo-only? | Req. school config? |
|---|---|---|---|---|---|---|
| `education_stages`, `grade_levels`, `exam_types`, `certificate_types`, `attendance_types`, `leave_types`, `academic_statuses`, `identity_types`, `employee_types`, `qualifications`, `specializations`, `job_titles`, `departments` | Product-level reference (generic) | master_data tables (Layer 2) | YES | no | no | no |
| `system_numbering`, `document_types`, `school_branches` (empty) | Product-level reference / config template | master_data tables | YES | no | no | `school_branches` is per-school |
| `buildings`, `rooms`, `laboratories`, `libraries` | Product reference (structural templates) | master_data tables | YES (seed empty/neutral) | no | no | yes (per-school populated) |
| `fee_categories`, `payment_methods`, `discount_types` | Product reference | master_data tables | YES | no | no | partially |
| `currencies` (generic list, `is_base=0`) | Product reference | `currencies` | YES (do **not** set YER `is_base=1`) | no | no | base currency set in config |
| `countries` / `governorates` / `districts` / `cities` / `nationalities` (generic, non-Yemen) | Product reference (neutral) | geographic master_data | ONLY if neutral/generic | — | no | yes (populated per school) |
| `cnt_yemen`, `nat_yemen`, `gov_dhale` (الضالع), `gov_aden`, `gov_sanaa`, `gov_taiz`, `dist_jahaf` (جحاف), `dist_dhale_city`, `dist_aden_city` | **Al-Salam / Yemen-specific** | geographic master_data | **NO** | YES (D5 bundle) | no | yes (Al-Salam customer config) |
| `cur_yer` (`is_base=1`), `Asia/Aden` tz, `YER` currency as default | **Al-Salam / Yemen-specific** (D6 violation if default) | `currencies` / school config | **NO** | YES | no | yes |
| `school_settings` row ('مدرسة خالد ابن الوليد الضالع/جحاف' …) | **Al-Salam customer config** | `school_settings` / `schools` | **NO** | YES (D5) | no | YES (this IS school config) |
| `users` u1..u10, `teachers` t1..t4, `parents` p1..p2 | **Al-Salam customer data** | `users`/`teachers`/`parents` | **NO** | YES (D5) | no | yes |
| `school_classes`, `sections`, `students` s1..s3, `subjects` sub1..sub5, `schedule_periods`, `attendance_records`, `grade_records`, `certificates`, `fee_payments`, `expense_records`, `library_books`, `book_borrowings`, `app_notifications`, `audit_logs`, `saved_reports` | **Al-Salam customer/demo data** | runtime tables | **NO** | YES (D5) | the sample is demo | yes |
| `teacher_subjects`, `teacher_classes`, `parent_students`, `user_linked_students` rows | **Al-Salam customer data** | junction tables | **NO** | YES (D5) | no | yes |
| `schema_migrations`, install id, health/version | System data | `schema_migrations` | YES | n/a | no | no |

### 1.2 Critical rule (re-stated, enforced by this design)
**Al-Salam must never become the default identity/configuration of Kayan School ERP.** Therefore:
- The generic product seed (`migrations/postgres/007_seed_generic.sql`) contains **only** the rows marked Prod-safe above.
- All Al-Salam/Yemen-specific rows (Section 1.1 rows marked Migration-only/NO) are placed in a **separate Al-Salam migration bundle** (`migrations/seed/al-salam/*.sql`, executed only during the D5 data migration for the Al-Salam deployment, never as product default).
- `school_settings` / `schools` default row for a fresh Kayan install is a **generic placeholder** (`school_name = 'Kayan School ERP'`, empty/neutral locale/timezone/currency), never Al-Salam values.

### 1.3 Design A resolution
**RESOLVED.** Generic seed file and Al-Salam migration bundle are separable by table/content; no Al-Salam value is required for a generic install. (Values not invented beyond those present in `sqlite-seed.sql` / `001_master_data.sql`.)

---

## 2. DESIGN B — Composite Primary Key Conflict Targets

### 2.1 Dialect behavior (from `sqlDialect.ts`)
- `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING` (no target). Ignores **all** uniqueness violations. Safe for any PK/unique shape, including composite.
- `INSERT OR REPLACE` → `ON CONFLICT (<conflictCols>) DO UPDATE SET …`. `conflictCols` resolved via `DEFAULT_CONFLICT_TARGETS[table]`, defaulting to `['id']`.
- **Risk:** a composite-PK table using `INSERT OR REPLACE` with the default `['id']` would emit `ON CONFLICT (id)` → invalid (no `id` column) → runtime error. Must enumerate composite-PK tables and give them explicit targets.

### 2.2 Composite-PK & unique-constraint matrix

| table | PK | other unique constraints | conflict target (REPLACE) | used by | verification test |
|---|---|---|---|---|---|
| `teacher_subjects` | `(teacher_id, subject_id)` | PK | `(teacher_id, subject_id)` | `teacherRepository` (`INSERT OR IGNORE`) | `pg2RepositorySql.test.ts` IGNORE→DO NOTHING |
| `teacher_classes` | `(teacher_id, class_id)` | PK | `(teacher_id, class_id)` | `teacherRepository` (`INSERT OR IGNORE`) | `pg2RepositorySql.test.ts` |
| `parent_students` | `(parent_id, student_id)` | PK | `(parent_id, student_id)` | `studentRepository` (`INSERT OR IGNORE`) | `pg2RepositorySql.test.ts` |
| `user_linked_students` | `(user_id, student_id)` | PK | `(user_id, student_id)` | `sqlite-repository` (legacy, `INSERT OR IGNORE`) | PG-9 cutover |
| `students` | `id` | `user_id`,`academic_id` UNIQUE | `(id)` (default) | `studentRepository` (`INSERT OR REPLACE`) | `pg2RepositorySql.test.ts` |
| `teachers` | `id` | `user_id` UNIQUE | `(id)` (default) | `teacherRepository` (`INSERT OR REPLACE`) | `pg2RepositorySql.test.ts` |
| `fee_payments` | `id` | `receipt_number` UNIQUE | `(id)` (default) | `financialRepository` (`INSERT OR REPLACE`) | `pg2RepositorySql.test.ts` |
| `expense_records` | `id` | `voucher_number` UNIQUE | `(id)` (default) | `financialRepository` (`INSERT OR REPLACE`) | `pg2RepositorySql.test.ts` |
| `school_settings` | `id INTEGER=1` | — | `(id)` | `sqlite-repository` (legacy REPLACE) | PG-9 |
| `users` | `id` | `email` UNIQUE | `(id)` | `sqlite-repository` (legacy REPLACE) | PG-9 |
| `sections` | `id` | `(class_id,name)` UNIQUE | `(id)` (default) | `sqlite-repository` (legacy REPLACE) | PG-9 |
| `subjects` | `id` | — | `(id)` | `sqlite-repository` (legacy REPLACE), `SQLiteCourseAssignmentRepository` (plain INSERT) | PG-9 / PG-4.2 |
| `schedule_periods` | `id` | `(section_id,day,period_number)`, `(teacher_id,day,period_number)` UNIQUE | `(id)` (default) | `sqlite-repository` (legacy REPLACE) | PG-9 |
| `attendance_records` | `id` | `(student_id,date,subject_id)` UNIQUE | `(id)` (default) | `sqlite-repository` (legacy REPLACE) | PG-9 |
| `certificates` | `id` | `(student_id,term,academic_year)` UNIQUE | `(id)` (default) | `sqlite-repository` (legacy REPLACE) | PG-9 |
| all 33 master_data tables | `id` | `code` UNIQUE | `(id)` (default) | `masterDataRepository` (plain INSERT; seed uses `INSERT OR IGNORE`) | PG-4.2 seed test |

### 2.3 Required dialect update (design-only; applied in PG-4.2)
Extend `DEFAULT_CONFLICT_TARGETS` so every composite-PK table has an explicit target even though today they use `IGNORE` (future-proofs REPLACE and is mechanically precise):

```ts
export const DEFAULT_CONFLICT_TARGETS: Record<string, string[]> = {
  teachers: ['id'],
  students: ['id'],
  fee_payments: ['id'],
  expense_records: ['id'],
  teacher_subjects: ['teacher_id', 'subject_id'],
  teacher_classes: ['teacher_id', 'class_id'],
  parent_students: ['parent_id', 'student_id'],
  user_linked_students: ['user_id', 'student_id'],
};
```

### 2.4 Forward risk (logged, not blocking PG-4)
Legacy `sqlite-repository.ts` `INSERT OR REPLACE` on `sections`/`schedule_periods`/`attendance_records`/`certificates`/`fee_payments`/`expense_records` relies on SQLite deleting-and-reinserting even when a **secondary** UNIQUE (not PK) conflicts. PG `ON CONFLICT (id)` would **not** catch a secondary-unique clash → error. This affects the legacy path only (still on SQLite until PG-9). **Resolution deferred to PG-9:** refactor those legacy writes to `UPDATE`-or-`INSERT`, or add secondary-unique conflict targets. Not a PG-4 blocker because PG-4 exercises only the `IDataSource` repos (which already use the safe shapes above).

### 2.5 Design B resolution
**RESOLVED.** Matrix complete; dialect update specified; no composite-PK `INSERT OR REPLACE` exists today.

---

## 3. DESIGN C — D3 School Entity

### 3.1 Decision
Adopt **one canonical config entity `schools`** (single row per v1 deployment). **No `school_id`/`tenant_id` column is injected into any other table** (per D3). Existing `school_settings` (single-row, `id INTEGER CHECK(id=1)`) is retained for v1 backward compatibility and is kept in sync with `schools`; `schools` is the formal identity/branding/config concept.

### 3.2 `schools` DDL (target PostgreSQL)
```
schools (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,          -- e.g. deployment slug
  name_ar       TEXT NOT NULL,                 -- school name (branding)
  name_en       TEXT,
  status        SMALLINT NOT NULL DEFAULT 1,   -- active
  locale        TEXT NOT NULL DEFAULT 'ar',    -- language (D6: from config)
  timezone      TEXT,                          -- D6: from config (NOT Asia/Aden default)
  currency_code TEXT,                          -- FK-style ref to currencies.code (D6)
  academic_year TEXT,                          -- current academic year (config)
  current_term  TEXT,                          -- current term (config)
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  website       TEXT,
  logo_url      TEXT,
  primary_color TEXT,
  enable_sms_alerts    SMALLINT NOT NULL DEFAULT 0,
  enable_ai_analysis   SMALLINT NOT NULL DEFAULT 0,
  attendance_lock_hour TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by    TEXT,
  updated_by    TEXT
)
```
- PK: `id` TEXT. No `school_id` elsewhere. Relationships: `currency_code` references `currencies.code` (soft/optional FK). `school_settings` mirrors this row (id=1) for legacy readers.
- New-school provisioning: a fresh Kayan install seeds ONE generic `schools` row (`name_ar='Kayan School ERP'`, neutral locale/timezone/currency NULL/empty) — **never Al-Salam**.

### 3.3 Relationship to hardcoded defaults (D6 fix)
The following hardcoded Al-Salam/Yemen literals must be removed from product defaults and resolved from `schools`/`school_settings` (DB) or env, not source code:
- `ConfigService.ts:63` `appName` default `'Al-Salam School Management System'` → default `'Kayan School ERP'`.
- `ConfigService.ts:67` `timeZone` default `'Asia/Aden'` → removed default; read from `schools.timezone`.
- `ConfigService.ts:69` `currency` default `'YER'` → removed default; read from `schools.currency_code`.
- `ConfigService.ts:121` `emailFromAddress` default `'noreply@khaled-school.edu.ye'` → generic/`REACT_APP_EMAIL_FROM` only.
- `sqlite-repository.ts:16-39` default school name/email/address/timezone/currency → read from `schools` config.
- `dashboardRepository.ts:326-330` default school summary → read from `schools` config.
- `ai-client.ts:84,95` greeting hardcoding 'مدرسة خالد ابن الوليد الضالع/جحاف' → use `schools.name_ar`.
- `App.tsx:146` `dir="rtl"` (per R4.3) → from `schools.locale`.

### 3.4 Design C resolution
**RESOLVED.** Minimal canonical `schools` model defined; no `school_id` injection; supports `Kayan Soft → Kayan School ERP → Customer School → School Configuration → Operational Data` chain. Hardcode-removal list enumerated (implementation in PG-7, not PG-4).

---

## 4. DESIGN D — D4 Users / Auth / RBAC Base DDL

### 4.1 Current model (as-built)
- `users` (`src/lib/sqlite-schema.sql:11`): `id TEXT PK`, `name`, `role TEXT CHECK(role IN ('admin','teacher','student','parent'))`, `email UNIQUE`, `password_hash`, `phone`, `photo`, `avatar_color`, `linked_teacher_id`, `status`, `last_login`, `created_at`, `updated_at`.
- `AuthService.login` selects `password_hash` (defect removed in PG-0). Returns token `{userId, role, email, name}`. Browser persists `currentUser` (no `password_hash` in browser now).
- RBAC today: ~12 screens use `currentUser.role === 'admin'` (client-side). No permission model.

### 4.2 Target model (D4: `Role → Permission → Resource → Action → School Scope`)
Base DDL (resolvable now):
```
users (PG port of existing)            -- keep id/name/email/phone/status/created_at/updated_at;
  password_hash TEXT NOT NULL;         -- SERVER-ONLY, never selected/returned to browser
  role TEXT                            -- retained as legacy default role (kept for migration ease)
  (FK user_roles)

roles (
  id TEXT PK, code TEXT UNIQUE, name_ar TEXT, name_en TEXT,
  is_system SMALLINT DEFAULT 0, is_active SMALLINT DEFAULT 1,
  description TEXT, created_at TIMESTAMP, updated_at TIMESTAMP )

permissions (
  id TEXT PK, code TEXT UNIQUE,
  resource TEXT NOT NULL,             -- e.g. 'students','finance','academic'
  action TEXT NOT NULL,                -- 'view','create','edit','delete','import','export'
  scope TEXT,                         -- NULL = current school (v1); future tenant scope
  description TEXT, is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP, updated_at TIMESTAMP )

user_roles (
  user_id TEXT NOT NULL, role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE )

role_permissions (
  role_id TEXT NOT NULL, permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE )
```

### 4.3 Mapping & implications
- **Reusable fields:** `users.id/name/email/phone/status/password_hash` map directly; `role` retained as a convenience default (synced into `user_roles`).
- **Missing fields (new):** `roles`, `permissions`, `user_roles`, `role_permissions`, plus `scope` for future multi-tenancy.
- **Migration implications:** existing `users.role` string → seed a default `roles` row + `user_roles` link per user; `AuthService` must (a) stop selecting `password_hash` (done PG-0), (b) load `user_roles`→`permissions` at login, (c) return `roles[]`/`permissions[]` in token.
- **API implications:** authorization middleware enforces `permission(resource, action, scope)` server-side; `role==='admin'` short-circuits removed.
- **Frontend implications:** guard components by `hasPermission(resource, action)` instead of `role==='admin'`. (UI change deferred to PG-6; not PG-4.)
- **No SSO/OAuth/OIDC** introduced (none required by source architecture).

### 4.4 Unresolved evidence (explicitly flagged)
The intake references "14 baseline roles" mapped to permissions/resources/actions, but **that 14-role enumeration is not present in this repository** (not in `src/`, `docs/`, or the read decision records). The **base schema above is fully resolved**; the **specific seed roles/permissions values are DEFERRED to PG-6** and require the intake role enumeration as input.
> **DESIGN UNRESOLVED — EVIDENCE REQUIRED (seed values only, not schema):** the exact 14-role / permission-matrix content for `roles`/`permissions`/`role_permissions` seed. Schema design is complete; this does **not** block PG-4.2 (which only needs the base tables defined).

### 4.5 Design D resolution
**RESOLVED** (base model + migration/API/frontend implications). Seed-value enumeration deferred to PG-6 (flagged, non-blocking).

---

## 5. DESIGN E — Full Schema Dependency Layers

### 5.1 Global type-conversion policy (SQLite → PostgreSQL)
| SQLite | PostgreSQL | Rationale (D7/D8/D9) |
|---|---|---|
| `DATETIME` | `TIMESTAMP` | preserve stored UTC |
| `REAL` used for money (`max_score`,`pass_score`,`amount`,`total_amount`,`paid_amount`,`remaining_amount`,`score`,`weight`,`gpa`,`percentage`,`discount_percent`,`exchange_rate`) | `NUMERIC(18,2)` | exact financial precision |
| `INTEGER` flag (`is_active`,`is_current`,`status`-as-int,`notified`,`enable_*`) | `SMALLINT` | preserves 0/1 semantics (pilot policy) |
| `INTEGER` counter (`level`,`experience_years`,`copies_*`,`next_number`,…) | `INTEGER` | unchanged |
| `TEXT` | `TEXT` | unchanged |
| `CHECK(...)` | `CHECK(...)` | preserved (incl. `role IN (...)`, `room_type IN (...)`) |
| `id TEXT PRIMARY KEY` | `TEXT PRIMARY KEY` | unchanged |
| `school_settings.id INTEGER CHECK(id=1)` | `INTEGER PRIMARY KEY CHECK(id=1)` | preserve single-row contract |
| `PRAGMA foreign_keys` / `TRIGGER` | **dropped** | PG uses app-managed `updated_at` (repos set `CURRENT_TIMESTAMP`); no SQLite triggers |

### 5.2 Layer 0 — Foundational
| table | source | target PG | PK | FK | unique | indexes | seed | repo |
|---|---|---|---|---|---|---|---|---|
| `schema_migrations` | new | `schema_migrations` | `version TEXT` | — | `version` | — | system | migration runner |

(No `pgcrypto`/UUID extension required — all ids are application-generated TEXT, per PG-3 decision.)

### 5.3 Layer 1 — Organization / Configuration / Security
| table | source | target PG | PK | FK | unique | indexes | seed | repo |
|---|---|---|---|---|---|---|---|---|
| `schools` | new (§3.2) | `schools` | `id TEXT` | `currency_code→currencies.code` (soft) | `code` | code, is_active | generic 1-row (§1.2) | ConfigService/school config |
| `school_settings` | sqlite-schema:18 | `school_settings` | `id INTEGER=1` | — | `id` | — | generic 1-row | ConfigService |
| `users` | sqlite-schema:1 | `users` | `id TEXT` | — | `email` | `idx_users_role_status` | Al-Salam (D5) | AuthService |
| `roles` | new (§4.2) | `roles` | `id TEXT` | — | `code` | code | deferred PG-6 | AuthService |
| `permissions` | new (§4.2) | `permissions` | `id TEXT` | — | `code` | code | deferred PG-6 | AuthService |
| `user_roles` | new (§4.2) | `user_roles` | `(user_id,role_id)` | users, roles | PK | — | from users.role (D5/PG-6) | AuthService |
| `role_permissions` | new (§4.2) | `role_permissions` | `(role_id,permission_id)` | roles, permissions | PK | — | deferred PG-6 | AuthService |
| `audit_logs` | sqlite-schema:17 | `audit_logs` | `id TEXT` | `user_id→users` | — | `idx_audit_logs_timestamp` | Al-Salam (D5) | AuditService (redirect PG-7) |

### 5.4 Layer 2 — Master / Reference Data (33 `TABLE_MAP` tables)
All 33 from `masterDataRepository.TABLE_MAP`: `academic_years, academic_terms, education_stages, grade_levels, sections_master, subjects_master, exam_types, certificate_types, attendance_types, leave_types, academic_statuses, nationalities, countries, governorates, districts, cities, identity_types, employee_types, qualifications, specializations, job_titles, departments, buildings, rooms, laboratories, libraries, fee_categories, payment_methods, discount_types, currencies, system_numbering, school_branches, document_types`. Plus `master_data_audit_log`, `master_data_permissions`.
- **PK:** `id TEXT` for all. **Unique:** `code` for all. **FK:** `education_stage_id→education_stages`, `grade_level_id→grade_levels`, `nationality_id→nationalities`, `country_id→countries`, `governorate_id→governorates`, `employee_type_id→employee_types`, `parent_department_id→departments`, `parent_category_id→fee_categories`, `building_id→buildings`, `room_id→rooms`. **Indexes:** `code`, `name_ar`, `is_active` (+ FK cols) per `001_master_data.sql`. **Seed:** generic reference (§1.1, no Al-Salam geo). **Repo:** `masterDataRepository`.
- Note: `countries/governorates/districts/cities/nationalities` are in this layer but seeded **generic/neutral only** (Al-Salam Yemen geo → D5 bundle, §1.1).

### 5.5 Layer 3 — Academic Structures
| table | source | target PG | PK | FK | unique | indexes | seed | repo |
|---|---|---|---|---|---|---|---|---|
| `academic_years` | pilot (exists) | `academic_years` | `id TEXT` | — | `code` | code,is_active,year | generic (001_master_data) | SQLiteAcademicYearRepository |
| `academic_terms` | pilot (exists) | `academic_terms` | `id TEXT` | `academic_year_id→academic_years CASCADE` | `code` | code,year | generic | SQLiteAcademicYearRepository |
| `education_stages` | pilot (exists) | `education_stages` | `id TEXT` | — | `code` | code,is_active | generic | masterDataRepository |
| `grade_levels` | pilot (exists) | `grade_levels` | `id TEXT` | `education_stage_id→education_stages SET NULL` | `code` | code,stage | generic | masterDataRepository |
| `subjects_master` | pilot (exists) | `subjects_master` | `id TEXT` | `grade_level_id→grade_levels SET NULL` | `code` | code,is_active | generic | SQLiteCurriculumRepository / masterDataRepository |
| `academic_calendar_days` | pilot (exists) | `academic_calendar_days` | `id TEXT` | — | `day` | day,week | none | SQLiteAcademicCalendarRepository |
| `subjects` | pilot (exists) | `subjects` | `id TEXT` | `class_id→school_classes CASCADE`, `teacher_id→teachers RESTRICT` | — | class_teacher | none | SQLiteCourseAssignmentRepository |
| `schedule_periods` | sqlite-schema:8 | `schedule_periods` | `id TEXT` | class/section/subject/teacher | `(section_id,day,period_number)`,`(teacher_id,day,period_number)` | class_section,teacher_day | none | schedule repo (future) |

> **Important correction:** dedicated `course_assignments` / `curriculum` tables are **NOT present** in `sqlite-schema.sql` and are **NOT required** by current repos (`SQLiteCourseAssignmentRepository` → `subjects`; `SQLiteCurriculumRepository` → `subjects_master`). Layer 3 therefore needs no extra course/curriculum tables; the 7 pilot tables already cover the academic runtime schema.

### 5.6 Layer 4 — Students / Teachers / Relationships
| table | source | target PG | PK | FK | unique | indexes | seed | repo |
|---|---|---|---|---|---|---|---|---|
| `teachers` | sqlite-schema:2 | `teachers` | `id TEXT` | `user_id→users CASCADE` | `user_id` | user_id | Al-Salam (D5) | teacherRepository |
| `parents` | sqlite-schema:3 | `parents` | `id TEXT` | `user_id→users CASCADE` | `user_id` | user_id | Al-Salam (D5) | parentRepository |
| `students` | sqlite-schema:6 | `students` | `id TEXT` | user_id,class_id,section_id,parent_id | `user_id`,`academic_id` | class_section,parent,academic | Al-Salam (D5) | studentRepository |
| `school_classes` | sqlite-schema:4 | `school_classes` | `id TEXT` | — | `name` | — | Al-Salam (D5) | classRepository |
| `sections` | sqlite-schema:5 | `sections` | `id TEXT` | class_id, supervisor_teacher_id | `(class_id,name)` | class_id | Al-Salam (D5) | sectionRepository |
| `teacher_subjects` | sqlite-schema:20 | `teacher_subjects` | `(teacher_id,subject_id)` | teachers,subjects | PK | subject | Al-Salam (D5) | teacherRepository |
| `teacher_classes` | sqlite-schema:21 | `teacher_classes` | `(teacher_id,class_id)` | teachers,classes | PK | — | Al-Salam (D5) | teacherRepository |
| `parent_students` | sqlite-schema:22 | `parent_students` | `(parent_id,student_id)` | parents,students | PK | student | Al-Salam (D5) | studentRepository |
| `user_linked_students` | sqlite-schema:23 | `user_linked_students` | `(user_id,student_id)` | users,students | PK | — | Al-Salam (D5) | auth/user |

### 5.7 Layer 5 — Finance
| table | source | target PG | PK | FK | unique | indexes | seed | repo |
|---|---|---|---|---|---|---|---|---|
| `fee_payments` | sqlite-schema:12 | `fee_payments` | `id TEXT` | `student_id→students CASCADE` | `receipt_number` | student_status,due_date | Al-Salam (D5) | financialRepository |
| `fee_categories` | sqlite-schema:25 (001) | `fee_categories` | `id TEXT` | `parent_category_id→fee_categories SET NULL` | `code` | code,parent | generic | masterDataRepository |
| `expense_records` | sqlite-schema:13 | `expense_records` | `id TEXT` | — | `voucher_number` | category_date | Al-Salam (D5) | financialRepository |
| `payment_methods` | 001 | `payment_methods` | `id TEXT` | — | `code` | code | generic | masterDataRepository |
| `discount_types` | 001 | `discount_types` | `id TEXT` | — | `code` | code | generic | masterDataRepository |

### 5.8 Layer 6 — Operational / Audit / Reporting
| table | source | target PG | PK | FK | unique | indexes | seed | repo |
|---|---|---|---|---|---|---|---|---|
| `attendance_records` | sqlite-schema:9 | `attendance_records` | `id TEXT` | student/class/section/subject | `(student_id,date,subject_id)` | student_date,class_date | Al-Salam (D5) | attendanceRepository |
| `grade_records` | sqlite-schema:10 | `grade_records` | `id TEXT` | student,subject | — | student_subject,term_type | Al-Salam (D5) | gradesRepository |
| `certificates` | sqlite-schema:11 | `certificates` | `id TEXT` | `student_id→students CASCADE` | `(student_id,term,academic_year)` | student_term | Al-Salam (D5) | certificateRepository |
| `library_books` | sqlite-schema:14 | `library_books` | `id TEXT` | — | `isbn` | category_isbn | Al-Salam (D5) | libraryRepository |
| `book_borrowings` | sqlite-schema:15 | `book_borrowings` | `id TEXT` | book,student | — | student_status,due_date | Al-Salam (D5) | libraryRepository |
| `app_notifications` | sqlite-schema:16 | `app_notifications` | `id TEXT` | `user_id→users CASCADE` | — | user_read | Al-Salam (D5) | notificationRepository |
| `saved_reports` | sqlite-schema:19 | `saved_reports` | `id TEXT` | — | — | generated_at | Al-Salam (D5) | reportRepository |

### 5.9 Design E resolution
**RESOLVED.** Full 6-layer plan enumerated with source→target, PK/FK/unique/index/seed/repo. Course-assignment/curriculum dedicated tables correctly excluded.

---

## 6. DESIGN F — Migration Strategy

### 6.1 File sequence (under `migrations/postgres/`), ordered by FK dependency
| order | file | layer | contents |
|---|---|---|---|
| 000 | `000_schema_migrations.sql` | 0 | `schema_migrations` |
| 001 | `001_security_organization.sql` | 1 | `schools`, `school_settings`, `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `audit_logs` |
| 002 | `002_master_data.sql` | 2 | 33 master_data tables + `master_data_audit_log` + `master_data_permissions` |
| 003 | `003_academic.sql` | 3 | (validate/keep 7 pilot tables; add `schedule_periods`) |
| 004 | `004_students_teachers.sql` | 4 | `teachers`,`parents`,`students`,`school_classes`,`sections`,`teacher_subjects`,`teacher_classes`,`parent_students`,`user_linked_students` |
| 005 | `005_finance.sql` | 5 | `fee_payments`,`fee_categories`,`expense_records`,`payment_methods`,`discount_types` |
| 006 | `006_operational.sql` | 6 | `attendance_records`,`grade_records`,`certificates`,`library_books`,`book_borrowings`,`app_notifications`,`saved_reports` |
| 007 | `007_seed_generic.sql` | — | generic reference seed ONLY (§1.1 Prod-safe rows) |
| 008 | `008_rbac_base.sql` | — | empty `roles`/`permissions` structure (seed values deferred PG-6) |

Al-Salam customer data is **not** in product migrations; it lives in `migrations/seed/al-salam/*.sql`, executed only by the D5 migration pipeline for the Al-Salam deployment.

### 6.2 Rules
- **Deterministic:** files applied in numeric order; each wrapped in `BEGIN … EXCEPTION ROLLBACK` where DDL allows (DDL is transactional in PG within a single statement; multi-statement file wrapped in one transaction).
- **Repeatable:** every `CREATE TABLE` is `IF NOT EXISTS`; every seed row is `INSERT … ON CONFLICT DO NOTHING`.
- **Verifiable:** runner records `schema_migrations(version, applied_at)`; post-apply asserts expected tables via `information_schema` and row counts for seeded tables.
- **Rollback-aware:** each file paired with a `DROP TABLE IF EXISTS … CASCADE` undo script; full revert = drop all PG tables (SQLite untouched, instant fallback via `DATA_SOURCE_TYPE` flag).
- **Safe for future Al-Salam migration:** product migrations never contain Al-Salam identity; the D5 bundle is separate and idempotent (copy/validate/verify, D5).
- **Numbering is evidence-based** (FK layers), not arbitrary.

### 6.3 PG-4.2 first cut (per Readiness Gate: first migrations = master_data + academic)
PG-4.2 implements: `000_schema_migrations.sql` + `002_master_data.sql` + `003_academic.sql` (validate/keep pilot; add `schedule_periods`) + `007_seed_generic.sql`. Layers 1, 4, 5, 6 remain later phases (PG-4.x / PG-7) and are fully specified above so they are not re-designed.

### 6.4 Design F resolution
**RESOLVED.** Sequence justified by FK dependencies; idempotent/transactional/verifiable/rollback rules defined.

---

## 7. Repository Mapping (table → consuming repository)
- 33 master_data tables → `masterDataRepository` (`TABLE_MAP`).
- `academic_years`,`academic_terms` → `SQLiteAcademicYearRepository`.
- `subjects_master` → `SQLiteCurriculumRepository` + `masterDataRepository`.
- `subjects` → `SQLiteCourseAssignmentRepository`.
- `academic_calendar_days` → `SQLiteAcademicCalendarRepository`.
- `students` → `studentRepository`; `parent_students`,`user_linked_students` → `studentRepository`/auth.
- `teachers` → `teacherRepository`; `teacher_subjects`,`teacher_classes` → `teacherRepository`.
- `fee_payments`,`expense_records` → `financialRepository`; `fee_categories`,`payment_methods`,`discount_types` → `masterDataRepository`.
- `users`,`roles`,`permissions`,`user_roles`,`role_permissions` → `AuthService`/user repo.
- `audit_logs` → `AuditService` (redirect PG-7).
- `schools`,`school_settings` → ConfigService/school-config repo.
- `attendance_records`,`grade_records`,`certificates`,`library_books`,`book_borrowings`,`app_notifications`,`saved_reports`,`school_classes`,`sections` → respective domain repositories (attendance/grades/certificate/library/notification/report/class/section).

---

## 8. Data Migration Implications (D5)
- **Classify first (R4.3 §15):** every SQLite row is either Product reference (generic, → `007_seed_generic.sql`), or Al-Salam Customer data (→ `migrations/seed/al-salam/`, loaded only by D5 pipeline).
- **Transform:** `DATETIME→TIMESTAMP`, `REAL` money→`NUMERIC(18,2)`, flags→`SMALLINT`; drop SQLite triggers/PRAGMA; `INSERT OR IGNORE`→`ON CONFLICT DO NOTHING`.
- **Load order:** Layer 0→6 FK order (§5). Reference before runtime; master data before academic; academic before students/teachers; students/teachers before attendance/grades/finance.
- **Verify:** reconciliation report (source count → imported → rejected → transformed → validation result) before cutover; SQLite retained until PG verified (D5).
- **No destructive step in PG-4** (design only); actual migration is PG-8.

---

## 9. Explicit Assumptions
1. v1 = single school per PostgreSQL DB; no `school_id`/`tenant_id` columns (D3).
2. All ids remain application-generated TEXT (no UUID PKs in v1; deferred per PG-2).
3. `school_settings` retained alongside `schools` for v1 compatibility; kept in sync.
4. `course_assignments`/`curriculum` dedicated tables are unnecessary (verified from repo insert targets).
5. Geographic reference data (countries/governorates/districts/cities/nationalities) is seeded **generic/neutral only**; Al-Salam Yemen geo is customer data (D6).
6. `password_hash` stays server-side; never selected/returned (PG-0 already enforced in `AuthService`).
7. RBAC `scope` column nullable; v1 treats NULL as "current school".

---

## 10. Unresolved Items
- **DESIGN UNRESOLVED — EVIDENCE REQUIRED (seed values only):** the exact "14 baseline roles" → `roles`/`permissions`/`role_permissions` seed content referenced by R4.3 §10 is **not present in this repository**. The base schema (§4.2) is fully resolved; seed values are deferred to PG-6 and require the intake role enumeration as input. **This does not block PG-4.2** (which only defines the base tables).
- All other items (A–F) are resolved from repository + approved architecture evidence.

---

## 11. Verification Evidence (read-only checks performed)
- `grep` `INSERT OR REPLACE|INSERT OR IGNORE` across `src/**/*.ts`: confirmed only `financialRepository`, `teacherRepository`, `studentRepository` use `INSERT OR REPLACE` (single-`id` tables); academic repos + `masterDataRepository` use plain `INSERT`; junction tables use `INSERT OR IGNORE`.
- `read` `src/lib/sqlite-schema.sql`: enumerated 58 tables + 4 composite-PK junction tables; confirmed `course_assignments`/`curriculum` absent.
- `read` `src/core/datasource/sqlDialect.ts`: confirmed `DEFAULT_CONFLICT_TARGETS` default `['id']`; `INSERT OR IGNORE`→`ON CONFLICT DO NOTHING`.
- `read` `src/modules/master-data/repository/masterDataRepository.ts`: `TABLE_MAP` = 33 tables; `create()` uses plain `INSERT`.
- `read` `migrations/001_master_data.sql` + `src/lib/sqlite-seed.sql`: confirmed Al-Salam/Yemen-specific rows (`cnt_yemen`,`gov_dhale`,`gov_jahaf`,`dist_jahaf`,`cur_yer`, school name 'مدرسة خالد ابن الوليد الضالع/جحاف', users u1..u10, students s1..s3, etc.).
- `grep` `khaled|الضالع|YER|Asia/Aden|Al-Salam` in `src`: located hardcoded defaults in `ConfigService.ts:63,67,69,121`, `sqlite-repository.ts:16-39`, `dashboardRepository.ts:326-330`, `ai-client.ts:84,95` — all enumerated for D6 removal.
- `read` `src/core/auth/AuthService.ts`: confirmed `password_hash` selection already removed from browser path; token carries `{userId, role, email, name}`.
- **No production database, code, SQL, schema, migration, UI, or config was modified.**

---

## 12. Implementation Order for PG-4.2
1. Create `migrations/postgres/000_schema_migrations.sql` (Layer 0).
2. Create `migrations/postgres/002_master_data.sql` (Layer 2: 33 tables + `master_data_audit_log` + `master_data_permissions`) following `001_kayan_pilot_schema.sql` type policy.
3. Create `migrations/postgres/003_academic.sql` (Layer 3: keep 7 pilot tables; add `schedule_periods`).
4. Create `migrations/postgres/007_seed_generic.sql` (generic reference seed only; **exclude** all Al-Salam/Yemen rows per §1).
5. Apply `DEFAULT_CONFLICT_TARGETS` update from §2.3 to `src/core/datasource/sqlDialect.ts`.
6. Live validation (extend `postgres.live.test.ts`): apply migrations on a fresh DB; assert all tables exist in `information_schema`; exercise `masterDataRepository` + academic repos with `INSERT`/`INSERT OR REPLACE`/`INSERT OR IGNORE` on live PG; assert `COUNT`/`DATE` behavior (PG-3 fixes).
7. Regression: `npm test` 121/121; `npm run build` exit 0; `tsc` ≤ 12 baseline errors.

---

## 13. Final Verdict

**`PG-4.1: DESIGN RESOLVED — READY FOR PG-4.2`**

All six DESIGN_REQUIRED items (A–F) are resolved from repository + approved-architecture evidence:
- **A** — Seed boundary classified; Al-Salam/Yemen rows isolated to a D5 migration bundle; generic product seed is separable (§1).
- **B** — Composite-PK conflict-target matrix complete; dialect update specified; no composite-PK `INSERT OR REPLACE` exists today (§2).
- **C** — Minimal `schools` config entity designed with no `school_id` injection; hardcoded Al-Salam defaults enumerated for removal (§3).
- **D** — `users`/`roles`/`permissions`/`user_roles`/`role_permissions` base model designed; only the 14-role *seed values* are deferred to PG-6 (flagged, non-blocking) (§4).
- **E** — Full 6-layer schema plan with source→target, PK/FK/unique/index/seed/repo; course-assignment/curriculum tables correctly excluded (§5).
- **F** — Evidence-based migration sequence with deterministic/idempotent/transactional/verifiable/rollback rules (§6).

The single evidence gap (RBAC 14-role seed enumeration) is explicitly flagged as `DESIGN UNRESOLVED — EVIDENCE REQUIRED` for **seed values only** and does not block PG-4.2, which requires only the base tables. PG-4.2 may proceed.
