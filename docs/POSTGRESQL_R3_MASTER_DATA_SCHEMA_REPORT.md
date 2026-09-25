# PostgreSQL R3 — Restore the Missing Master Data Runtime Schema

**Task:** R3 (Restore the Missing Master Data Runtime Schema)
**Date:** 2026-08-23
**Scope:** Add the proven-missing Master Data tables to the canonical runtime
schema (`src/lib/sqlite-schema.sql`) so the runtime database no longer depends on
`migrations/001_master_data.sql`. Academic Calendar work was **not** touched.
PostgreSQL was **not** started. The 28 browser-local DB screens were **not** modified.

---

## 1. Preflight (read-only) — current state calculation

The previously reported '~30' missing-table count was **not** assumed. It was
recalculated directly from the repository (`TABLE_MAP`) and the schema
(`src/lib/sqlite-schema.sql`) at HEAD (committed) and in the working tree.

| Metric | Value | Source |
|---|---|---|
| `TABLE_MAP` entries (masterDataRepository.ts) | **33** | lines 19–53 |
| Runtime schema tables total (working tree) | **58** | `CREATE TABLE` count in sqlite-schema.sql |
| Runtime tables relevant to `TABLE_MAP` (working tree) | **33 / 33 present** | grep vs TABLE_MAP |
| `TABLE_MAP` tables present at HEAD (committed) | **3** | `academic_years`, `academic_terms`, `subjects_master` |
| **Missing count BEFORE R3** | **30** | 33 − 3 (HEAD) |
| **Missing count AFTER (current working tree)** | **0** | verified below |

> The working tree already contained the R3 additions (uncommitted). The
> preflight confirms the prior '~30' estimate was correct **at HEAD**, and that
> the current missing count is now **0**.

### TABLE_MAP reconciliation (every entry vs canonical runtime schema)

All 33 `TABLE_MAP` keys resolve to a `CREATE TABLE` in `sqlite-schema.sql`:

`academic_years`, `academic_terms`, `education_stages`, `grade_levels`,
`sections_master`, `subjects_master`, `exam_types`, `certificate_types`,
`attendance_types`, `leave_types`, `academic_statuses`, `nationalities`,
`countries`, `governorates`, `districts`, `cities`, `identity_types`,
`employee_types`, `qualifications`, `specializations`, `job_titles`,
`departments`, `buildings`, `rooms`, `laboratories`, `libraries`,
`fee_categories`, `payment_methods`, `discount_types`, `currencies`,
`system_numbering`, `school_branches`, `document_types`.

Every Foreign-Key column consumed by `getChildRelations`
(masterDataRepository.ts:381–399) is present:
`grade_levels.education_stage_id`, `sections_master.grade_level_id`,
`academic_terms.academic_year_id`, `governorates.country_id`,
`districts.governorate_id`, `cities.governorate_id`,
`countries.nationality_id`, `job_titles.employee_type_id`,
`departments.parent_department_id`, `rooms/laboratories/libraries.building_id`,
`laboratories/libraries.room_id`, `fee_categories.parent_category_id`.

---

## 2. Implementation (R3) — tables restored

`src/lib/sqlite-schema.sql` was (already, in the working tree) extended with the
**30** missing runtime tables plus their lookup indexes, following the canonical
master-data convention already used by `academic_years` / `academic_terms` /
`subjects_master` (columns: `id, code, name_ar, name_en, description, is_active,
display_order` + `created_at/updated_at/created_by/updated_by`).

**Tables added (30):**

```
education_stages, grade_levels, sections_master, exam_types,
certificate_types, attendance_types, leave_types, academic_statuses,
nationalities, countries, governorates, districts, cities, identity_types,
employee_types, qualifications, specializations, job_titles, departments,
buildings, rooms, laboratories, libraries, fee_categories, payment_methods,
discount_types, currencies, system_numbering, school_branches, document_types
```

In addition, `master_data_audit_log` (consumed by `logAudit`/`getAuditLogs`) is
present so the runtime audit path works.

### Intentional deviations from `migrations/001_master_data.sql` (NOT blind copies)

- **`fee_categories` gains `parent_category_id`** (self-FK). This column is
  **not** in the migration but is required by
  `masterDataRepository.getChildRelations` (queries `fee_categories` for child
  rows before delete). Added to keep the runtime delete-guard functional.
