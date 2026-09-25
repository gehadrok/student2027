-- ============================================================================
-- Migration 004: People & Relationship runtime tables (PG-4.3)
-- Kayan School ERP — PostgreSQL
-- ----------------------------------------------------------------------------
-- Port of the canonical runtime schema (src/lib/sqlite-schema.sql) for the
-- people/relationship layer. Type policy (D7/D8/D9, proven in PG-4.2):
--   * id                              TEXT PRIMARY KEY
--   * is_* / status / notified flags  SMALLINT
--   * created_at / updated_at         TIMESTAMP (app-managed; NO triggers)
--   * money / score / gpa / percent   NUMERIC(18,2)
--   * business date columns            TEXT (preserves SQLite string semantics)
--   * FKs                              TEXT column -> referenced TEXT PK
--                                        (ON DELETE CASCADE / SET NULL per
--                                         canonical SQLite schema)
--
-- ORDERING NOTE (mandatory): `users` is created FIRST in this file. Several
-- downstream tables (teachers/parents/students/app_notifications/audit_logs/
-- user_linked_students) declare FOREIGN KEYs to `users`. PostgreSQL requires a
-- referenced table to exist when a FK is declared, and the migration runner
-- keys applied-state on the leading integer version (no integer version sorts
-- uniquely between 003 and 004), so `users` cannot live in a later file (008).
-- The approved 25-table scope is fully preserved; only the intra-file home of
-- `users` moves to 004 (008 then holds the remaining 6 security-org tables).
--
-- All statements are IF NOT EXISTS / additive / idempotent. No seed data.
-- ============================================================================

-- 0. USERS & AUTHENTICATION (created first — FK prerequisite for other tables)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT NOT NULL,
    photo TEXT,
    avatar_color TEXT,
    linked_teacher_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    last_login TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1. TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
    photo TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on-leave')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. PARENTS
CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    occupation TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. SCHOOL CLASSES
CREATE TABLE IF NOT EXISTS school_classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 12),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. SECTIONS
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 30 CHECK (capacity > 0),
    supervisor_teacher_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    UNIQUE (class_id, name)
);

-- 5. STUDENTS
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
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    photo TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated', 'at-risk')),
    health_notes TEXT,
    enrollment_date TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES school_classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (parent_id) REFERENCES parents(id)
);

-- 6. TEACHER <-> SUBJECT JUNCTION
CREATE TABLE IF NOT EXISTS teacher_subjects (
    teacher_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    PRIMARY KEY (teacher_id, subject_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 7. TEACHER <-> CLASS JUNCTION
CREATE TABLE IF NOT EXISTS teacher_classes (
    teacher_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    PRIMARY KEY (teacher_id, class_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE
);

-- 8. PARENT <-> STUDENT JUNCTION
CREATE TABLE IF NOT EXISTS parent_students (
    parent_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    PRIMARY KEY (parent_id, student_id),
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 9. USER <-> LINKED STUDENT JUNCTION
CREATE TABLE IF NOT EXISTS user_linked_students (
    user_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    PRIMARY KEY (user_id, student_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ============================================================================
-- People & relationship indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_user ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_sections_class ON sections(class_id);
CREATE INDEX IF NOT EXISTS idx_sections_supervisor ON sections(supervisor_teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_builder ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class ON teacher_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_user_linked_students_user ON user_linked_students(user_id);
CREATE INDEX IF NOT EXISTS idx_user_linked_students_student ON user_linked_students(student_id);

-- ============================================================================
-- ROLLBACK (reverse FK order; drops only the 25 PG-4.3 tables)
--   DROP TABLE IF EXISTS user_linked_students, parent_students,
--     teacher_classes, teacher_subjects, students, sections, parents,
--     teachers, school_classes, users CASCADE;
-- ============================================================================
