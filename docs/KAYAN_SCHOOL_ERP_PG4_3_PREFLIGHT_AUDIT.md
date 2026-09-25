# Kayan School ERP — PG-4.3 Preflight / Audit

**Status:** READ-ONLY PREFLIGHT (no implementation).
**Authoritative sources:** `docs/KAYAN_SCHOOL_ERP_PG4_1_DESIGN_RESOLUTION.md` (§6.1 migration sequence, §4.2 RBAC deferred), `docs/KAYAN_SCHOOL_ERP_R4_3_TARGET_ARCHITECTURE.md` (§23 staged plan), `src/lib/sqlite-schema.sql` (58-table canonical runtime schema), current canonical `migrations/postgres/` tree.

---

## 1. Exact Objective

Port the **remaining 25 canonical runtime tables** to PostgreSQL so that the PostgreSQL schema mirrors the canonical SQLite runtime schema. Use the proven D7/D8/D9 type policy from PG-4.2 (no triggers, app-managed timestamps, FKs → referenced `TEXT` PKs). All new tables are created **empty** (no customer/Al-Salam data); only `school_settings` gets a generic 1-row placeholder. RBAC base tables are created **empty** — seed values deferred to PG-6. Verified live against `kayan_school_erp`, idempotent, regression-safe.

This is **schema-only**. No repository wiring, no auth behavior change, no UI change, no customer-data migration.

---

## 2. Files / Tables Affected

**New migration files (canonical `migrations/postgres/`):**

| File | Layer | Tables created (new) |
|------|-------|----------------------|
| `004_students_teachers.sql` | 4 — People & Relationships | `teachers`, `parents`, `students`, `school_classes`, `sections`, `teacher_subjects`, `teacher_classes`, `parent_students`, `user_linked_students` (9) |
| `005_finance.sql` | 5 — Finance | `fee_payments`, `expense_records` (new) + `fee_categories`, `payment_methods`, `discount_types` re-stated `IF NOT EXISTS` (already in `002`, no-op) (5 entries / 2 net new) |
| `006_operational.sql` | 6 — Operational | `attendance_records`, `grade_records`, `certificates`, `library_books`, `book_borrowings`, `app_notifications`, `saved_reports` (7) |
| `008_security_organization.sql` | 1 — Security/Org remainder | `users`, `school_settings`, `audit_logs`, `roles`, `permissions`, `user_roles`, `role_permissions` (7) |

**Net new tables:** 25 (`9 + 2 + 7 + 7`). `fee_categories`/`payment_methods`/`discount_types` already exist in `002` (restated for self-documentation, idempotent).

**Already in PostgreSQL (baseline, untouched):** `000` schema_migrations, `001` schools, `002` 33 master tables + `master_data_audit_log` + `master_data_permissions`, `003` 7 pilot tables (`education_stages`, `grade_levels`, `academic_years`, `academic_terms`, `subjects_master`, `academic_calendar_days`, `subjects`) + `schedule_periods`, `007` generic seed.

**Existing file edited:** `migrations/postgres/migrations.test.ts` — extend live verification (no existing test removed).

**No source (`.ts`) runtime changes** required for PG-4.3.

---

## 3. Dependencies

- **Cross-file ordering:** `004` before `005/006/008` (students, users, school_classes, subjects must exist first). Enforced by numeric version sequence consumed by `scripts/apply-postgres-migrations.mjs` (already idempotent from PG-4.2).
- **Intra-file ordering:** within `004`, create `users` → `school_classes` → `teachers`/`parents` → `sections` → `students` → junction tables. Within `008`, create `users`/`roles`/`permissions` → `user_roles`/`role_permissions`/`audit_logs`.
- **External runtime deps:** `pg ^8.23.0`, `PostgreSQLDataSource` (coerces `count()`/`exists()` to `Number`, parses DATE/TIMESTAMP as string), `getPostgresConfig()` (env-only, never logs secret).
- **Depends on PG-4.2:** already live-verified (8/8 live, 137/0 suite). No rework needed.

---

## 4. READY_TO_IMPLEMENT

All 25 tables are mechanically derivable from `src/lib/sqlite-schema.sql` using the D7/D8/D9 policy already proven in PG-4.2:

- **Type mapping (reused):** `id`→`TEXT PK`; `is_*`/`status`/`notified`→`SMALLINT`; money/`REAL`→`NUMERIC(18,2)` (exchange_rate `NUMERIC(18,6)`); dates→`DATE`; `created_at`/`updated_at`→`TIMESTAMP DEFAULT CURRENT_TIMESTAMP` (NO triggers); FKs→referenced `TEXT` PK (`ON DELETE SET NULL`/`CASCADE`); preserve `CHECK`; drop `PRAGMA`/`TRIGGER`/`AUTOINCREMENT`/`DATETIME`.
- **FKs resolvable** within/across files (listed in design §6.1 and verified by dependency graph above).
- **Empty seed:** no data inserted except generic `school_settings` 1-row (`id=1, school_name='Kayan School ERP'`, no Al-Salam values) via `ON CONFLICT (id) DO NOTHING`.
- **`school_settings` single-row contract:** `id INTEGER PRIMARY KEY CHECK(id=1)` — matches canonical intent.
- **RBAC base tables created EMPTY** (`roles`, `permissions`, `user_roles`, `role_permissions`) — schema only, no invented seed values (consistent with PG-4.1 §4.4 deferral to PG-6).

