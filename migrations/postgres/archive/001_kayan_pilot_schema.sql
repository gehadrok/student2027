-- ============================================================================
-- Kayan School ERP — PostgreSQL pilot schema (PG-2B)
-- ----------------------------------------------------------------------------
-- Target types (approved D7 / D8 / D9 + Point 3 of the PG-2 directive):
--   * id                 TEXT PRIMARY KEY  (preserves existing md_<ts>_<rand>
--                         identifiers and Al-Salam copy fidelity; UUID-based
--                         generation for NEW-school provisioning is deferred —
--                         NOT DETERMINED in this phase, see report).
--   * is_* flags        SMALLINT          (D7 — preserves SQLite 0/1 semantics;
--                         no boolean coercion needed).
--   * created_at/updated_at TIMESTAMP      (D8 — preserves stored UTC values
--                         without timezone conversion).
--   * money (max_score/pass_score) NUMERIC(18,2) (D9 — exact financial precision).
--   * calendar columns (start_date/end_date/day) DATE
--   * counters (display_order/weekly_hours/...) INTEGER
--
-- NOT DETERMINED FROM CURRENT REPOSITORY EVIDENCE:
--   * The `subjects` table references `school_classes` and `teachers` in the
--     canonical SQLite schema. Those tables are OUTSIDE the approved pilot
--     scope (point 6), so their FKs are intentionally omitted here and will be
--     added when those tables are migrated (PG-2E/F / full schema phase).
--   * UUID PKs are deferred (see id note above).
-- ============================================================================

-- 25.1 EDUCATION STAGES (master data)
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

-- 25.2 GRADE LEVELS (master data)
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

-- 22a. ACADEMIC YEARS
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

-- 22b. ACADEMIC TERMS
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

-- 23. SUBJECTS MASTER
CREATE TABLE IF NOT EXISTS subjects_master (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    grade_level_id TEXT,
    weekly_hours INTEGER NOT NULL DEFAULT 3,
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

-- 24. ACADEMIC CALENDAR DAYS
CREATE TABLE IF NOT EXISTS academic_calendar_days (
    id TEXT PRIMARY KEY,
    day DATE NOT NULL UNIQUE,
    academic_week INTEGER NOT NULL DEFAULT 1,
    is_instructional SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8 (pilot subset). SUBJECTS — used by CourseAssignmentRepository (PG-2C).
-- FKs to school_classes / teachers are intentionally omitted (out of pilot
-- scope); they will be added in the full schema phase.
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

-- ============================================================================
-- Indexes
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
