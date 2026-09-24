-- ============================================================================
-- Al-Salam School Management System (مدرسة خالد ابن الوليد الضالع/جحاف)
-- Production Grade 3NF Relational SQLite Schema
-- Includes Table Definitions, Primary/Foreign Keys, Constraints, Indexes & Triggers
-- ============================================================================

-- Enable Foreign Key Enforcement
PRAGMA foreign_keys = ON;

-- 1. USERS & AUTHENTICATION
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student', 'parent')),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT NOT NULL,
    photo TEXT,
    avatar_color TEXT,
    linked_teacher_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
    last_login TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0 CHECK(experience_years >= 0),
    photo TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'on-leave')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. PARENTS
CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    occupation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. SCHOOL CLASSES (الصفوف الدراسية)
CREATE TABLE IF NOT EXISTS school_classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 12),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. SECTIONS (الشعب الدراسية)
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 30 CHECK(capacity > 0),
    supervisor_teacher_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    UNIQUE(class_id, name)
);

-- 6. STUDENTS (الطلاب)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    academic_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
    photo TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'transferred', 'graduated', 'at-risk')),
    health_notes TEXT,
    enrollment_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES school_classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (parent_id) REFERENCES parents(id)
);

-- 7. SUBJECTS (المواد الدراسية)
-- NOTE (Academic runtime persistence alignment): `name`/`code` relaxed to be
-- nullable and `code` de-uniqued so the CourseAssignment repository can insert
-- rows with only (id, subject_id, teacher_id, class_id, weekly_hours). Additive
-- columns `subject_id` and `updated_at` support CourseAssignment persistence.
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT,
    code TEXT,
    class_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    weekly_hours INTEGER NOT NULL DEFAULT 3 CHECK(weekly_hours > 0),
    max_score REAL NOT NULL DEFAULT 100.0 CHECK(max_score > 0),
    pass_score REAL NOT NULL DEFAULT 50.0 CHECK(pass_score >= 0 AND pass_score <= max_score),
    color TEXT,
    subject_id TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT
);

-- 8. TIMETABLE SCHEDULE PERIODS (الجداول الحصصية)
-- NOTE (Academic runtime persistence alignment): `day` CHECK relaxed to accept
-- both legacy Arabic weekday tokens and ISO calendar dates (used by the
-- Academic calendar repository). Additive columns `academic_week` and
-- `updated_at` support Academic calendar persistence.
CREATE TABLE IF NOT EXISTS schedule_periods (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    day TEXT NOT NULL,
    period_number INTEGER NOT NULL CHECK(period_number BETWEEN 1 AND 7),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    academic_week INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    UNIQUE(section_id, day, period_number),
    UNIQUE(teacher_id, day, period_number)
);

-- 9. ATTENDANCE RECORDS (الحضور والغياب)
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    subject_id TEXT,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    recorded_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES school_classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    UNIQUE(student_id, date, subject_id)
);

-- 10. GRADE RECORDS (سجل الدرجات والتقييم)
CREATE TABLE IF NOT EXISTS grade_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    term TEXT NOT NULL CHECK(term IN ('الفصل الأول', 'الفصل الثاني', 'الفصل الصيفي')),
    type TEXT NOT NULL CHECK(type IN ('quiz', 'midterm', 'final', 'coursework', 'activity')),
    score REAL NOT NULL CHECK(score >= 0),
    max_score REAL NOT NULL CHECK(max_score > 0),
    weight REAL NOT NULL DEFAULT 20.0 CHECK(weight >= 0 AND weight <= 100),
    date TEXT NOT NULL,
    teacher_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 11. ACADEMIC CERTIFICATES (الشهادات والنتائج)
CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    gpa REAL NOT NULL CHECK(gpa >= 0),
    percentage REAL NOT NULL CHECK(percentage BETWEEN 0 AND 100),
    grade_label TEXT NOT NULL CHECK(grade_label IN ('ممتاز', 'جيد جداً', 'جيد', 'مقبول')),
    rank_in_class INTEGER NOT NULL CHECK(rank_in_class > 0),
    generated_date TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(student_id, term, academic_year)
);

