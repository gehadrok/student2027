-- ============================================================================
-- Migration 000: Migration framework foundation (schema_migrations ledger)
-- Kayan School ERP — PostgreSQL (PG-4.2)
-- ----------------------------------------------------------------------------
-- Creates the idempotent ledger used by the migration runner
-- (scripts/apply-postgres-migrations.mjs) to track which migrations have been
-- applied. Every later migration file is additive (CREATE TABLE IF NOT EXISTS /
-- INSERT ... ON CONFLICT DO NOTHING) so the whole set is safe to re-apply.
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
