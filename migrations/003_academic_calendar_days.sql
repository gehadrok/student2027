-- ============================================================================
-- Migration 003: Academic Calendar Days Table (INSERT persistence fix)
-- Al-Salam School Management System
--
-- PURPOSE
-- =======
-- The AcademicCalendar repository previously mapped calendar school days onto
-- `schedule_periods`. That table requires timetable FK parents (class/section/
-- subject/teacher), so saving a BRAND-NEW calendar day silently no-op'd:
--   * save() checked existence by day → row missing → the INSERT branch ran
--     against schedule_periods but registered NO FKs → FK constraint abort →
--     UnitOfWork swallowed the failure (write path lack of FK parents) →
--     findById returned null → the Academy Calendar UI could never persist a
--     new day.
--
-- FIX: The calendar now persists onto a dedicated, dependency-free table
-- `academic_calendar_days` (id, day = ISO calendar date, academic_week,
-- is_instructional). A new-record save is a real INSERT; saves with an
-- existing id are UPDATEs. Both run inside the repository UnitOfWork, and
-- write failures now surface as thrown errors (no fabricated DTO).
--
-- The change is ADDITIVE and preserves legacy data compatibility (the old
-- schedule_periods-based rows are untouched).
--
-- NOTE: This file is the LEDGER of the additive schema change that was made
-- directly to `src/lib/sqlite-schema.sql` (the canonical runtime source of
-- truth). It documents the exact DDL so the change is reproducible and
-- auditable. Do NOT load this file as a secondary runtime schema (that would
-- create a parallel schema).
-- ============================================================================

-- ── 1. ACADEMIC CALENDAR DAYS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_calendar_days (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL UNIQUE,
    academic_week INTEGER NOT NULL DEFAULT 1,
    is_instructional INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_academic_calendar_days_day ON academic_calendar_days(day);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_days_week ON academic_calendar_days(academic_week);