-- 12. FEE PAYMENTS & TUITION (الرسوم والمدفوعات)
CREATE TABLE IF NOT EXISTS fee_payments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    receipt_number TEXT UNIQUE,
    title TEXT NOT NULL,
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    paid_amount REAL NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
    remaining_amount REAL NOT NULL CHECK(remaining_amount >= 0),
    due_date TEXT NOT NULL,
    paid_date TEXT,
    status TEXT NOT NULL CHECK(status IN ('paid', 'pending', 'overdue', 'partial', 'unpaid')),
    payment_method TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 13. EXPENSE RECORDS (المصروفات التشغيلية)
CREATE TABLE IF NOT EXISTS expense_records (
    id TEXT PRIMARY KEY,
    voucher_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK(category IN ('رواتب مكافآت', 'صيانة ومرافق', 'مستلزمات مدرسية', 'أنشطة وفعاليات', 'أخرى')),
    title TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    beneficiary TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. LIBRARY BOOKS (سجل المكتبة المدرسية)
CREATE TABLE IF NOT EXISTS library_books (
    id TEXT PRIMARY KEY,
    isbn TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('علوم وتكنولوجيا', 'أدب وروايات', 'تاريخ وجغرافيا', 'لغات ومراجع', 'دين وفلسفة', 'فنون ومهارات')),
    copies_total INTEGER NOT NULL CHECK(copies_total >= 0),
    copies_available INTEGER NOT NULL CHECK(copies_available >= 0 AND copies_available <= copies_total),
    location TEXT NOT NULL,
    cover_url TEXT,
    description TEXT,
    added_date TEXT NOT NULL
);

-- 15. BOOK BORROWINGS (معاملات استعارة الكتب)
CREATE TABLE IF NOT EXISTS book_borrowings (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    borrow_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL CHECK(status IN ('borrowed', 'returned', 'overdue', 'lost')),
    notes TEXT,
    notified INTEGER DEFAULT 0 CHECK(notified IN (0, 1)),
    FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 16. APP NOTIFICATIONS (الإشعارات والإنذارات)
CREATE TABLE IF NOT EXISTS app_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    target_role TEXT CHECK(target_role IN ('admin', 'teacher', 'student', 'parent')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('info', 'warning', 'success', 'danger')),
    is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    link TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 17. AUDIT LOGS (سجل العمليات والرقابة)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 18. SCHOOL SETTINGS (إعدادات النظام والمدرسة)
CREATE TABLE IF NOT EXISTS school_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    school_name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    website TEXT,
    admin_name TEXT,
    academic_year TEXT NOT NULL,
    current_term TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT,
    enable_sms_alerts INTEGER DEFAULT 1,
    enable_ai_analysis INTEGER DEFAULT 1,
    attendance_lock_hour TEXT DEFAULT '09:00'
);

-- 19. SAVED REPORTS LOG (أرشيف وسجل التقارير)
CREATE TABLE IF NOT EXISTS saved_reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL,
    report_type_label TEXT NOT NULL,
    generated_by TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    file_format TEXT NOT NULL CHECK(file_format IN ('PDF', 'Excel', 'Printed', 'Previewed')),
    summary_metrics_json TEXT,
    notes TEXT
);

