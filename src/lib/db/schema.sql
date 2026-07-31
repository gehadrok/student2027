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
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    class_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    weekly_hours INTEGER NOT NULL DEFAULT 3 CHECK(weekly_hours > 0),
    max_score REAL NOT NULL DEFAULT 100.0 CHECK(max_score > 0),
    pass_score REAL NOT NULL DEFAULT 50.0 CHECK(pass_score >= 0 AND pass_score <= max_score),
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT
);

-- 8. TIMETABLE SCHEDULE PERIODS (الجداول الحصصية)
CREATE TABLE IF NOT EXISTS schedule_periods (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    day TEXT NOT NULL CHECK(day IN ('الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس')),
    period_number INTEGER NOT NULL CHECK(period_number BETWEEN 1 AND 7),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
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

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
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
-- AUTOMATIC TRIGGERS
-- ============================================================================
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_book_borrow_insert
AFTER INSERT ON book_borrowings
FOR EACH ROW
WHEN NEW.status = 'borrowed'
BEGIN
    UPDATE library_books 
    SET copies_available = MAX(0, copies_available - 1)
    WHERE id = NEW.book_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_book_borrow_return
AFTER UPDATE ON book_borrowings
FOR EACH ROW
WHEN OLD.status = 'borrowed' AND NEW.status = 'returned'
BEGIN
    UPDATE library_books 
    SET copies_available = MIN(copies_total, copies_available + 1)
    WHERE id = NEW.book_id;
END;

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
