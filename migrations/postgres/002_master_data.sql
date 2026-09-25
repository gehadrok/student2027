-- ============================================================================
-- Migration 002: Master Data tables (البيانات الأساسية)
-- Kayan School ERP — PostgreSQL (PG-4.2)
-- ----------------------------------------------------------------------------
-- Target types (approved D7 / D8 / D9):
--   * id                 TEXT PRIMARY KEY
--   * is_* flags        SMALLINT            (preserves SQLite 0/1 semantics)
--   * created_at/updated_at TIMESTAMP
--   * money / score     NUMERIC(18,2)       (amount, max_score, pass_score,
--                        discount_percent, weight_percent)
--   * exchange_rate     NUMERIC(18,6)       (rate, not a money amount)
--   * counters          INTEGER             (display_order, capacity, ...)
--   * calendar columns  DATE                (start_date/end_date/day)
--   * FKs               TEXT column -> referenced TEXT PK (ON DELETE SET NULL /
--                        CASCADE per the canonical SQLite schema)
--
-- This file is idempotent: every CREATE TABLE is IF NOT EXISTS and the five
-- tables that also live in the PG-2 pilot schema (academic_years,
-- academic_terms, education_stages, grade_levels, subjects_master) are created
-- only if absent, so re-applying over an existing kayan_school_erp is safe.
--
-- NO seed data here. Generic reference seed lives in 007 (and excludes ALL
-- Al-Salam / Yemen-specific and geographic rows per PG-4.1 Design A + D6).
-- ============================================================================

-- 1. ACADEMIC YEARS (السنوات الدراسية)
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

-- 2. ACADEMIC TERMS (الفصول الدراسية)
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

-- 3. EDUCATION STAGES (المراحل التعليمية)
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

-- 4. GRADE LEVELS (الصفوف الدراسية)
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

-- 5. SECTIONS MASTER (الشعب الدراسية - master data version)
CREATE TABLE IF NOT EXISTS sections_master (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    grade_level_id TEXT,
    capacity INTEGER DEFAULT 30,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE SET NULL
);

-- 6. SUBJECTS MASTER (المواد الدراسية - master data version)
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

