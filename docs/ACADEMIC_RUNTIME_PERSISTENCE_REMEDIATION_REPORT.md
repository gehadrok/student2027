# Academic Runtime Persistence Remediation Report

**Status:** BLOCKER RESOLVED — Step 1 (schema alignment) complete and verified
**Scope:** Runtime SQLite persistence blocker — Academic repositories
**Authoritative report:** `docs/ACADEMIC_RUNTIME_PERSISTENCE_FIX_REPORT.md`

---

## 1. Executive Summary

The Academic audit reported `STATUS: BLOCKED` because the Academic SQLite
repositories referenced tables and columns that were **not present** in the
runtime-loaded canonical schema (`src/lib/sqlite-schema.sql` +
`src/lib/sqlite-seed.sql`, loaded by `src/lib/sqlite-engine.ts`). The missing
tables (`academic_years`, `academic_terms`, `subjects_master`) and columns
(`subjects.subject_id`, `schedule_periods.academic_week`, relaxed
`subjects.name/code` and `schedule_periods.day`) existed only in
`migrations/001_master_data.sql`, which is never loaded at runtime.

## 2. Remedy

The canonical runtime schema `src/lib/sqlite-schema.sql` was aligned with the
existing Academic repository/mapper expectations using **additive** changes:
three new tables, two extended columns sets, one index set, and two relaxed
column constraints. A migration-002 ledger
(`migrations/002_academic_runtime_schema.sql`) documents the DDL for audit
purposes only — it is **not** loaded at runtime. No repository/domain/service/
controller/route/frontend code was modified, no second schema introduced, and
`migrations/001_master_data.sql` remains unused at runtime.

## 3. Verification

- Real sql.js persistence (same startup path as the app): **47/47 PASS**
- Academic integration tests: **68/68 PASS**
- Academic HTTP E2E: **66/66 PASS**
- TypeScript (`tsc --noEmit`): no new errors (only pre-existing baseline)
- Production build (`vite build` + server bundle): **PASS**

## 4. Final Status

**ACADEMIC RUNTIME PERSISTENCE: PASS**

Full details, exact schema deltas, per-suite results, and remaining blockers
are in `docs/ACADEMIC_RUNTIME_PERSISTENCE_FIX_REPORT.md`.

*Stopped after closing the blocker. Phase 6.3 / Phase 7 not started.*