-- 20. JUNCTION TABLES (Normalized 3NF Associations)
CREATE TABLE IF NOT EXISTS teacher_subjects (
    teacher_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    PRIMARY KEY (teacher_id, subject_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_classes (
    teacher_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    PRIMARY KEY (teacher_id, class_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parent_students (
    parent_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    PRIMARY KEY (parent_id, student_id),
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_linked_students (
    user_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    PRIMARY KEY (user_id, student_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 21. ACADEMIC YEARS (السنوات الدراسية)
-- NOTE (Academic runtime persistence alignment): added to the canonical runtime
-- schema so the AcademicYear repository can persist and reconstruct aggregates.
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

-- 22. ACADEMIC TERMS (الفصول الدراسية)
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

-- 23. SUBJECTS MASTER (المواد الدراسية - master data version)
-- NOTE (Academic runtime persistence alignment): used by the Curriculum
-- repository. `grade_level_id` is a plain column (no FK) to avoid pulling in
-- grade_levels/education_stages tables that are not part of the runtime schema.
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

-- 24. ACADEMIC CALENDAR DAYS (أيام التقويم الدراسي)
-- NOTE (Academic runtime persistence alignment): dedicated table so the
-- AcademicCalendar repository can INSERT/UPDATE/DELETE school days that carry
-- only (id, date/day, academic_week, is_instructional) WITHOUT requiring the
-- full timetable FK parents (class/section/subject/teacher) that
-- `schedule_periods` mandates. `day` holds the ISO calendar date.
CREATE TABLE IF NOT EXISTS academic_calendar_days (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL UNIQUE,
    academic_week INTEGER NOT NULL DEFAULT 1,
    is_instructional INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 25. MASTER DATA (البيانات الأساسية)
-- Restored per R3: canonical runtime schema must contain every table referenced
-- by the master-data TABLE_MAP and the runtime Master Data CRUD path, so the
-- runtime database no longer depends on migrations/001_master_data.sql.
-- Reconciliation notes:
--   * Column shapes follow the canonical master-data convention already used by
--     academic_years / academic_terms / subjects_master (id, code, name_ar,
--     name_en, description, is_active, display_order + audit columns) and the
--     definitions in migrations/001_master_data.sql.
--   * fee_categories gains `parent_category_id` (self-parent) because
--     masterDataRepository.getChildRelations queries it at runtime.
--   * subjects_master already exists above and is NOT re-declared here.
--   * Audit columns are application-managed (MasterDataRepository.create/update
--     write created_at/updated_at/created_by/updated_by), matching the existing
--     canonical runtime convention — no updated_at triggers are added.
-- ============================================================================

-- 25.1 EDUCATION STAGES (المراحل التعليمية)
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

-- 25.2 GRADE LEVELS (الصفوف الدراسية)
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

-- 25.3 SECTIONS MASTER (الشعب الدراسية - master data version)
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

-- 25.4 EXAM TYPES (أنواع الاختبارات)
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

-- 25.5 CERTIFICATE TYPES (أنواع الشهادات)
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

-- 25.6 ATTENDANCE TYPES (أنواع الحضور والغياب)
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

-- 25.7 LEAVE TYPES (أنواع الإجازات)
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

-- 25.8 ACADEMIC STATUSES (الحالات الأكاديمية)
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

-- 25.9 NATIONALITIES (الجنسيات)
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

-- 25.10 COUNTRIES (الدول)
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

-- 25.11 GOVERNORATES (المحافظات)
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

-- 25.12 DISTRICTS (المديريات)
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

-- 25.13 CITIES (المدن)
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

-- 25.14 IDENTITY TYPES (أنواع الهوية)
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

-- 25.15 EMPLOYEE TYPES (أنواع الموظفين)
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

-- 25.16 QUALIFICATIONS (المؤهلات العلمية)
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

-- 25.17 SPECIALIZATIONS (التخصصات)
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

-- 25.18 JOB TITLES (الوظائف)
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

-- 25.19 DEPARTMENTS (الأقسام)
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

-- 25.20 BUILDINGS (المباني)
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

-- 25.21 ROOMS (الغرف العامة)
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

-- 25.22 LABORATORIES (المختبرات)
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

-- 25.23 LIBRARIES (المكتبات)
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

-- 25.24 FEE CATEGORIES (فئات الرسوم)
-- NOTE (R3 reconciliation): `parent_category_id` self-reference is required by
-- masterDataRepository.getChildRelations which queries fee_categories for child
-- rows before delete; it is not defined in migrations/001_master_data.sql.
CREATE TABLE IF NOT EXISTS fee_categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    amount REAL DEFAULT 0,
    is_recurring INTEGER DEFAULT 0,
    parent_category_id TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (parent_category_id) REFERENCES fee_categories(id) ON DELETE SET NULL
);

-- 25.25 PAYMENT METHODS (طرق الدفع)
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

-- 25.26 DISCOUNT TYPES (أنواع الخصومات)
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

-- 25.27 CURRENCIES (العملات)
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

-- 25.28 SYSTEM NUMBERING (الترقيم الآلي)
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

-- 25.29 SCHOOL BRANCHES (فروع المدرسة)
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

-- 25.30 DOCUMENT TYPES (أنواع الوثائق)
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

-- 25.31 MASTER DATA AUDIT LOG (سجل عمليات البيانات الأساسية)
-- Written by MasterDataRepository.logAudit (CREATE/UPDATE/DELETE/IMPORT/EXPORT)
-- and read by MasterDataRepository.getAuditLogs / MasterDataCenter audit modal.
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
-- PERFORMANCE INDEXES (25+ INDEXES)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_academic_calendar_days_day ON academic_calendar_days(day);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_days_week ON academic_calendar_days(academic_week);
CREATE INDEX IF NOT EXISTS idx_academic_years_code ON academic_years(code);
CREATE INDEX IF NOT EXISTS idx_academic_years_is_active ON academic_years(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_year ON academic_terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_code ON academic_terms(code);
CREATE INDEX IF NOT EXISTS idx_subjects_master_code ON subjects_master(code);
CREATE INDEX IF NOT EXISTS idx_subjects_master_is_active ON subjects_master(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_academic_id ON students(academic_id);
CREATE INDEX IF NOT EXISTS idx_sections_class_id ON sections(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class_teacher ON subjects(class_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_class_section ON schedule_periods(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_schedule_teacher_day ON schedule_periods(teacher_id, day);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_section_date ON attendance_records(class_id, section_id, date);
CREATE INDEX IF NOT EXISTS idx_grades_student_subject ON grade_records(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_term_type ON grade_records(term, type);
CREATE INDEX IF NOT EXISTS idx_certificates_student_term ON certificates(student_id, term, academic_year);
CREATE INDEX IF NOT EXISTS idx_payments_student_status ON fee_payments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON fee_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expense_records(category, date);
CREATE INDEX IF NOT EXISTS idx_books_category_isbn ON library_books(category, isbn);
CREATE INDEX IF NOT EXISTS idx_borrowings_student_status ON book_borrowings(student_id, status);
CREATE INDEX IF NOT EXISTS idx_borrowings_due_date ON book_borrowings(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON app_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_saved_reports_generated_at ON saved_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);

-- ============================================================================
-- MASTER DATA INDEXES (R3: restored runtime tables)
-- Lookup patterns: is_active filter, search on code/name_ar/name_en, sort by
-- display_order/name_ar (MasterDataRepository.getAll/getAllFlat), plus FK
-- columns used by getChildRelations / parent lookups.
-- ============================================================================
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

-- ============================================================================
-- AUTOMATIC TRIGGERS
-- ============================================================================

-- Trigger 1: Auto update users.updated_at
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Trigger 2: Auto update library book available copies on borrowing insertion
CREATE TRIGGER IF NOT EXISTS trg_book_borrow_insert
AFTER INSERT ON book_borrowings
FOR EACH ROW
WHEN NEW.status = 'borrowed'
BEGIN
    UPDATE library_books 
    SET copies_available = MAX(0, copies_available - 1)
    WHERE id = NEW.book_id;
END;

-- Trigger 3: Auto update library book available copies on book return
CREATE TRIGGER IF NOT EXISTS trg_book_borrow_return
AFTER UPDATE ON book_borrowings
FOR EACH ROW
WHEN OLD.status = 'borrowed' AND NEW.status = 'returned'
BEGIN
    UPDATE library_books 
    SET copies_available = MIN(copies_total, copies_available + 1)
    WHERE id = NEW.book_id;
END;

-- Trigger 4: Auto update fee payment remaining amount and status
CREATE TRIGGER IF NOT EXISTS trg_fee_payment_update
AFTER UPDATE OF paid_amount ON fee_payments
FOR EACH ROW
BEGIN
    UPDATE fee_payments 
    SET remaining_amount = MAX(0, total_amount - NEW.paid_amount),
        status = CASE 
            WHEN NEW.paid_amount >= total_amount THEN 'paid'
            WHEN NEW.paid_amount > 0 THEN 'partial'
            ELSE 'unpaid'
        END
    WHERE id = NEW.id;
END;
