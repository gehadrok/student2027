-- ============================================================================
-- Migration 008: Security / Organization remainder (PG-4.3)
-- Kayan School ERP — PostgreSQL
-- ----------------------------------------------------------------------------
-- Port of the canonical security/organization remainder + RBAC base:
--   school_settings (generic 1-row seed), audit_logs,
--   roles, permissions, user_roles, role_permissions.
--
-- NOTE: `users` (also a Layer-1 security table) is created FIRST in
-- 004_students_teachers.sql because downstream tables declare FKs to it and
-- PostgreSQL requires the referenced table to exist at FK-declaration time.
-- This file therefore holds the remaining 6 Layer-1 tables; the approved
-- 25-table scope is intact.
--
-- RBAC base tables (roles/permissions/user_roles/role_permissions) are created
-- EMPTY. Seed values (the 14-role / permission matrix) are DEFERRED to PG-6
-- per PG-4.1 Design D §4.4 — no invented roles/permissions here.
--
-- school_settings receives ONLY the approved generic 1-row placeholder
-- (id=1, name 'Kayan School ERP', empty contact fields, no Al-Salam/Yemen
-- values), matching D3 §3.2. Inserted via ON CONFLICT (id) DO NOTHING so
-- re-applying is idempotent.
-- ============================================================================

-- 1. SCHOOL SETTINGS (generic 1-row placeholder; NOT Al-Salam-specific)
CREATE TABLE IF NOT EXISTS school_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
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
    enable_sms_alerts SMALLINT DEFAULT 1,
    enable_ai_analysis SMALLINT DEFAULT 1,
    attendance_lock_hour TEXT DEFAULT '09:00'
);

INSERT INTO school_settings (
    id, school_name, name_en, phone, email, address, website, admin_name,
    academic_year, current_term, logo_url, primary_color,
    enable_sms_alerts, enable_ai_analysis, attendance_lock_hour
) VALUES (
    1, 'Kayan School ERP', 'Kayan School ERP', '', '', '', NULL, NULL,
    '', '', NULL, NULL,
    1, 1, '09:00'
)
ON CONFLICT (id) DO NOTHING;

-- 2. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. ROLES (RBAC base — EMPTY, seed deferred to PG-6)
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT,
    name_en TEXT,
    is_system SMALLINT DEFAULT 0,
    is_active SMALLINT DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. PERMISSIONS (RBAC base — EMPTY, seed deferred to PG-6)
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    scope TEXT,
    description TEXT,
    is_active SMALLINT DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. USER <-> ROLE JUNCTION (RBAC base — EMPTY, seed deferred to PG-6)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 6. ROLE <-> PERMISSION JUNCTION (RBAC base — EMPTY, seed deferred to PG-6)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================================================
-- Security / organization indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- ROLLBACK (reverse FK order)
--   DROP TABLE IF EXISTS user_roles, role_permissions, audit_logs,
--     school_settings, roles, permissions CASCADE;
-- ============================================================================
