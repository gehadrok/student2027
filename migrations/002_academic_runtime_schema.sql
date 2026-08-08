-- ============================================================================
-- Migration 002: Academic Runtime Schema Alignment
-- Al-Salam School Management System
--
-- PURPOSE
-- =======
-- The runtime SQLite bootstrap (`src/lib/sqlite-engine.ts`) loads the canonical
-- schema from `src/lib/sqlite-schema.sql` (imported via Vite `?raw`). Migration
-- 001 (`migrations/001_master_data.sql`) is NOT loaded at runtime. The Academic
-- repositories therefore referenced tables/columns that were absent from the
-- actual runtime schema.
--
-- This migration is the LEDGER of the additive schema alignment that was made
-- directly to `src/lib/sqlite-schema.sql` (the canonical runtime source of
-- truth). It documents the exact DDL so the change is reproducible and auditable.
--
-- The changes are ADDITIVE and preserve legacy data compatibility:
--   * New tables: academic_years, academic_terms, subjects_master
--   * subjects: added subject_id, updated_at; relaxed name/code NOT NULL and
--     removed the code UNIQUE constraint (CourseAssignment inserts rows with
--     only id/subject_id/teacher_id/class_id/weekly_hours).
--   * schedule_periods: added academic_week, updated_at; relaxed the day CHECK
--     so it can hold ISO calendar dates used by the Academic calendar repository.
--
-- NOTE: This file is documentation of the canonical schema change. The actual
-- runtime schema lives in `src/lib/sqlite-schema.sql`. Do NOT load this file as
-- a secondary runtime schema (that would create a parallel schema).
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ── 1. ACADEMIC YEARS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_current INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- ── 2. ACADEMIC TERMS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_terms (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    academic_year_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_current INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- ── 3. SUBJECTS MASTER (Curriculum persistence) ────────────────────────────
CREATE TABLE IF NOT EXISTS subjects_master (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    grade_level_id TEXT,
    weekly_hours INTEGER DEFAULT 3,
    max_score REAL DEFAULT 100,
    pass_score REAL DEFAULT 50,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- ── 4. SUBJECTS EXTENSION (CourseAssignment persistence) ───────────────────
-- NOTE: SQLite cannot ALTER a column constraint in place. The canonical schema
-- (`src/lib/sqlite-schema.sql`) already reflects the relaxed definition. For an
-- EXISTING legacy database the additive columns can be added via ALTER TABLE:
--   ALTER TABLE subjects ADD COLUMN subject_id TEXT;
--   ALTER TABLE subjects ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
-- The name/code NOT NULL relaxation and code UNIQUE removal require a table
-- rebuild (out of scope for a purely additive migration; fresh databases get the
-- correct shape directly from the canonical schema).
-- ============================================================================
-- 5. SCHEDULE_PERIODS EXTENSION (AcademicCalendar persistence)
-- For an EXISTING legacy database the additive columns can be added via:
--   ALTER TABLE schedule_periods ADD COLUMN academic_week INTEGER DEFAULT 1;
--   ALTER TABLE schedule_periods ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
-- The day CHECK relaxation requires a table rebuild (fresh databases get the
-- correct shape directly from the canonical schema).
-- ============================================================================

-- Migration ledger entry (idempotent bookkeeping)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES ('002', 'Academic runtime schema alignment (canonical src/lib/sqlite-schema.sql)');
