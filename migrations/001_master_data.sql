-- ============================================================================
-- Migration 001: Master Data Tables (البيانات الأساسية)
-- Al-Salam School Management System
-- Additive migration - does NOT modify existing tables
-- ============================================================================

-- Enable Foreign Key Enforcement
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CATEGORY 1: ACADEMIC STRUCTURE (الهيكل الأكاديمي)
-- ============================================================================

-- 1. ACADEMIC YEARS (السنوات الدراسية)
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

-- 2. ACADEMIC TERMS (الفصول الدراسية)
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

-- 3. EDUCATION STAGES (المراحل التعليمية)
CREATE TABLE IF NOT EXISTS education_stages (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    max_score REAL DEFAULT 100,
    pass_score REAL DEFAULT 50,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    weight_percent REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_paid INTEGER DEFAULT 0,
    max_days INTEGER,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- ============================================================================
-- CATEGORY 2: GEOGRAPHIC (البيانات الجغرافية)
-- ============================================================================

-- 12. NATIONALITIES (الجنسيات)
CREATE TABLE IF NOT EXISTS nationalities (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 13. COUNTRIES (الدول)
CREATE TABLE IF NOT EXISTS countries (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    nationality_id TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (nationality_id) REFERENCES nationalities(id) ON DELETE SET NULL
);

-- 14. GOVERNORATES (المحافظات)
CREATE TABLE IF NOT EXISTS governorates (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    country_id TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL
);

-- 15. DISTRICTS (المديريات)
CREATE TABLE IF NOT EXISTS districts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    governorate_id TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (governorate_id) REFERENCES governorates(id) ON DELETE SET NULL
);

-- 16. CITIES (المدن)
CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    governorate_id TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (governorate_id) REFERENCES governorates(id) ON DELETE SET NULL
);

-- ============================================================================
-- CATEGORY 3: IDENTITY & DOCUMENTS (الهوية والوثائق)
-- ============================================================================

