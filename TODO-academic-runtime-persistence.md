# TODO — Academic Runtime Persistence Remediation (Step 1 Only)

**Status:** COMPLETE

## Root Cause
Runtime SQLite bootstrap (`src/lib/sqlite-engine.ts`) loads only
`src/lib/sqlite-schema.sql` + `src/lib/sqlite-seed.sql`. The Academic tables
(`academic_years`, `academic_terms`, `subjects_master`) exist only in
`migrations/001_master_data.sql`, which is NOT loaded at runtime. The Academic
repositories also reference columns missing from the canonical runtime schema
(`subjects.subject_id`, `schedule_periods.academic_week`, `updated_at`, etc.).

## Steps
- [x] 1. Inspect runtime SQLite bootstrap path (sqlite-engine.ts, sqlite-schema.sql, sqlite-seed.sql)
- [x] 2. Inspect Academic repositories + mappers expectations
- [x] 3. Confirm canonical runtime schema = src/lib/sqlite-schema.sql
- [x] 4. Align src/lib/sqlite-schema.sql with repository expectations (additive)
        - academic_years, academic_terms, subjects_master
        - subjects.subject_id, subjects.updated_at, relax name/code NOT NULL
        - schedule_periods.academic_week, schedule_periods.updated_at, relax day CHECK
- [x] 5. Create migrations/002_academic_runtime_schema.sql (ledger of additive changes)
- [x] 6. Create scripts/verify-academic-runtime-persistence.ts (REAL sql.js DB, same startup path)
- [x] 7. Run real-SQLite verification (create/save/findById/reconstruct/terms/curriculum/CA/calendar/update/delete/rollback) — 47/47 PASS
- [x] 8. Run existing integration regression (run-academic-integration.mjs) — 68/68 PASS
- [x] 9. Run TypeScript verification (tsc --noEmit) and production build — no new errors; build PASS
- [x] 10. Create docs/ACADEMIC_RUNTIME_PERSISTENCE_FIX_REPORT.md (rename of the remediation report deliverable)

## Constraints
- No repository/domain/aggregate behavior changes.
- No parallel Academic schema; single canonical schema (sqlite-schema.sql).
- No reliance on migrations/001 as runtime workaround.
- Stop after this blocker; do NOT start Phase 6.3 / Phase 7.