-- 7. EXAM TYPES (أنواع الاختبارات)
CREATE TABLE IF NOT EXISTS exam_types (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    weight_percent NUMERIC(18,2) DEFAULT 0,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 8. CERTIFICATE TYPES (أنواع الشهادات)
CREATE TABLE IF NOT EXISTS certificate_types (
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

-- 9. ATTENDANCE TYPES (أنواع الحضور والغياب)
CREATE TABLE IF NOT EXISTS attendance_types (
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

-- 10. LEAVE TYPES (أنواع الإجازات)
CREATE TABLE IF NOT EXISTS leave_types (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_paid SMALLINT DEFAULT 0,
    max_days INTEGER,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 11. ACADEMIC STATUSES (الحالات الأكاديمية)
CREATE TABLE IF NOT EXISTS academic_statuses (
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

-- 12. NATIONALITIES (الجنسيات)  [seed intentionally EMPTY — geographic, D6]
CREATE TABLE IF NOT EXISTS nationalities (
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

-- 13. COUNTRIES (الدول)  [seed intentionally EMPTY — geographic, D6]
CREATE TABLE IF NOT EXISTS countries (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    nationality_id TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (nationality_id) REFERENCES nationalities(id) ON DELETE SET NULL
);

-- 14. GOVERNORATES (المحافظات)  [seed intentionally EMPTY — geographic, D6]
CREATE TABLE IF NOT EXISTS governorates (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    country_id TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL
);

-- 15. DISTRICTS (المديريات)  [seed intentionally EMPTY — geographic, D6]
CREATE TABLE IF NOT EXISTS districts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    governorate_id TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (governorate_id) REFERENCES governorates(id) ON DELETE SET NULL
);

-- 16. CITIES (المدن)  [seed intentionally EMPTY — geographic, D6]
CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    governorate_id TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (governorate_id) REFERENCES governorates(id) ON DELETE SET NULL
);

-- 17. IDENTITY TYPES (أنواع الهوية)
CREATE TABLE IF NOT EXISTS identity_types (
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

-- 18. EMPLOYEE TYPES (أنواع الموظفين)
CREATE TABLE IF NOT EXISTS employee_types (
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

-- 19. QUALIFICATIONS (المؤهلات العلمية)
CREATE TABLE IF NOT EXISTS qualifications (
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

-- 20. SPECIALIZATIONS (التخصصات)
CREATE TABLE IF NOT EXISTS specializations (
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

-- 21. JOB TITLES (الوظائف)
CREATE TABLE IF NOT EXISTS job_titles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    employee_type_id TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (employee_type_id) REFERENCES employee_types(id) ON DELETE SET NULL
);

-- 22. DEPARTMENTS (الأقسام)
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    parent_department_id TEXT,
    head_employee_id TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 23. BUILDINGS (المباني)
CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    floors_count INTEGER DEFAULT 1,
    address TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 24. ROOMS (الغرف العامة)
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    building_id TEXT,
    floor_number INTEGER DEFAULT 1,
    capacity INTEGER DEFAULT 30,
    room_type TEXT CHECK(room_type IN ('classroom', 'lab', 'library', 'hall', 'office', 'storage', 'other')) DEFAULT 'classroom',
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL
);

-- 25. LABORATORIES (المختبرات)
CREATE TABLE IF NOT EXISTS laboratories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    building_id TEXT,
    room_id TEXT,
    lab_type TEXT CHECK(lab_type IN ('physics', 'chemistry', 'biology', 'computer', 'language', 'science', 'other')) DEFAULT 'science',
    capacity INTEGER DEFAULT 20,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- 26. LIBRARIES (المكتبات)
CREATE TABLE IF NOT EXISTS libraries (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    building_id TEXT,
    room_id TEXT,
    capacity INTEGER DEFAULT 30,
    books_count INTEGER DEFAULT 0,
    librarian_name TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- 27. FEE CATEGORIES (فئات الرسوم)
CREATE TABLE IF NOT EXISTS fee_categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    amount NUMERIC(18,2) DEFAULT 0,
    is_recurring SMALLINT DEFAULT 0,
    parent_category_id TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (parent_category_id) REFERENCES fee_categories(id) ON DELETE SET NULL
);

-- 28. PAYMENT METHODS (طرق الدفع)
CREATE TABLE IF NOT EXISTS payment_methods (
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

-- 29. DISCOUNT TYPES (أنواع الخصومات)
CREATE TABLE IF NOT EXISTS discount_types (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    discount_percent NUMERIC(18,2) DEFAULT 0,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 30. CURRENCIES (العملات)
CREATE TABLE IF NOT EXISTS currencies (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    symbol TEXT,
    exchange_rate NUMERIC(18,6) DEFAULT 1.0,
    is_base SMALLINT DEFAULT 0,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 31. SYSTEM NUMBERING (الترقيم الآلي)
CREATE TABLE IF NOT EXISTS system_numbering (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    prefix TEXT NOT NULL DEFAULT '',
    next_number INTEGER NOT NULL DEFAULT 1,
    step INTEGER NOT NULL DEFAULT 1,
    pad_length INTEGER DEFAULT 6,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 32. SCHOOL BRANCHES (فروع المدرسة)  [seed intentionally EMPTY — per-school]
CREATE TABLE IF NOT EXISTS school_branches (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    principal_name TEXT,
    is_active SMALLINT NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 33. DOCUMENT TYPES (أنواع الوثائق)
CREATE TABLE IF NOT EXISTS document_types (
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

-- ============================================================================
-- AUDIT LOG FOR MASTER DATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS master_data_audit_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT', 'PRINT')),
    old_values TEXT,
    new_values TEXT,
    performed_by TEXT NOT NULL,
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    details TEXT
);

-- ============================================================================
-- PERMISSION RESOURCES FOR MASTER DATA (default scaffolding — rows seeded in 007)
-- ============================================================================
CREATE TABLE IF NOT EXISTS master_data_permissions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL UNIQUE,
    can_view SMALLINT DEFAULT 1,
    can_create SMALLINT DEFAULT 0,
    can_edit SMALLINT DEFAULT 0,
    can_delete SMALLINT DEFAULT 0,
    can_import SMALLINT DEFAULT 0,
    can_export SMALLINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_academic_years_code ON academic_years(code);
CREATE INDEX IF NOT EXISTS idx_academic_years_name_ar ON academic_years(name_ar);
CREATE INDEX IF NOT EXISTS idx_academic_years_is_active ON academic_years(is_active);

CREATE INDEX IF NOT EXISTS idx_academic_terms_code ON academic_terms(code);
CREATE INDEX IF NOT EXISTS idx_academic_terms_name_ar ON academic_terms(name_ar);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON academic_terms(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_year ON academic_terms(academic_year_id);

CREATE INDEX IF NOT EXISTS idx_education_stages_code ON education_stages(code);
CREATE INDEX IF NOT EXISTS idx_education_stages_name_ar ON education_stages(name_ar);
CREATE INDEX IF NOT EXISTS idx_education_stages_is_active ON education_stages(is_active);

CREATE INDEX IF NOT EXISTS idx_grade_levels_code ON grade_levels(code);
CREATE INDEX IF NOT EXISTS idx_grade_levels_name_ar ON grade_levels(name_ar);
CREATE INDEX IF NOT EXISTS idx_grade_levels_is_active ON grade_levels(is_active);
CREATE INDEX IF NOT EXISTS idx_grade_levels_stage ON grade_levels(education_stage_id);

CREATE INDEX IF NOT EXISTS idx_sections_master_code ON sections_master(code);
CREATE INDEX IF NOT EXISTS idx_sections_master_name_ar ON sections_master(name_ar);
CREATE INDEX IF NOT EXISTS idx_sections_master_is_active ON sections_master(is_active);
CREATE INDEX IF NOT EXISTS idx_sections_master_grade_level ON sections_master(grade_level_id);

CREATE INDEX IF NOT EXISTS idx_subjects_master_code ON subjects_master(code);
CREATE INDEX IF NOT EXISTS idx_subjects_master_name_ar ON subjects_master(name_ar);
CREATE INDEX IF NOT EXISTS idx_subjects_master_is_active ON subjects_master(is_active);
CREATE INDEX IF NOT EXISTS idx_subjects_master_grade_level ON subjects_master(grade_level_id);

CREATE INDEX IF NOT EXISTS idx_exam_types_code ON exam_types(code);
CREATE INDEX IF NOT EXISTS idx_exam_types_name_ar ON exam_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_exam_types_is_active ON exam_types(is_active);

CREATE INDEX IF NOT EXISTS idx_certificate_types_code ON certificate_types(code);
CREATE INDEX IF NOT EXISTS idx_certificate_types_name_ar ON certificate_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_certificate_types_is_active ON certificate_types(is_active);

CREATE INDEX IF NOT EXISTS idx_attendance_types_code ON attendance_types(code);
CREATE INDEX IF NOT EXISTS idx_attendance_types_name_ar ON attendance_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_attendance_types_is_active ON attendance_types(is_active);

CREATE INDEX IF NOT EXISTS idx_leave_types_code ON leave_types(code);
CREATE INDEX IF NOT EXISTS idx_leave_types_name_ar ON leave_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_leave_types_is_active ON leave_types(is_active);

CREATE INDEX IF NOT EXISTS idx_academic_statuses_code ON academic_statuses(code);
CREATE INDEX IF NOT EXISTS idx_academic_statuses_name_ar ON academic_statuses(name_ar);
CREATE INDEX IF NOT EXISTS idx_academic_statuses_is_active ON academic_statuses(is_active);

CREATE INDEX IF NOT EXISTS idx_nationalities_code ON nationalities(code);
CREATE INDEX IF NOT EXISTS idx_nationalities_name_ar ON nationalities(name_ar);
CREATE INDEX IF NOT EXISTS idx_nationalities_is_active ON nationalities(is_active);

CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name_ar ON countries(name_ar);
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_nationality ON countries(nationality_id);

CREATE INDEX IF NOT EXISTS idx_governorates_code ON governorates(code);
CREATE INDEX IF NOT EXISTS idx_governorates_name_ar ON governorates(name_ar);
CREATE INDEX IF NOT EXISTS idx_governorates_is_active ON governorates(is_active);
CREATE INDEX IF NOT EXISTS idx_governorates_country ON governorates(country_id);

CREATE INDEX IF NOT EXISTS idx_districts_code ON districts(code);
CREATE INDEX IF NOT EXISTS idx_districts_name_ar ON districts(name_ar);
CREATE INDEX IF NOT EXISTS idx_districts_is_active ON districts(is_active);
CREATE INDEX IF NOT EXISTS idx_districts_governorate ON districts(governorate_id);

CREATE INDEX IF NOT EXISTS idx_cities_code ON cities(code);
CREATE INDEX IF NOT EXISTS idx_cities_name_ar ON cities(name_ar);
CREATE INDEX IF NOT EXISTS idx_cities_is_active ON cities(is_active);
CREATE INDEX IF NOT EXISTS idx_cities_governorate ON cities(governorate_id);

CREATE INDEX IF NOT EXISTS idx_identity_types_code ON identity_types(code);
CREATE INDEX IF NOT EXISTS idx_identity_types_name_ar ON identity_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_identity_types_is_active ON identity_types(is_active);

CREATE INDEX IF NOT EXISTS idx_employee_types_code ON employee_types(code);
CREATE INDEX IF NOT EXISTS idx_employee_types_name_ar ON employee_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_employee_types_is_active ON employee_types(is_active);

CREATE INDEX IF NOT EXISTS idx_qualifications_code ON qualifications(code);
CREATE INDEX IF NOT EXISTS idx_qualifications_name_ar ON qualifications(name_ar);
CREATE INDEX IF NOT EXISTS idx_qualifications_is_active ON qualifications(is_active);

CREATE INDEX IF NOT EXISTS idx_specializations_code ON specializations(code);
CREATE INDEX IF NOT EXISTS idx_specializations_name_ar ON specializations(name_ar);
CREATE INDEX IF NOT EXISTS idx_specializations_is_active ON specializations(is_active);

CREATE INDEX IF NOT EXISTS idx_job_titles_code ON job_titles(code);
CREATE INDEX IF NOT EXISTS idx_job_titles_name_ar ON job_titles(name_ar);
CREATE INDEX IF NOT EXISTS idx_job_titles_is_active ON job_titles(is_active);
CREATE INDEX IF NOT EXISTS idx_job_titles_employee_type ON job_titles(employee_type_id);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_name_ar ON departments(name_ar);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);

CREATE INDEX IF NOT EXISTS idx_buildings_code ON buildings(code);
CREATE INDEX IF NOT EXISTS idx_buildings_name_ar ON buildings(name_ar);
CREATE INDEX IF NOT EXISTS idx_buildings_is_active ON buildings(is_active);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_name_ar ON rooms(name_ar);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);

CREATE INDEX IF NOT EXISTS idx_laboratories_code ON laboratories(code);
CREATE INDEX IF NOT EXISTS idx_laboratories_name_ar ON laboratories(name_ar);
CREATE INDEX IF NOT EXISTS idx_laboratories_is_active ON laboratories(is_active);
CREATE INDEX IF NOT EXISTS idx_laboratories_building ON laboratories(building_id);
CREATE INDEX IF NOT EXISTS idx_laboratories_room ON laboratories(room_id);

CREATE INDEX IF NOT EXISTS idx_libraries_code ON libraries(code);
CREATE INDEX IF NOT EXISTS idx_libraries_name_ar ON libraries(name_ar);
CREATE INDEX IF NOT EXISTS idx_libraries_is_active ON libraries(is_active);
CREATE INDEX IF NOT EXISTS idx_libraries_building ON libraries(building_id);
CREATE INDEX IF NOT EXISTS idx_libraries_room ON libraries(room_id);

CREATE INDEX IF NOT EXISTS idx_fee_categories_code ON fee_categories(code);
CREATE INDEX IF NOT EXISTS idx_fee_categories_name_ar ON fee_categories(name_ar);
CREATE INDEX IF NOT EXISTS idx_fee_categories_is_active ON fee_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_fee_categories_parent ON fee_categories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_code ON payment_methods(code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_name_ar ON payment_methods(name_ar);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);

CREATE INDEX IF NOT EXISTS idx_discount_types_code ON discount_types(code);
CREATE INDEX IF NOT EXISTS idx_discount_types_name_ar ON discount_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_discount_types_is_active ON discount_types(is_active);

CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
CREATE INDEX IF NOT EXISTS idx_currencies_name_ar ON currencies(name_ar);
CREATE INDEX IF NOT EXISTS idx_currencies_is_active ON currencies(is_active);

CREATE INDEX IF NOT EXISTS idx_system_numbering_code ON system_numbering(code);
CREATE INDEX IF NOT EXISTS idx_system_numbering_is_active ON system_numbering(is_active);

CREATE INDEX IF NOT EXISTS idx_school_branches_code ON school_branches(code);
CREATE INDEX IF NOT EXISTS idx_school_branches_name_ar ON school_branches(name_ar);
CREATE INDEX IF NOT EXISTS idx_school_branches_is_active ON school_branches(is_active);

CREATE INDEX IF NOT EXISTS idx_document_types_code ON document_types(code);
CREATE INDEX IF NOT EXISTS idx_document_types_name_ar ON document_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_document_types_is_active ON document_types(is_active);

CREATE INDEX IF NOT EXISTS idx_master_data_audit_entity ON master_data_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_master_data_audit_action ON master_data_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_master_data_audit_performed_at ON master_data_audit_log(performed_at);