- **`subjects_master` was NOT re-declared** — it already existed in the runtime
  schema (entry #23) and is already in `TABLE_MAP`.
- Column shapes mirror the canonical runtime convention; no SQLite triggers were
  added for `updated_at` (audit columns are application-managed by
  `MasterDataRepository.create/update`, matching the existing runtime convention).

---

## 3. Intentionally EXCLUDED tables (and evidence)

| Table | Excluded? | Evidence |
|---|---|---|
| `master_data_permissions` | **Yes (intentional)** | Defined/seed-only in `migrations/001_master_data.sql`. Referenced solely by `MasterDataRepository.getPermission()` (masterDataRepository.ts:359). **Grep of the entire `src/` tree finds zero call sites** for `getPermission` — it has no runtime consumer. The runtime DB is built only from `sqlite-schema.sql` + `sqlite-seed.sql` (see `sqlite-engine.ts:getSQLiteDB()`), with **no migrations at startup**, so no other path depends on this table. Out of scope for R3's TABLE_MAP persistence + audit goal. |
| `class_rooms`, `book_categories`, `payment_statuses` | **N/A** | These tables do not exist in `migrations/001_master_data.sql`, the runtime schema, or `TABLE_MAP`. They appear only as negative assertions in the verification harness. No action required. |

> `master_data_permissions` is recorded as a **remaining PostgreSQL blocker**
> (see §7): if `getPermission` ever gains a caller, this table must be added to
> the canonical runtime schema (or `getPermission` made resilient).

---

## 4. Missing count summary

| | Count |
|---|---|
| Missing BEFORE (HEAD) | **30** |
| Tables added | **30** |
| Missing AFTER (working tree) | **0** |

---

## 5. Real sql.js verification (actual startup schema + seed path)

**Method:** A fresh `sql.js` (SQLite WASM) `Database` is initialized with the
**exact** startup path the application uses — `src/lib/sqlite-schema.sql` then
`src/lib/sqlite-seed.sql` (per `sqlite-engine.ts:getSQLiteDB`) — and driven
through the **real** `MasterDataRepository` (no test double for the schema).

**Harness:** `scripts/verify-master-data-runtime.ts` executed via
`scripts/run-master-data-runtime.mjs` (`npx tsx scripts/run-master-data-runtime.mjs`).

**Result:** **317 passed, 0 failed** (REAL SQLite).

Checks performed and passing:
1. Schema + seed execute cleanly (no swallowed SQL errors).
2. All **33** `TABLE_MAP` entries resolve to real tables; `master_data_audit_log` exists.
3. `master_data_permissions` / `class_rooms` / `book_categories` / `payment_statuses` are absent (intentional).
4. Full CRUD round-trip (`getAllFlat`, `getById`, `getAll(search)`,
   `isFieldUnique`, `create`, `update`, `delete`) for **all 30 restored tables**.
5. FK delete-protection via `getChildRelations` blocks parent deletion while a
   child exists and allows it after children are removed.
6. `system_numbering.generateNextNumber()` produces padded, advancing numbers
   and returns `null` for unknown codes.
7. `master_data_audit_log` `logAudit()` / `getAuditLogs()` round-trips and filters.

> Note: an initial harness run reported 40 failures. Root cause was a bug in the
> **verification harness's** `count()` method (returned the number of result rows,
> always 1, instead of the `cnt` value), which broke `isFieldUnique` and
> `getChildRelations`. This was a test-double defect, **not** a schema defect —
> the production `DataSourceFactory.count` is correct. The harness `count()` was
> fixed; re-run is **317 passed, 0 failed**.

---

## 6. Regression tests

| Suite | Command | Result |
|---|---|---|
| R3 Master Data runtime (real sql.js) | `npx tsx scripts/run-master-data-runtime.mjs` | **317 passed, 0 failed** |
| Academic runtime persistence | `npx tsx scripts/run-academic-runtime-persistence.mjs` | **54 passed, 0 failed** |
| Academic API smoke | `npx tsx scripts/run-academic-api-smoke.mjs` | **29 passed, 0 failed** |
| Academic integration | `npx tsx scripts/run-academic-integration.mjs` | **71 passed, 0 failed** |
| Academic HTTP e2e (self-hosted server) | `npx tsx scripts/run-academic-http-e2e.mjs` | **67 passed, 0 failed** |

The Academic Calendar tables (`academic_calendar_days`) and all Academic domain
logic / repositories / services / API / UI were left untouched; all Academic
suites still pass, confirming R3 introduced no regression.

---

## 7. Build / lint results

`npm run lint` (`tsc --noEmit`) reports **11 errors**, **all pre-existing** and
in unrelated UI files:

- `src/App.tsx` (2 errors — `settings` prop missing on `LoginScreen`/`Navbar`)
- `src/components/ActiveReportPrintView.tsx` (1)
- `src/components/GlobalSearchBar.tsx` (8)

**None** are in `src/lib/sqlite-schema.sql`, the master-data module, or
`scripts/` (the `scripts/` directory is excluded from `tsc`). R3 introduced **0 new
lint errors**.

---

## 8. Remaining PostgreSQL blockers

1. **`master_data_permissions` not in canonical runtime schema.** It is only
   consumed by `MasterDataRepository.getPermission()`, which currently has **no
   callers**. If a caller is added, this table must be migrated into the runtime
   schema (or `getPermission` made resilient to a missing table). Not a runtime
   breakage today.
2. **PostgreSQL is not started.** R3 is a browser/sql.js runtime-schema task
   only. No PostgreSQL instance was provisioned; the runtime no longer relies on
   `migrations/001_master_data.sql` for the 30 entity tables + audit log.
3. **Seed data for master entities.** `sqlite-seed.sql` initializes the core
   schema; master-data default rows (beyond what the migration seeded) are
   entered via the Master Data UI/CRUD path. Out of scope for the R3 schema-restore
   objective.
4. **28 browser-local DB screens untouched** per instructions; they continue to
   rely on the now-complete runtime schema.

---

## 9. Conclusion

R3 is **complete and verified**. The canonical runtime schema now contains all 33
`TABLE_MAP` tables plus `master_data_audit_log`, restoring the 30 tables that
were missing at HEAD. A fresh real `sql.js` database built from the exact startup
schema+seed path passes **317/0** checks across every `TABLE_MAP` CRUD/read/
audit/FK-guard path, and all Academic regression suites remain green
(54 / 29 / 71 / 67 passed, 0 failed). No further R3 work is required; R4 and
PostgreSQL implementation were **not** started, as instructed.
