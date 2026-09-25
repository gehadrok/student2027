-- ============================================================================
-- Migration 005: Finance runtime tables (PG-4.3)
-- Kayan School ERP — PostgreSQL
-- ----------------------------------------------------------------------------
-- Port of the canonical runtime finance tables (src/lib/sqlite-schema.sql):
--   * fee_payments   (NEW runtime)
--   * expense_records (NEW runtime)
-- Plus restatements of the three finance MASTER tables that already live in
-- 002_master_data (fee_categories, payment_methods, discount_types) using
-- IF NOT EXISTS. They are restated here so this Layer-5 file is
-- self-documenting; re-applying over an existing kayan_school_erp is a no-op
-- for them (their authoritative definition remains 002).
--
-- Type policy (D7/D8/D9): money -> NUMERIC(18,2); flags -> SMALLINT;
-- created_at -> TIMESTAMP. Additive / idempotent. No seed data.
-- ============================================================================

-- 1. FEE CATEGORIES (restated from 002 — no-op if present)
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

-- 2. PAYMENT METHODS (restated from 002 — no-op if present)
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

-- 3. DISCOUNT TYPES (restated from 002 — no-op if present)
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

-- 4. FEE PAYMENTS & TUITION (NEW runtime)
CREATE TABLE IF NOT EXISTS fee_payments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    receipt_number TEXT UNIQUE,
    title TEXT NOT NULL,
    total_amount NUMERIC(18,2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining_amount NUMERIC(18,2) NOT NULL CHECK (remaining_amount >= 0),
    due_date TEXT NOT NULL,
    paid_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'overdue', 'partial', 'unpaid')),
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 5. EXPENSE RECORDS (NEW runtime)
CREATE TABLE IF NOT EXISTS expense_records (
    id TEXT PRIMARY KEY,
    voucher_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('رواتب مكافآت', 'صيانة ومرافق', 'مستلزمات مدرسية', 'أنشطة وفعاليات', 'أخرى')),
    title TEXT NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    date TEXT NOT NULL,
    beneficiary TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Finance indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_fee_categories_parent ON fee_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt ON fee_payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_expense_records_voucher ON expense_records(voucher_number);

-- ============================================================================
-- ROLLBACK (reverse FK order)
--   DROP TABLE IF EXISTS fee_payments, expense_records,
--     discount_types, payment_methods, fee_categories CASCADE;
-- ============================================================================
