# Kayan School ERP — PG-4.4 NUMERIC / PostgreSQL Numeric-Semantics Audit

**Scope:** Audit ONLY. No PG-4.4 implementation broadening, no new schema/types,
no general financial refactor, no PG-5. Covers every PostgreSQL-facing
repository/service that currently uses `IDataSource` and reads/writes
`NUMERIC`/`DECIMAL` (or otherwise arithmetic-sensitive) columns.

**Driver behaviour (root cause of all PG numeric issues):**
- **SQLite** returns `NUMERIC`/`REAL`/`INTEGER` columns as JavaScript **numbers**.
- **PostgreSQL (`pg`)** returns `NUMERIC`/`DECIMAL` columns as JavaScript
  **strings**, and `BIGINT`/`COUNT(*)` as **strings**. Arithmetic (`+ - * /`)
  on such values therefore becomes string concatenation or silent coercion,
  and `typeof` flips from `number` to `string`. `===` comparisons against a
  number fail; `>`/`<`/`>=`/`<=` and `-` *coerce* and still work; `+`
  concatenates when either operand is a string.

---

## 1. Files audited

All `IDataSource`-consuming production repositories/services (plus the
non-`IDataSource` legacy base and request handlers that feed numeric data):

| File | NUMERIC columns touched | Arithmetic? |
|------|------------------------|-------------|
| `src/modules/financial/repository/financialRepository.ts` | `fee_payments.total_amount`, `paid_amount`, `remaining_amount`; `expense_records.amount` | Yes (KPI sums) |
| `src/modules/dashboard/repository/dashboardRepository.ts` | `certificates.gpa`, `certificates.percentage`; money via `FinancialRepository` | Yes (KPI sums, sort) |
| `src/modules/students/repository/studentRepository.ts` | none (`students` has no NUMERIC) | No |
| `src/modules/teachers/repository/teacherRepository.ts` | none | No |
| `src/modules/master-data/repository/masterDataRepository.ts` | none (reference data); `Math.ceil(total/pageSize)` on a count | No (coerces) |
| `src/modules/academic/infrastructure/repositories/SQLite{CourseAssignment,Curriculum,AcademicYear,AcademicCalendar}Repository.ts` | `subjects.max_score`, `pass_score` (stored/retrieved only) | No compute |
| `src/core/auth/AuthService.ts` | none | No |
| `server.ts` (line 41) | `grades[].score`, `maxScore` | Yes — but from `req.body` |
| `src/lib/ai-client.ts` (line 28) | `grades[].score`, `maxScore` | Yes — but from caller arg |
| `src/lib/sqlite-repository.ts` (legacy) | `grade_records.score/max_score/weight`, `certificates.gpa/percentage`, `fee_payments.*`, `expense_records.amount` | Maps without `Number()` — **SQLite-only path** |

Live schema `NUMERIC` columns inventoried:
`certificates(gpa, percentage)`, `currencies(exchange_rate)`,
`discount_types(discount_percent)`, `exam_types(weight_percent)`,
`expense_records(amount)`, `fee_categories(amount)`,
`fee_payments(paid_amount, total_amount, remaining_amount)`,
`grade_records(max_score, score, weight)`,
`subjects(max_score, pass_score)`, `subjects_master(max_score, pass_score)`.

---

## 2. Fields / expressions examined

- `fee_payments`: `savePayment` computes `remaining = total - paid` (from input
  object — safe); `getAllPayments` maps `total_amount/paid_amount/remaining_amount`.
- `expense_records`: `getAllExpenses` maps `amount`.
- `dashboardRepository.getKpis`:
  - `totalRevenue = payments.reduce((acc,p) => acc + p.paidAmount, 0)`
  - `totalExpenses = expenses.reduce((acc,e) => acc + e.amount, 0)`
  - `netBalance = totalRevenue - totalExpenses`
  - `overdueFeesTotal = reduce(acc + (p.remainingAmount || p.totalAmount - p.paidAmount), 0)`
  - `feesCollectedToday = reduce(acc + (p.paidAmount || 0), 0)`
- `dashboardRepository.getTopStudents`: `.sort((a,b) => b.percentage - a.percentage)`
  on raw `SELECT * FROM certificates` rows.
- `server.ts:41` / `ai-client.ts:28`:
  `grades.reduce((acc,g) => acc + (g.score / g.maxScore) * 100, 0) / grades.length`.
- `masterDataRepository`: `Math.ceil(total / pageSize)` (count).

---

## 3. Confirmed bugs (A)

### A-1 — `FinancialRepository` returns `NUMERIC` money as strings on PostgreSQL
- **File / expression:** `src/modules/financial/repository/financialRepository.ts`
  `getAllPayments` (lines 35–38) and `getAllExpenses` (line 58) previously
  returned `r.total_amount`, `r.paid_amount`, `r.remaining_amount`, `r.amount`
  **without coercion**.
- **SQLite behaviour:** `r.paid_amount` is a `number` → dashboard KPI sums are
  correct numbers.
- **PostgreSQL behaviour:** `pg` returns these `NUMERIC` columns as **strings**
  (e.g. `'600.00'`). `acc + p.paidAmount` then concatenates (`'0' + '400.00'`
  → `'0400.00'`), so `totalRevenue`/`totalExpenses` became strings and
  `netBalance` was computed via `string - string` coercion. `typeof kpis.totalRevenue`
  was `'string'` — the exact failure surfaced by the PG-4.4 reconciliation test.
