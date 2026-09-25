-- ============================================================================
-- Migration 003: Academic runtime schema (PG-4.2)
-- Kayan School ERP — PostgreSQL
-- ----------------------------------------------------------------------------
-- Keep / validate the 7 pilot tables (education_stages, grade_levels,
-- academic_years, academic_terms, subjects_master, academic_calendar_days,
-- subjects) and ADD `schedule_periods` WITHOUT the cross-layer FKs that the
-- canonical SQLite schema declares against subjects / sections / school_classes
-- / teachers. Those parent tables are not part of the PG-4.2 scope, so the FKs
-- are intentionally deferred to a later layer (004) to preserve a clean,
-- dependency-free calendar persistence path.
--
-- All CREATE TABLE statements are IF NOT EXISTS — over the existing kayan_school_erp
-- (which already has the pilot tables from PG-2) this migration is effectively a
-- no-op for those, and adds only schedule_periods.
-- ============================================================================

-- 1. EDUCATION STAGES
CREATE TABLE IF NOT EXISTS education_stages (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 2. GRADE LEVELS
CREATE TABLE IF NOT EXISTS grade_levels (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    education_stage_id TEXT,
    level_number INTEGER NOT NULL DEFAULT 1,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (education_stage_id) REFERENCES education_stages(id) ON DELETE SET NULL
);

-- 3. ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current SMALLINT NOT NULL DEFAULT 0,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 4. ACADEMIC TERMS
CREATE TABLE IF NOT EXISTS academic_terms (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    academic_year_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current SMALLINT NOT NULL DEFAULT 0,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 5. SUBJECTS MASTER
CREATE TABLE IF NOT EXISTS subjects_master (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    grade_level_id TEXT,
    weekly_hours INTEGER DEFAULT 3,
    max_score NUMERIC(18,2) NOT NULL DEFAULT 100.0 CHECK (max_score > 0),
    pass_score NUMERIC(18,2) NOT NULL DEFAULT 50.0 CHECK (pass_score >= 0 AND pass_score <= max_score),
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE SET NULL
);

-- 6. ACADEMIC CALENDAR DAYS
CREATE TABLE IF NOT EXISTS academic_calendar_days (
    id TEXT PRIMARY KEY,
    day DATE NOT NULL UNIQUE,
    academic_week INTEGER NOT NULL DEFAULT 1,
    is_instructional SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. SUBJECTS (CourseAssignment persistence)
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT,
    code TEXT,
    class_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    weekly_hours INTEGER NOT NULL DEFAULT 3 CHECK (weekly_hours > 0),
    max_score NUMERIC(18,2) NOT NULL DEFAULT 100.0 CHECK (max_score > 0),
    pass_score NUMERIC(18,2) NOT NULL DEFAULT 50.0 CHECK (pass_score >= 0 AND pass_score <= max_score),
    color TEXT,
    subject_id TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. SCHEDULE PERIODS (NEW in PG-4.2 — no cross-layer FKs, deferred to 004)
CREATE TABLE IF NOT EXISTS schedule_periods (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    day TEXT NOT NULL,
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 7),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    academic_week INTEGER DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (section_id, day, period_number),
    UNIQUE (teacher_id, day, period_number)
);

-- ============================================================================
-- Academic indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_academic_years_code ON academic_years(code);
CREATE INDEX IF NOT EXISTS idx_academic_years_is_active ON academic_years(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_year ON academic_terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_code ON academic_terms(code);
CREATE INDEX IF NOT EXISTS idx_subjects_master_code ON subjects_master(code);
CREATE INDEX IF NOT EXISTS idx_subjects_master_is_active ON subjects_master(is_active);
CREATE INDEX IF NOT EXISTS idx_subjects_master_grade ON subjects_master(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_days_day ON academic_calendar_days(day);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_days_week ON academic_calendar_days(academic_week);
CREATE INDEX IF NOT EXISTS idx_grade_levels_stage ON grade_levels(education_stage_id);
CREATE INDEX IF NOT EXISTS idx_grade_levels_is_active ON grade_levels(is_active);
CREATE INDEX IF NOT EXISTS idx_education_stages_is_active ON education_stages(is_active);
CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_subject_id ON subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_schedule_class_section ON schedule_periods(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_schedule_teacher_day ON schedule_periods(teacher_id, day);
