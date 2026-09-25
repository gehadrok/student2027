-- ============================================================================
-- Migration 001: School Configuration (D3 minimum)
-- Kayan School ERP — PostgreSQL (PG-4.2)
-- ----------------------------------------------------------------------------
-- SCOPE #5 of PG-4.2 explicitly includes the minimum D3 School Configuration
-- surface. Per PG-4.1 Design C this is a SINGLE-TENANT bootstrap table: there is
-- NO school_id injection on operational tables and NO multi-tenancy. Each
-- physical deployment of the product targets exactly one school row.
--
-- Type policy (D7/D8/D9): flags -> SMALLINT, audit columns -> TIMESTAMP.
-- No Al-Salam / school-specific values are seeded (generic product seed only).
-- ============================================================================

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    status SMALLINT NOT NULL DEFAULT 1,
    locale TEXT NOT NULL DEFAULT 'ar',
    timezone TEXT,
    currency_code TEXT,
    academic_year TEXT,
    current_term TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    logo_url TEXT,
    primary_color TEXT,
    enable_sms_alerts SMALLINT NOT NULL DEFAULT 1,
    enable_ai_analysis SMALLINT NOT NULL DEFAULT 1,
    attendance_lock_hour TEXT DEFAULT '09:00',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);

-- Generic product bootstrap row. currency_code is intentionally NULL so the
-- deploying school configures its own base currency (no Al-Salam assumption).
INSERT INTO schools (id, code, name_ar, name_en, status, locale, currency_code)
VALUES ('school_kayan', 'KAYAN', 'Kayan School ERP', 'Kayan School ERP', 1, 'ar', NULL)
ON CONFLICT (id) DO NOTHING;