- **Minimal safe fix (already applied, within PG-4.4 scope):** coerce at the
  repository mapping boundary, preserving `NUMERIC(18,2)` DB precision:
  ```ts
  totalAmount: Number(r.total_amount),
  amount:      Number(r.total_amount),   // getAllPayments
  paidAmount:  Number(r.paid_amount),
  remainingAmount: Number(r.remaining_amount),
  // getAllExpenses:
  amount: Number(r.amount),
  ```
  This is a no-op on SQLite (already numbers) and makes `pg` results numeric,
  restoring correct KPI arithmetic. No schema change, no type change.
- **Regression test:** `src/modules/financial/repository/financialRepository.numeric.test.ts`
  (fake `IDataSource` returning string `NUMERIC` values; asserts the mapped
  fields are JS `number` with correct values). Also covered live by
  `pg4.repositories.live.test.ts` (`remainingAmount === 600`).

No other **confirmed** PG-introduced numeric bug was found.

---

## 4. Potential issues (B) — follow-up, do NOT change production now

- **B-1 — Null-sensitive certificate sort in `dashboardRepository.getTopStudents`**
  (`.sort((a,b) => b.percentage - a.percentage)` on raw `certificates` rows).
  `percentage` is `NUMERIC` and nullable; on **both** SQLite and PostgreSQL a
  `NULL` value makes the comparator return `NaN`, yielding an unstable sort.
  This is a **pre-existing** NULL-handling issue, **not** a PG-4.4 regression
  (behaviour is identical on both engines). Recommendation: add a null-safe
  comparator (e.g. `Number(a.percentage) || 0`). Out of scope for PG-4.4.
- **B-2 — Grade/score averages are not yet PG-facing.** All grade math
  (`grade_records.score / max_score`, weighted GPA) currently runs either on
  `req.body` data (`server.ts:41`, `ai-client.ts:28` — client JSON numbers, safe)
  or through the legacy `sqlite-repository.ts` (SQLite returns numbers, safe).
  **When** the grade/certificate module is migrated to `IDataSource`/`PostgreSQLDataSource`,
  `score`/`max_score`/`weight`/`gpa`/`percentage` will arrive as strings and the
  existing average formulas (currently relying on implicit `Number()` coercion for
  `/` and `*`, which *do* coerce) will still compute — but any `+` accumulation or
  `===` comparison on those fields would break. Flag for the grade-migration phase;
  not a PG-4.4 defect.

---

## 5. False positives / safe (C)

- **C-1 — `server.ts:41` & `ai-client.ts:28` grade averages** read `grades` from
  the HTTP request body (parsed JSON numbers), not a DB `NUMERIC` column. Safe.
- **C-2 — Academic repositories** only persist `subjects.max_score`/`pass_score`;
  they perform no arithmetic on them. Safe.
- **C-3 — Legacy `sqlite-repository.ts`** maps `score`/`amount` etc. without
  `Number()`, but it is the SQLite-only base (sql.js returns numbers) and is not
  on the PostgreSQL `IDataSource` path. Safe for PG.
- **C-4 — `COUNT(*)` / integer columns return strings on PostgreSQL**, but every
  consumer either uses JavaScript `.length` (array counts) or performs
  arithmetic that coerces (`Math.ceil('5'/10)` → `1`, `'85'/'100'` → `0.85`).
  No defect found; noted for awareness.
- **C-5 — `currencies.exchange_rate`, `discount_types.discount_percent`,
  `exam_types.weight_percent`, `fee_categories.amount`** are referenced only in
  master-data validators/UI metadata (input numbers) and `INSERT` statements;
  no aggregation/arithmetic in PG-facing code. Safe.

---

## 6. Tests

- New (this audit): `src/modules/financial/repository/financialRepository.numeric.test.ts`
  — 2/2 pass (fake `IDataSource`, no live DB).
- Existing live reconciliation (must be run **serially** — shared mutable DB):
  `src/core/datasource/pg4.repositories.live.test.ts` (5/5; asserts
  `remainingAmount === 600`, proving the coercion end-to-end) and
  `src/core/datasource/pg4.sweep.live.test.ts` (3/3; asserts ledger
  `paid + remaining = total` and non-negative amounts on the live DB).

---

## 7. Final recommendation

1. **PG-4.4 numeric correctness is satisfied.** The single confirmed
   PG-introduced defect (A-1) was fixed minimally and safely at the repository
   mapping boundary, with `NUMERIC(18,2)` precision preserved and no schema or
   type changes.
2. **Do not apply a blanket global `Number()` conversion** — that would be
   inappropriate and was explicitly out of scope. Coercion is applied only where
   a repository reads `NUMERIC` money columns and downstream code does
   arithmetic (the single place that needed it).
3. **Defer B-1 and B-2 to their respective follow-up phases** (null-safe
   certificate sort hardening; grade-module PG migration). Neither is a PG-4.4
   regression.
4. Run live tests serially against `kayan_school_erp` (parallel file execution
   shares one mutable database and races); this is unrelated to numeric
   correctness and matches the existing live-test design.
5. No production files beyond `financialRepository.ts` (fixed in PG-4.4) were
   modified for this audit.
