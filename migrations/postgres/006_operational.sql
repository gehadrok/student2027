-- ============================================================================
-- Migration 006: Operational runtime tables (PG-4.3)
-- Kayan School ERP — PostgreSQL
-- ----------------------------------------------------------------------------
-- Port of the canonical operational runtime tables (src/lib/sqlite-schema.sql):
--   attendance_records, grade_records, certificates, library_books,
--   book_borrowings, app_notifications, saved_reports.
--
-- Type policy (D7/D8/D9): money/score/gpa/percentage -> NUMERIC(18,2);
-- flags (notified/is_read) -> SMALLINT; created_at -> TIMESTAMP;
-- business date columns -> TEXT (preserves SQLite string semantics).
-- FKs -> referenced TEXT PK (CASCADE / SET NULL per canonical). Additive /
-- idempotent. No seed data.
-- ============================================================================

-- 1. ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    subject_id TEXT,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES school_classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    UNIQUE (student_id, date, subject_id)
);

-- 2. GRADE RECORDS
CREATE TABLE IF NOT EXISTS grade_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    term TEXT NOT NULL CHECK (term IN ('الفصل الأول', 'الفصل الثاني', 'الفصل الصيفي')),
    type TEXT NOT NULL CHECK (type IN ('quiz', 'midterm', 'final', 'coursework', 'activity')),
    score NUMERIC(18,2) NOT NULL CHECK (score >= 0),
    max_score NUMERIC(18,2) NOT NULL CHECK (max_score > 0),
    weight NUMERIC(18,2) NOT NULL DEFAULT 20.0 CHECK (weight >= 0 AND weight <= 100),
    date TEXT NOT NULL,
    teacher_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 3. ACADEMIC CERTIFICATES
CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    gpa NUMERIC(18,2) NOT NULL CHECK (gpa >= 0),
    percentage NUMERIC(18,2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
    grade_label TEXT NOT NULL CHECK (grade_label IN ('ممتاز', 'جيد جداً', 'جيد', 'مقبول')),
    rank_in_class INTEGER NOT NULL CHECK (rank_in_class > 0),
    generated_date TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE (student_id, term, academic_year)
);

-- 4. LIBRARY BOOKS
CREATE TABLE IF NOT EXISTS library_books (
    id TEXT PRIMARY KEY,
    isbn TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('علوم وتكنولوجيا', 'أدب وروايات', 'تاريخ وجغرافيا', 'لغات ومراجع', 'دين وفلسفة', 'فنون ومهارات')),
    copies_total INTEGER NOT NULL CHECK (copies_total >= 0),
    copies_available INTEGER NOT NULL CHECK (copies_available >= 0 AND copies_available <= copies_total),
    location TEXT NOT NULL,
    cover_url TEXT,
    description TEXT,
    added_date TEXT NOT NULL
);

-- 5. BOOK BORROWINGS
CREATE TABLE IF NOT EXISTS book_borrowings (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    borrow_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost')),
    notes TEXT,
    notified SMALLINT DEFAULT 0 CHECK (notified IN (0, 1)),
    FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 6. APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS app_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    target_role TEXT CHECK (target_role IN ('admin', 'teacher', 'student', 'parent')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'danger')),
    is_read SMALLINT DEFAULT 0 CHECK (is_read IN (0, 1)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    link TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. SAVED REPORTS LOG
CREATE TABLE IF NOT EXISTS saved_reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL,
    report_type_label TEXT NOT NULL,
    generated_by TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    file_format TEXT NOT NULL CHECK (file_format IN ('PDF', 'Excel', 'Printed', 'Previewed')),
    summary_metrics_json TEXT,
    notes TEXT
);

-- ============================================================================
-- Operational indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_section ON attendance_records(section_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_grade_student ON grade_records(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_subject ON grade_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_book_borrowings_book ON book_borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_book_borrowings_student ON book_borrowings(student_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user ON app_notifications(user_id);

-- ============================================================================
-- ROLLBACK (reverse FK order)
--   DROP TABLE IF EXISTS book_borrowings, attendance_records, grade_records,
--     certificates, app_notifications, saved_reports, library_books CASCADE;
-- ============================================================================