---

## 5. DESIGN_REQUIRED

- **RBAC seed values (14 roles / permissions):** NOT created here — deferred to PG-6 (no invented values; non-blocking for schema).
- **`school_settings` ↔ `schools` sync:** application-level logic, belongs to PG-7 (and D6 hardcoded-default removal in source). PG-4.3 only creates the table + generic placeholder; both coexist per D3 §3.2.
- **Exact generic `school_settings` default literals:** trivially derived from D3 §3.2 (`name_en='Kayan School ERP'`, empty contact fields, `enable_sms_alerts=1`, `enable_ai_analysis=1`, `attendance_lock_hour='09:00'`); non-blocking.

No design question blocks implementation.

---

## 6. FUTURE (explicitly out of PG-4.3 scope)

- **D5 customer-data migration** (Al-Salam → dedicated PG DB) — copy/validate/verify with rollback; not required by PG-4.3.
- **PG-6:** RBAC seed values + auth/RBAC implementation.
- **PG-7:** `school_settings`↔`schools` sync; remove hardcoded Al-Salam defaults in source (D6).
- **PG-9:** repository cutover wiring (repos use PG tables); resolve Design B §2.4 secondary-unique `INSERT OR REPLACE` path for `sections`/`schedule_periods`/etc. (legacy SQLite path untouched until then).
- **D7 backup/restore** harness.

---

## 7. Migration / Data-Safety Risks

| Risk | Mitigation |
|------|-----------|
| Data loss | **None.** Only additive `CREATE TABLE IF NOT EXISTS`; zero customer data inserted. SQLite untouched. |
| FK create-order failure | Intra-file + cross-file ordering per §3; apply via existing idempotent runner. |
| Re-apply doubles data | `school_settings` uses `ON CONFLICT (id) DO NOTHING`; all other tables empty (no seed). |
| Rollback collateral | Rollback drops **only** the 25 new tables (`CASCADE`); existing `000`–`007` tables and SQLite unaffected. |
| Accidental Al-Salam load | Verification matrix asserts **0 customer rows** in every new table; CI gate rejects any non-empty count. |
| Legacy `INSERT OR REPLACE` unique path | Not exercised in PG-4.3 (repos still on SQLite until PG-9). Documented as PG-9 FUTURE. |

---

## 8. Exact Verification Matrix (success criteria)

All must pass before `PG-4.3: PASS`:

1. **Existence** — all 25 tables present in `kayan_school_erp` (`information_schema.tables`).
2. **Idempotency** — re-run `apply-postgres-migrations.mjs`; all 004/005/006/008 report `skipped`.
3. **FK integrity** — every FK references an existing table (structural assertion in `migrations.test.ts`).
4. **Zero customer data** — counts of `users, teachers, parents, students, school_classes, sections, attendance_records, grade_records, certificates, fee_payments, expense_records, library_books, book_borrowings, app_notifications, audit_logs, saved_reports, teacher_subjects, teacher_classes, parent_students, user_linked_students, roles, permissions, user_roles, role_permissions` = **0**; `school_settings` = **1** (generic); no Al-Salam names anywhere.
5. **Schema-level CRUD** — via `ds.execute`: insert a synthetic parent row (valid FK to `users`) → `sections` under a `school_classes` → `students` → `attendance_records`; `SELECT` round-trip; `DELETE` cleanup. Proves DDL + FKs work live on PG.
6. **Regression** — full suite **137/0** (preserve), `vite build` exit 0, `tsc --noEmit` baseline 11 / 0 new.
7. **Scope guard** — no `.ts` runtime file changed; no SQLite file touched; `archive/001_kayan_pilot_schema.sql` untouched.

---

## 9. Rollback Strategy

Each new file carries a commented `ROLLBACK` block; manual/automated rollback drops only the 25 new tables in reverse FK order:

```sql
-- 008
DROP TABLE IF EXISTS user_roles, role_permissions, audit_logs, school_settings, roles, permissions, users CASCADE;
-- 006
DROP TABLE IF EXISTS book_borrowings, attendance_records, grade_records, certificates, app_notifications, saved_reports, library_books CASCADE;
-- 005
DROP TABLE IF EXISTS fee_payments, expense_records, fee_categories, payment_methods, discount_types CASCADE;
-- 004
DROP TABLE IF EXISTS teacher_subjects, teacher_classes, parent_students, user_linked_students, sections, students, parents, teachers, school_classes CASCADE;
```

Because no data is loaded, rollback is pure DDL with **zero data risk**. SQLite fallback (`DATA_SOURCE_TYPE=sqlite`) remains immediately available.

---

## Verdict

**PG-4.3: READY_TO_IMPLEMENT.**

Exact scope defined (25 tables across `004/005/006/008`), all derivable from canonical `sqlite-schema.sql` via proven PG-4.2 type policy, additive/idempotent, empty-seed (no customer data), full verification matrix and rollback specified. No blocking design questions. Implementation may proceed once this preflight is acknowledged.