-- 17. IDENTITY TYPES (أنواع الهوية)
CREATE TABLE IF NOT EXISTS identity_types (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- ============================================================================
-- CATEGORY 4: HUMAN RESOURCES (الموارد البشرية)
-- ============================================================================

-- 18. EMPLOYEE TYPES (أنواع الموظفين)
CREATE TABLE IF NOT EXISTS employee_types (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ============================================================================
-- CATEGORY 5: SCHOOL FACILITIES (المرافق المدرسية)
-- ============================================================================

-- 23. BUILDINGS (المباني)
CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    floors_count INTEGER DEFAULT 1,
    address TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- ============================================================================
-- CATEGORY 6: FINANCIAL (البيانات المالية)
-- ============================================================================

-- 27. FEE CATEGORIES (فئات الرسوم)
CREATE TABLE IF NOT EXISTS fee_categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    amount REAL DEFAULT 0,
    is_recurring INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 28. PAYMENT METHODS (طرق الدفع)
CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    discount_percent REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    exchange_rate REAL DEFAULT 1.0,
    is_base INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- ============================================================================
-- CATEGORY 7: SYSTEM (النظام)
-- ============================================================================

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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- 32. SCHOOL BRANCHES (فروع المدرسة)
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
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- ============================================================================
-- CATEGORY 8: DOCUMENTS (الوثائق)
-- ============================================================================

-- 33. DOCUMENT TYPES (أنواع الوثائق)
CREATE TABLE IF NOT EXISTS document_types (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

-- ============================================================================
-- AUDIT LOG FOR MASTER DATA
-- ============================================================================

-- 34. MASTER DATA AUDIT LOG (سجل عمليات البيانات الأساسية)
CREATE TABLE IF NOT EXISTS master_data_audit_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT', 'PRINT')),
    old_values TEXT,
    new_values TEXT,
    performed_by TEXT NOT NULL,
    performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    details TEXT
);

-- ============================================================================
-- PERMISSION RESOURCES FOR MASTER DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS master_data_permissions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL UNIQUE,
    can_view INTEGER DEFAULT 1,
    can_create INTEGER DEFAULT 0,
    can_edit INTEGER DEFAULT 0,
    can_delete INTEGER DEFAULT 0,
    can_import INTEGER DEFAULT 0,
    can_export INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Academic indexes
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

CREATE INDEX IF NOT EXISTS idx_subjects_master_code ON subjects_master(code);
CREATE INDEX IF NOT EXISTS idx_subjects_master_name_ar ON subjects_master(name_ar);
CREATE INDEX IF NOT EXISTS idx_subjects_master_is_active ON subjects_master(is_active);

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

-- Geographic indexes
CREATE INDEX IF NOT EXISTS idx_nationalities_code ON nationalities(code);
CREATE INDEX IF NOT EXISTS idx_nationalities_name_ar ON nationalities(name_ar);
CREATE INDEX IF NOT EXISTS idx_nationalities_is_active ON nationalities(is_active);

CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name_ar ON countries(name_ar);
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries(is_active);

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

-- Identity indexes
CREATE INDEX IF NOT EXISTS idx_identity_types_code ON identity_types(code);
CREATE INDEX IF NOT EXISTS idx_identity_types_name_ar ON identity_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_identity_types_is_active ON identity_types(is_active);

-- HR indexes
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

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_name_ar ON departments(name_ar);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);

-- Facilities indexes
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

CREATE INDEX IF NOT EXISTS idx_libraries_code ON libraries(code);
CREATE INDEX IF NOT EXISTS idx_libraries_name_ar ON libraries(name_ar);
CREATE INDEX IF NOT EXISTS idx_libraries_is_active ON libraries(is_active);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_fee_categories_code ON fee_categories(code);
CREATE INDEX IF NOT EXISTS idx_fee_categories_name_ar ON fee_categories(name_ar);
CREATE INDEX IF NOT EXISTS idx_fee_categories_is_active ON fee_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_payment_methods_code ON payment_methods(code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_name_ar ON payment_methods(name_ar);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);

CREATE INDEX IF NOT EXISTS idx_discount_types_code ON discount_types(code);
CREATE INDEX IF NOT EXISTS idx_discount_types_name_ar ON discount_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_discount_types_is_active ON discount_types(is_active);

CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
CREATE INDEX IF NOT EXISTS idx_currencies_name_ar ON currencies(name_ar);
CREATE INDEX IF NOT EXISTS idx_currencies_is_active ON currencies(is_active);

-- System indexes
CREATE INDEX IF NOT EXISTS idx_system_numbering_code ON system_numbering(code);
CREATE INDEX IF NOT EXISTS idx_system_numbering_is_active ON system_numbering(is_active);

CREATE INDEX IF NOT EXISTS idx_school_branches_code ON school_branches(code);
CREATE INDEX IF NOT EXISTS idx_school_branches_name_ar ON school_branches(name_ar);
CREATE INDEX IF NOT EXISTS idx_school_branches_is_active ON school_branches(is_active);

CREATE INDEX IF NOT EXISTS idx_document_types_code ON document_types(code);
CREATE INDEX IF NOT EXISTS idx_document_types_name_ar ON document_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_document_types_is_active ON document_types(is_active);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_master_data_audit_entity ON master_data_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_master_data_audit_action ON master_data_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_master_data_audit_performed_at ON master_data_audit_log(performed_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for academic_years updated_at
CREATE TRIGGER IF NOT EXISTS trg_academic_years_updated_at
AFTER UPDATE ON academic_years
FOR EACH ROW
BEGIN
    UPDATE academic_years SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Trigger for academic_terms updated_at
CREATE TRIGGER IF NOT EXISTS trg_academic_terms_updated_at
AFTER UPDATE ON academic_terms
FOR EACH ROW
BEGIN
    UPDATE academic_terms SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Trigger for education_stages updated_at
CREATE TRIGGER IF NOT EXISTS trg_education_stages_updated_at
AFTER UPDATE ON education_stages
FOR EACH ROW
BEGIN
    UPDATE education_stages SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Trigger for grade_levels updated_at
CREATE TRIGGER IF NOT EXISTS trg_grade_levels_updated_at
AFTER UPDATE ON grade_levels
FOR EACH ROW
BEGIN
    UPDATE grade_levels SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ============================================================================
-- SEED DATA (Idempotent - safe to run multiple times)
-- ============================================================================

-- Education Stages (المراحل التعليمية)
INSERT OR IGNORE INTO education_stages (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('stage_primary', 'STG-PRI', 'المرحلة الابتدائية', 'Primary Stage', 'المرحلة التعليمية الأولى من الصف الأول إلى السادس', 1, 1),
('stage_middle', 'STG-MID', 'المرحلة المتوسطة', 'Middle Stage', 'المرحلة التعليمية من الصف السابع إلى التاسع', 1, 2),
('stage_secondary', 'STG-SEC', 'المرحلة الثانوية', 'Secondary Stage', 'المرحلة التعليمية من الصف العاشر إلى الثاني عشر', 1, 3);

-- Grade Levels (الصفوف الدراسية)
INSERT OR IGNORE INTO grade_levels (id, code, name_ar, name_en, description, education_stage_id, level_number, is_active, display_order) VALUES
('grade_1', 'GRD-01', 'الصف الأول الابتدائي', 'Grade 1', 'الصف الأول من المرحلة الابتدائية', 'stage_primary', 1, 1, 1),
('grade_2', 'GRD-02', 'الصف الثاني الابتدائي', 'Grade 2', 'الصف الثاني من المرحلة الابتدائية', 'stage_primary', 2, 1, 2),
('grade_3', 'GRD-03', 'الصف الثالث الابتدائي', 'Grade 3', 'الصف الثالث من المرحلة الابتدائية', 'stage_primary', 3, 1, 3),
('grade_4', 'GRD-04', 'الصف الرابع الابتدائي', 'Grade 4', 'الصف الرابع من المرحلة الابتدائية', 'stage_primary', 4, 1, 4),
('grade_5', 'GRD-05', 'الصف الخامس الابتدائي', 'Grade 5', 'الصف الخامس من المرحلة الابتدائية', 'stage_primary', 5, 1, 5),
('grade_6', 'GRD-06', 'الصف السادس الابتدائي', 'Grade 6', 'الصف السادس من المرحلة الابتدائية', 'stage_primary', 6, 1, 6),
('grade_7', 'GRD-07', 'الصف الأول المتوسط', 'Grade 7', 'الصف الأول من المرحلة المتوسطة', 'stage_middle', 7, 1, 7),
('grade_8', 'GRD-08', 'الصف الثاني المتوسط', 'Grade 8', 'الصف الثاني من المرحلة المتوسطة', 'stage_middle', 8, 1, 8),
('grade_9', 'GRD-09', 'الصف الثالث المتوسط', 'Grade 9', 'الصف الثالث من المرحلة المتوسطة', 'stage_middle', 9, 1, 9),
('grade_10', 'GRD-10', 'الصف الأول الثانوي', 'Grade 10', 'الصف الأول من المرحلة الثانوية', 'stage_secondary', 10, 1, 10),
('grade_11', 'GRD-11', 'الصف الثاني الثانوي', 'Grade 11', 'الصف الثاني من المرحلة الثانوية', 'stage_secondary', 11, 1, 11),
('grade_12', 'GRD-12', 'الصف الثالث الثانوي', 'Grade 12', 'الصف الثالث من المرحلة الثانوية', 'stage_secondary', 12, 1, 12);

-- Academic Years
INSERT OR IGNORE INTO academic_years (id, code, name_ar, name_en, description, start_date, end_date, is_current, is_active, display_order) VALUES
('ay_2024_2025', 'AY-2024-2025', 'العام الدراسي 2024-2025', 'Academic Year 2024-2025', 'العام الدراسي 2024-2025', '2024-09-01', '2025-06-30', 0, 0, 1),
('ay_2025_2026', 'AY-2025-2026', 'العام الدراسي 2025-2026', 'Academic Year 2025-2026', 'العام الدراسي 2025-2026', '2025-09-01', '2026-06-30', 1, 1, 2),
('ay_2026_2027', 'AY-2026-2027', 'العام الدراسي 2026-2027', 'Academic Year 2026-2027', 'العام الدراسي 2026-2027', '2026-09-01', '2027-06-30', 0, 1, 3);

-- Academic Terms
INSERT OR IGNORE INTO academic_terms (id, code, name_ar, name_en, description, academic_year_id, start_date, end_date, is_current, is_active, display_order) VALUES
('term_1_2025', 'TERM-S1-2025', 'الفصل الدراسي الأول', 'First Semester', 'الفصل الدراسي الأول من العام 2025-2026', 'ay_2025_2026', '2025-09-01', '2025-12-31', 1, 1, 1),
('term_2_2025', 'TERM-S2-2025', 'الفصل الدراسي الثاني', 'Second Semester', 'الفصل الدراسي الثاني من العام 2025-2026', 'ay_2025_2026', '2026-01-15', '2026-06-30', 0, 1, 2);

-- Academic Statuses
INSERT OR IGNORE INTO academic_statuses (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('status_active', 'ACT-ACTIVE', 'منتظم', 'Active', 'طالب منتظم ومسجل', 1, 1),
('status_at_risk', 'ACT-RISK', 'متوسط الأداء', 'At Risk', 'طالب بحاجة لدعم أكاديمي', 1, 2),
('status_transferred', 'ACT-TRANS', 'منقول', 'Transferred', 'طالب منقول من/إلى المدرسة', 1, 3),
('status_graduated', 'ACT-GRAD', 'متخرج', 'Graduated', 'طالب متخرج', 1, 4),
('status_suspended', 'ACT-SUSP', 'موقوف', 'Suspended', 'طالب موقوف قيد', 1, 5);

-- Exam Types
INSERT OR IGNORE INTO exam_types (id, code, name_ar, name_en, description, weight_percent, is_active, display_order) VALUES
('exam_quiz', 'EXM-QUIZ', 'اختبار قصير', 'Quiz', 'اختبار قصير أسبوعي', 10, 1, 1),
('exam_midterm', 'EXM-MID', 'اختبار نصف الفصل', 'Midterm Exam', 'اختبار منتصف الفصل الدراسي', 30, 1, 2),
('exam_final', 'EXM-FINAL', 'اختبار نهائي', 'Final Exam', 'الاختبار النهائي للفصل الدراسي', 40, 1, 3),
('exam_coursework', 'EXM-CW', 'أعمال الفصل', 'Coursework', 'أعمال ومشاريع الفصل الدراسي', 15, 1, 4),
('exam_activity', 'EXM-ACT', 'نشاط ومشاركة', 'Activity', 'المشاركة والأنشطة الصفية', 5, 1, 5);

-- Certificate Types
INSERT OR IGNORE INTO certificate_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('cert_transcript', 'CERT-TRAN', 'كشف درجات', 'Transcript', 'كشف درجات شامل لجميع المواد', 1, 1),
('cert_graduation', 'CERT-GRAD', 'شهادة تخرج', 'Graduation Certificate', 'شهادة تخرج من المرحلة الدراسية', 1, 2),
('cert_excellence', 'CERT-EXC', 'شهادة تفوق', 'Excellence Certificate', 'شهادة تفوق أكاديمي', 1, 3),
('cert_behavior', 'CERT-BEH', 'شهادة سلوك', 'Behavior Certificate', 'شهادة حسن السيرة والسلوك', 1, 4);

-- Attendance Types
INSERT OR IGNORE INTO attendance_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('att_present', 'ATT-PRS', 'حاضر', 'Present', 'الطالب حاضر في الحصة', 1, 1),
('att_absent', 'ATT-ABS', 'غائب', 'Absent', 'الطالب غائب بدون عذر', 1, 2),
('att_late', 'ATT-LAT', 'متأخر', 'Late', 'الطالب متأخر عن الحصة', 1, 3),
('att_excused', 'ATT-EXC', 'معذور', 'Excused', 'غياب بعذر مقبول', 1, 4);

-- Leave Types
INSERT OR IGNORE INTO leave_types (id, code, name_ar, name_en, description, is_paid, max_days, is_active, display_order) VALUES
('leave_sick', 'LV-SICK', 'إجازة مرضية', 'Sick Leave', 'إجازة بسبب المرض', 1, 30, 1, 1),
('leave_annual', 'LV-ANN', 'إجازة سنوية', 'Annual Leave', 'الإجازة السنوية النظامية', 1, 30, 1, 2),
('leave_emergency', 'LV-EMER', 'إجازة طارئة', 'Emergency Leave', 'إجازة للظروف الطارئة', 1, 7, 1, 3),
('leave_maternity', 'LV-MAT', 'إجازة أمومة', 'Maternity Leave', 'إجازة الوضع والأمومة', 1, 90, 1, 4),
('leave_unpaid', 'LV-UNP', 'إجازة بدون راتب', 'Unpaid Leave', 'إجازة بدون راتب', 0, 90, 1, 5);

-- Nationalities
INSERT OR IGNORE INTO nationalities (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('nat_yemen', 'NAT-YE', 'يمني', 'Yemeni', 'الجنسية اليمنية', 1, 1),
('nat_saudi', 'NAT-SA', 'سعودي', 'Saudi', 'الجنسية السعودية', 1, 2),
('nat_egypt', 'NAT-EG', 'مصري', 'Egyptian', 'الجنسية المصرية', 1, 3),
('nat_jordan', 'NAT-JO', 'أردني', 'Jordanian', 'الجنسية الأردنية', 1, 4),
('nat_syrian', 'NAT-SY', 'سوري', 'Syrian', 'الجنسية السورية', 1, 5);

-- Countries
INSERT OR IGNORE INTO countries (id, code, name_ar, name_en, description, nationality_id, is_active, display_order) VALUES
('cnt_yemen', 'CNT-YE', 'اليمن', 'Yemen', 'الجمهورية اليمنية', 'nat_yemen', 1, 1),
('cnt_saudi', 'CNT-SA', 'المملكة العربية السعودية', 'Saudi Arabia', 'المملكة العربية السعودية', 'nat_saudi', 1, 2),
('cnt_egypt', 'CNT-EG', 'مصر', 'Egypt', 'جمهورية مصر العربية', 'nat_egypt', 1, 3),
('cnt_jordan', 'CNT-JO', 'الأردن', 'Jordan', 'المملكة الأردنية الهاشمية', 'nat_jordan', 1, 4);

-- Yemen Governorates
INSERT OR IGNORE INTO governorates (id, code, name_ar, name_en, description, country_id, is_active, display_order) VALUES
('gov_dhale', 'GOV-DH', 'محافظة الضالع', 'Dhale Governorate', 'محافظة الضالع', 'cnt_yemen', 1, 1),
('gov_aden', 'GOV-AD', 'محافظة عدن', 'Aden Governorate', 'محافظة عدن', 'cnt_yemen', 1, 2),
('gov_sanaa', 'GOV-SA', 'محافظة صنعاء', 'Sanaa Governorate', 'محافظة صنعاء', 'cnt_yemen', 1, 3),
('gov_taiz', 'GOV-TA', 'محافظة تعز', 'Taiz Governorate', 'محافظة تعز', 'cnt_yemen', 1, 4);

-- Districts
INSERT OR IGNORE INTO districts (id, code, name_ar, name_en, description, governorate_id, is_active, display_order) VALUES
('dist_jahaf', 'DST-JH', 'مديرية جحاف', 'Jahaf District', 'مديرية جحاف - محافظة الضالع', 'gov_dhale', 1, 1),
('dist_dhale_city', 'DST-DC', 'مديرية الضالع', 'Dhale City District', 'مديرية مركز الضالع', 'gov_dhale', 1, 2),
('dist_aden_city', 'DST-AC', 'مديرية صيرة', 'Khur Maksar District', 'مديرية صيرة - عدن', 'gov_aden', 1, 3);

-- Identity Types
INSERT OR IGNORE INTO identity_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('id_national', 'ID-NAT', 'بطاقة شخصية', 'National ID', 'بطاقة الهوية الوطنية', 1, 1),
('id_passport', 'ID-PP', 'جواز سفر', 'Passport', 'جواز السفر', 1, 2),
('id_birth', 'ID-BIRTH', 'شهادة ميلاد', 'Birth Certificate', 'شهادة الميلاد', 1, 3),
('id_resident', 'ID-RES', 'إقامة', 'Resident ID', 'بطاقة إقامة', 1, 4);

-- Employee Types
INSERT OR IGNORE INTO employee_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('emp_teacher', 'EMP-TCH', 'مدرس', 'Teacher', 'كادر تدريسي', 1, 1),
('emp_admin', 'EMP-ADM', 'إداري', 'Administrative', 'موظف إداري', 1, 2),
('emp_support', 'EMP-SUP', 'دعم فني', 'Support Staff', 'طاقم الدعم الفني والإشرافي', 1, 3),
('emp_manager', 'EMP-MGR', 'مدير', 'Manager', 'مدير إدارة أو قسم', 1, 4);

-- Qualifications
INSERT OR IGNORE INTO qualifications (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('qual_phd', 'Q-PHD', 'دكتوراه', 'PhD', 'درجة الدكتوراه', 1, 1),
('qual_master', 'Q-MASTER', 'ماجستير', 'Master', 'درجة الماجستير', 1, 2),
('qual_bachelor', 'Q-BACH', 'بكالوريوس', 'Bachelor', 'درجة البكالوريوس', 1, 3),
('qual_diploma', 'Q-DIP', 'دبلوم', 'Diploma', 'دبلوم عالي أو متوسط', 1, 4),
('qual_highschool', 'Q-HS', 'ثانوية عامة', 'High School', 'شهادة الثانوية العامة', 1, 5);

-- Specializations
INSERT OR IGNORE INTO specializations (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('spec_math', 'SP-MATH', 'الرياضيات', 'Mathematics', 'تخصص الرياضيات', 1, 1),
('spec_physics', 'SP-PHY', 'الفيزياء', 'Physics', 'تخصص الفيزياء', 1, 2),
('spec_chemistry', 'SP-CHEM', 'الكيمياء', 'Chemistry', 'تخصص الكيمياء', 1, 3),
('spec_biology', 'SP-BIO', 'الأحياء', 'Biology', 'تخصص الأحياء', 1, 4),
('spec_english', 'SP-ENG', 'اللغة الإنجليزية', 'English', 'تخصص اللغة الإنجليزية', 1, 5),
('spec_arabic', 'SP-ARB', 'اللغة العربية', 'Arabic', 'تخصص اللغة العربية', 1, 6),
('spec_computer', 'SP-CS', 'علوم الحاسب', 'Computer Science', 'تخصص علوم الحاسب', 1, 7);

-- Job Titles
INSERT OR IGNORE INTO job_titles (id, code, name_ar, name_en, description, employee_type_id, is_active, display_order) VALUES
('job_principal', 'JOB-PRIN', 'مدير المدرسة', 'School Principal', 'مدير المدرسة', 'emp_manager', 1, 1),
('job_vice_principal', 'JOB-VP', 'وكيل المدرسة', 'Vice Principal', 'وكيل المدرسة', 'emp_manager', 1, 2),
('job_head_dept', 'JOB-HD', 'رئيس قسم', 'Head of Department', 'رئيس قسم دراسي', 'emp_manager', 1, 3),
('job_teacher', 'JOB-TCH', 'مدرس', 'Teacher', 'مدرس مادة', 'emp_teacher', 1, 4),
('job_admin', 'JOB-ADM', 'موظف إداري', 'Admin Staff', 'موظف إداري', 'emp_admin', 1, 5);

-- Payment Methods
INSERT OR IGNORE INTO payment_methods (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('pay_cash', 'PAY-CASH', 'نقداً', 'Cash', 'الدفع نقداً', 1, 1),
('pay_bank', 'PAY-BANK', 'تحويل بنكي', 'Bank Transfer', 'تحويل بنكي', 1, 2),
('pay_card', 'PAY-CARD', 'بطاقة ائتمان', 'Credit Card', 'دفع ببطاقة الائتمان', 1, 3),
('pay_cheque', 'PAY-CHQ', 'شيك', 'Cheque', 'دفع بشيك مصرفي', 1, 4);

-- Currencies
INSERT OR IGNORE INTO currencies (id, code, name_ar, name_en, description, symbol, exchange_rate, is_base, is_active, display_order) VALUES
('cur_yer', 'CUR-YER', 'ريال يمني', 'Yemeni Rial', 'العملة المحلية - اليمن', 'ر.ي', 1.0, 1, 1, 1),
('cur_sar', 'CUR-SAR', 'ريال سعودي', 'Saudi Riyal', 'الريال السعودي', 'ر.س', 0.016, 0, 1, 2),
('cur_usd', 'CUR-USD', 'دولار أمريكي', 'US Dollar', 'الدولار الأمريكي', '$', 0.004, 0, 1, 3);

-- System Numbering
INSERT OR IGNORE INTO system_numbering (id, code, name_ar, name_en, description, prefix, next_number, step, pad_length, is_active, display_order) VALUES
('num_student', 'NUM-STU', 'ترقيم الطلاب', 'Student Numbering', 'ترقيم الطلاب الأكاديمي', 'STU-', 1001, 1, 6, 1, 1),
('num_employee', 'NUM-EMP', 'ترقيم الموظفين', 'Employee Numbering', 'ترقيم الموظفين', 'EMP-', 101, 1, 6, 1, 2),
('num_invoice', 'NUM-INV', 'ترقيم الفواتير', 'Invoice Numbering', 'ترقيم الفواتير المالية', 'INV-', 2001, 1, 6, 1, 3),
('num_receipt', 'NUM-REC', 'ترقيم السندات', 'Receipt Numbering', 'ترقيم سندات القبض', 'REC-', 9001, 1, 6, 1, 4),
('num_certificate', 'NUM-CERT', 'ترقيم الشهادات', 'Certificate Numbering', 'ترقيم الشهادات الأكاديمية', 'CERT-', 101, 1, 6, 1, 5);

-- Document Types
INSERT OR IGNORE INTO document_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('doc_identity', 'DOC-ID', 'مستندات هوية', 'Identity Documents', 'بطاقات الهوية الشخصية', 1, 1),
('doc_academic', 'DOC-ACAD', 'مستندات أكاديمية', 'Academic Documents', 'الشهادات والسجلات الأكاديمية', 1, 2),
('doc_financial', 'DOC-FIN', 'مستندات مالية', 'Financial Documents', 'الفواتير وسندات القبض', 1, 3),
('doc_medical', 'DOC-MED', 'مستندات طبية', 'Medical Documents', 'التقارير والشهادات الطبية', 1, 4);

-- Default Permissions
INSERT OR IGNORE INTO master_data_permissions (id, entity_type, can_view, can_create, can_edit, can_delete, can_import, can_export) VALUES
('perm_academic_years', 'academic_years', 1, 1, 1, 1, 1, 1),
('perm_academic_terms', 'academic_terms', 1, 1, 1, 1, 1, 1),
('perm_education_stages', 'education_stages', 1, 1, 1, 1, 1, 1),
('perm_grade_levels', 'grade_levels', 1, 1, 1, 1, 1, 1),
('perm_sections_master', 'sections_master', 1, 1, 1, 1, 1, 1),
('perm_subjects_master', 'subjects_master', 1, 1, 1, 1, 1, 1),
('perm_exam_types', 'exam_types', 1, 1, 1, 1, 1, 1),
('perm_certificate_types', 'certificate_types', 1, 1, 1, 1, 1, 1),
('perm_attendance_types', 'attendance_types', 1, 1, 1, 1, 1, 1),
('perm_leave_types', 'leave_types', 1, 1, 1, 1, 1, 1),
('perm_academic_statuses', 'academic_statuses', 1, 1, 1, 1, 1, 1),
('perm_nationalities', 'nationalities', 1, 1, 1, 1, 1, 1),
('perm_countries', 'countries', 1, 1, 1, 1, 1, 1),
('perm_governorates', 'governorates', 1, 1, 1, 1, 1, 1),
('perm_districts', 'districts', 1, 1, 1, 1, 1, 1),
('perm_cities', 'cities', 1, 1, 1, 1, 1, 1),
('perm_identity_types', 'identity_types', 1, 1, 1, 1, 1, 1),
('perm_employee_types', 'employee_types', 1, 1, 1, 1, 1, 1),
('perm_qualifications', 'qualifications', 1, 1, 1, 1, 1, 1),
('perm_specializations', 'specializations', 1, 1, 1, 1, 1, 1),
('perm_job_titles', 'job_titles', 1, 1, 1, 1, 1, 1),
('perm_departments', 'departments', 1, 1, 1, 1, 1, 1),
('perm_buildings', 'buildings', 1, 1, 1, 1, 1, 1),
('perm_rooms', 'rooms', 1, 1, 1, 1, 1, 1),
('perm_laboratories', 'laboratories', 1, 1, 1, 1, 1, 1),
('perm_libraries', 'libraries', 1, 1, 1, 1, 1, 1),
('perm_fee_categories', 'fee_categories', 1, 1, 1, 1, 1, 1),
('perm_payment_methods', 'payment_methods', 1, 1, 1, 1, 1, 1),
('perm_discount_types', 'discount_types', 1, 1, 1, 1, 1, 1),
('perm_currencies', 'currencies', 1, 1, 1, 1, 1, 1),
('perm_system_numbering', 'system_numbering', 1, 1, 1, 1, 1, 1),
('perm_school_branches', 'school_branches', 1, 1, 1, 1, 1, 1),
('perm_document_types', 'document_types', 1, 1, 1, 1, 1, 1);

