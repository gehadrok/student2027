# Kayan School ERP — PG-4.2 Implementation Report

**Phase:** PG-4.2 — First Approved Implementation Slice (Foundation + Master Data + Academic + Generic Seed + Minimum D3 School Configuration)
**Status:** ✅ COMPLETE — VERIFIED LIVE
**Date:** 2026-08-24
**Verdict:** `PG-4.2: IMPLEMENTED — LIVE-VERIFIED (PASS)`

---

## 1. Executive Summary
PG-4.2 delivers the first approved PostgreSQL implementation slice on top of the
already-applied PG-2B pilot (`kayan_school_erp`). It adds a migration ledger
(`000`), the minimum D3 `schools` table (`001`), the full 33-table master-data
layer + audit/permissions (`002`), the academic runtime layer with a
dependency-free `schedule_periods` (`003`), and a **generic, Al-Salam-free**
reference seed (`007`). A comment/string-aware migration runner and a live
verification test were added. Everything was verified against the live
`kayan_school_erp` PostgreSQL 16 database: all tables materialize, generic seed
is correct, **zero** Al-Salam/Yemen/geographic rows exist, the set is idempotent,
and `MasterDataRepository` CRUD works over PostgreSQL.

## 2. Scope (from PG-4.2 directive)
1. Migration `000` foundation → `schema_migrations`.
2. `002_master_data` — 33 `TABLE_MAP` tables + `master_data_audit_log` + `master_data_permissions`.
3. `003_academic` — keep/validate 7 pilot tables + add `schedule_periods` (no cross-layer FKs).
4. `007_generic_seed` — generic reference only, zero Al-Salam/Yemen.
5. **Minimum D3 `schools` table** (explicitly included per SCOPE #5).
6. No Al-Salam data migration, no SQLite removal, no UI change, no multi-tenancy, no `school_id` on operational tables, no invented RBAC roles.

## 3. Prerequisites / Environment
- PostgreSQL 16 on `localhost:5432`, database `kayan_school_erp`, user `postgres`.
- PG-2B pilot already applied (7 tables: `education_stages`, `grade_levels`, `academic_years`, `academic_terms`, `subjects_master`, `academic_calendar_days`, `subjects`).
- `pg ^8.23.0` + `@types/pg` installed. Credentials supplied via env (`PGPASSWORD`, never logged).

## 4. Files Created
| File | Purpose |
|------|---------|
| `migrations/postgres/000_schema_migrations.sql` | Migration ledger table. |
| `migrations/postgres/001_school_configuration.sql` | `schools` DDL + 1 generic seed row. |
| `migrations/postgres/002_master_data.sql` | 33 master tables + `master_data_audit_log` + `master_data_permissions` + indexes. |
| `migrations/postgres/003_academic.sql` | 7 pilot tables (idempotent) + `schedule_periods` (no FK) + academic indexes. |
| `migrations/postgres/007_generic_seed.sql` | Generic reference seed (no Al-Salam/geo). |
| `scripts/apply-postgres-migrations.mjs` | Idempotent migration runner (records `schema_migrations`). |
| `src/core/datasource/pg4.migrations.live.test.ts` | Live verification (criteria A–F). |

## 5. Files Modified
| File | Change |
|------|--------|
| `src/core/datasource/sqlDialect.ts` | Added the 4 composite-PK junction tables (`teacher_subjects`, `teacher_classes`, `parent_students`, `user_linked_students`) to `DEFAULT_CONFLICT_TARGETS` (PG-4.1 §2.3). Purely additive. |
| `migrations/postgres/migrations.test.ts` | Moved native-type assertions (SMALLINT/NUMERIC/TIMESTAMP) to a combined-set check so foundation/config-only files (`000`, `001`) don't fail the per-file rule; seed-only files (`007`) validated via "creates tables OR seeds data". |
| `migrations/postgres/archive/001_kayan_pilot_schema.sql` | Moved the orphan PG-2B pilot file into `archive/` so it no longer collides on version `001` with `001_school_configuration.sql` and is excluded from the PG-4.2 apply set (its 7 tables are fully re-created by `002`+`003`). |

## 6. Migration Sequence Applied
`000` → `001` → `002` → `003` → `007`. The runner records each in `schema_migrations` and skips already-applied versions on re-run. Observed run: **5 applied, 0 skipped** (first run); **0 applied, 5 skipped** (second run = idempotent).

## 7. Type-Mapping Policy (D7/D8/D9 + Point 3)
- `id` → `TEXT PRIMARY KEY`
- `is_*` flags → `SMALLINT`
- `created_at`/`updated_at` → `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` (app-managed; no PG triggers, per design)
- money/score (`amount`, `max_score`, `pass_score`, `discount_percent`, `weight_percent`) → `NUMERIC(18,2)`
- `exchange_rate` → `NUMERIC(18,6)` (rate, not money)
- calendar (`start_date`/`end_date`) → `DATE`
- counters → `INTEGER`
- FKs → referenced `TEXT` PK (`ON DELETE SET NULL` / `CASCADE` per canonical SQLite)
- `CHECK` constraints preserved; `school_settings`-style `id INTEGER CHECK(id=1)` not needed for PG-4.2.
- **Dropped** (per design): SQLite `PRAGMA`, `TRIGGER`, `AUTOINCREMENT`, `DATETIME`→`TIMESTAMP`, `REAL`→`NUMERIC`. No `INSERT OR *`; seed uses `ON CONFLICT (id) DO NOTHING`.

## 8. Master-Data Layer (33 `TABLE_MAP` tables)
`academic_years, academic_terms, education_stages, grade_levels, sections_master,
subjects_master, exam_types, certificate_types, exam_types, certificate_types,
attendance_types, leave_types, academic_statuses, nationalities, countries,
governorates, districts, cities, identity_types, employee_types, qualifications,
specializations, job_titles, departments, buildings, rooms, laboratories,
libraries, fee_categories, payment_methods, discount_types, currencies,
system_numbering, school_branches, document_types` — plus `master_data_audit_log`
and `master_data_permissions`. The 5 overlapping pilot tables
(`education_stages`, `grade_levels`, `academic_years`, `academic_terms`,
`subjects_master`) are created via `IF NOT EXISTS` (no-op over the existing pilot
tables; authoritative on fresh DB).

## 9. Academic Layer
`003` re-declares the 7 pilot tables idempotently and **adds `schedule_periods`
WITHOUT the cross-layer FKs** to `subjects`/`sections`/`school_classes`/`teachers`
(those parent tables are out of PG-4.2 scope; FKs deferred to a later layer, `004`).
`schedule_periods` retains its `UNIQUE (section_id, day, period_number)` and
`UNIQUE (teacher_id, day, period_number)` constraints.

## 10. Minimum D3 School Configuration
`schools` = single-tenant bootstrap table: `id, code UNIQUE, name_ar, name_en,
status, locale, timezone, currency_code, academic_year, current_term, phone,
email, address, website, logo_url, primary_color, enable_sms_alerts,
enable_ai_analysis, attendance_lock_hour, created_at/updated_at, created_by/
updated_by`. **No `school_id` injection anywhere** (per Design C). Generic seed:
one row `school_kayan` / `KAYAN` / `Kayan School ERP`, `currency_code = NULL`
(no base-currency assumption).

## 11. Generic Seed Classification (Design A + D6)
Seeded (generic, non-Al-Salam): `education_stages`(3), `grade_levels`(12),
`exam_types`(5), `certificate_types`(4), `attendance_types`(4), `leave_types`(5),
`academic_statuses`(5), `identity_types`(4), `employee_types`(4),
`qualifications`(5), `specializations`(7), `job_titles`(5), `payment_methods`(4),
`discount_types`(4), `system_numbering`(5), `document_types`(4), `currencies`(3,
all `is_base=0`), `master_data_permissions`(33 defaults).
**Left EMPTY by design:** `academic_years`, `academic_terms`, `subjects_master`,
`sections_master`, `fee_categories`, `departments`, `buildings`, `rooms`,
`laboratories`, `libraries`, `school_branches` (school-specific) and **all
geographic tables** (`countries`, `governorates`, `districts`, `cities`,
`nationalities`) per D6.

## 12. No Al-Salam / Yemen Evidence (criterion D)
Live test asserts:
- `countries`, `governorates`, `districts`, `cities`, `nationalities` each have **0 rows**.
- No master table contains a row whose `name_ar`/`name_en` matches `%الضالع%` or `%جحاف%` (Dhale / Jahaf) — verified across all 33 tables → **0 matches**.
- No `school_settings`/`config` Al-Salam hardcodes touched (D6/PG-7 deferred).
- Generic `currencies` seed asserts **no `is_base=1`** row.

## 13. Composite-PK / Dialect Update (Design B + §2.3)
The 4 junction tables (`teacher_subjects`, `teacher_classes`, `parent_students`,
`user_linked_students`) are the only composite-PK tables; they use `INSERT OR
IGNORE` → `ON CONFLICT DO NOTHING` (always safe). `DEFAULT_CONFLICT_TARGETS` in
`sqlDialect.ts` now lists all 4 with their composite columns for mechanical
precision. (These tables are not created in PG-4.2 — their parents are out of
scope — so the mapping is forward-looking and harmless.)

## 14. RBAC (Design D) — DEFERRED
`users`/`roles`/`permissions`/`user_roles`/`role_permissions` are NOT created in
PG-4.2. The 14-role seed remains **unresolved pending evidence** (non-blocking,
per PG-4.1). `master_data_permissions` (entity-level scaffolding) is seeded with
generic defaults only.

## 15. `course_assignments` / `curriculum` (Design E) — NOT NEEDED
Verified the repositories persist via `subjects` and `subjects_master`
respectively; no dedicated `course_assignments`/`curriculum` tables exist or are
required. None created.

## 16. Idempotency (criterion C)
- Each file uses `CREATE TABLE IF NOT EXISTS` / `INSERT ... ON CONFLICT (id) DO
  NOTHING`.
- The runner records applied versions and skips them on re-run (verified: 2nd run
  skipped all 5).
- The live test applies the set **twice** via the datasource and asserts stable
  row counts (passed).

## 17. Live Verification Results (criteria A–F)
Target DB: `kayan_school_erp` (PostgreSQL 16). Runner (raw `pg`) + live test
(`PostgreSQLDataSource`) both used.
- **A. Tables exist:** all 33 master + `schools` + `schedule_periods` +
  `master_data_audit_log` + `master_data_permissions` + `schema_migrations`
  present. ✅
- **B. Fresh/apply:** runner applied 000–007 cleanly (5 applied). ✅
- **C. Idempotency:** 2nd runner run skipped all 5; live test double-apply stable. ✅
- **D. No Al-Salam/geo:** 0 geographic rows; 0 Dhale/Jahaf names. ✅
- **E. Repo CRUD:** `MasterDataRepository.create → getById → delete` on
  `document_types` over PostgreSQL works. ✅
- **F. Regression:** full suite **137 pass / 0 fail** (baseline 121 + new PG-4.2
  checks); `npm run build` exit 0; `tsc --noEmit` = 11 pre-existing errors, **0
  new**. ✅

## 18. Regression
- `node --test` (full): **137 pass / 0 fail**.
- `migrations/postgres/migrations.test.ts`: 14/14 (no SQLite constructs, FK
  references resolve, native PG types present).
- `postgres.live.test.ts` (PG-3): 14/14 (unchanged).
- `npm run build`: success (chunk-size warnings only).
- `tsc --noEmit`: 11 errors total, **none** in PG-4.2 changes.

## 19. Migration Runner Usage
```bash
# Ensure env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE=kayan_school_erp
node scripts/apply-postgres-migrations.mjs            # apply new/changed
node scripts/apply-postgres-migrations.mjs --force    # re-apply all
```
The runner reads config from the environment only (no hardcoded credentials) and
never logs the password.

## 20. Git Classification
- **A (acceptable):** `migrations/postgres/000_schema_migrations.sql`,
  `001_school_configuration.sql`, `002_master_data.sql`, `003_academic.sql`,
  `007_generic_seed.sql`, `scripts/apply-postgres-migrations.mjs`,
  `src/core/datasource/pg4.migrations.live.test.ts`, `sqlDialect.ts` edit,
  `migrations.test.ts` edit.
- **A (acceptable / housekeeping):** `migrations/postgres/archive/001_kayan_pilot_schema.sql`
  (moved, not deleted; preserves PG-2B history; excluded from PG-4.2 apply set).
- **B (borderline — reviewed, safe):** moving the pilot file to `archive/`
  changes its on-disk path; no code references it (only narrative docs). Docs
  (`PG2/PG3/PG4_READINESS/PG4_1` reports) still name the old path — cosmetic,
  non-functional; recommend a doc note (done below).
- **C (unacceptable):** none.

## 21. Risks / Limitations
- `updated_at` is app-managed (no PG trigger); repositories that write it do so,
  matching the canonical runtime convention. Operational tables (`users`,
  `teachers`, `students`, …) are NOT in PG-4.2 and retain whatever mechanism they
  gain in a later phase.
- Geographic + school-specific tables are intentionally empty; they are populated
  per deploying school (D5/D6), never by the product seed.
- The 4 composite-PK junction tables are not yet created in PG (their parent
  tables are out of scope); `DEFAULT_CONFLICT_TARGETS` already anticipates them.

## 22. Next Steps
- **PG-4.3** (dedicated tables: `users`/auth, `teachers`, `students`, `parents`,
  `classes`, `sections`, `subjects` runtime, `attendance_records`, `grade_records`,
  `certificates`, `fee_payments`, `expense_records`, `library_*`,
  `app_notifications`, `audit_logs`, `school_settings`, `saved_reports`, and the 4
  junction tables with FKs).
- **D5**: Al-Salam customer migration bundle (excluded from generic product).
- **PG-7**: remove hardcoded Al-Salam/Yemen defaults in `ConfigService` /
  `sqlite-repository` / `dashboardRepository` / `ai-client`.
- Update narrative docs to reference the archived pilot path.

---
**Sign-off:** PG-4.2 is implemented, live-verified, idempotent, Al-Salam-free,
and regression-clean. Ready to proceed to PG-4.3.
