#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * apply-postgres-migrations.mjs
 * ----------------------------------------------------------------------------
 * Idempotent PostgreSQL migration runner for Kayan School ERP (PG-4.2+).
 *
 * Reads connection details EXCLUSIVELY from the environment
 * (DATABASE_URL, or PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE / PGSSL).
 * The password is NEVER logged, asserted, or printed.
 *
 * Behavior:
 *   * Ensures the `schema_migrations` ledger exists.
 *   * Applies every `migrations/postgres/<version>_*.sql` file in numeric order,
 *     skipping any whose version is already recorded (unless --force).
 *   * Each file is run inside a single transaction; on success the version is
 *     recorded. Files use IF NOT EXISTS / ON CONFLICT DO NOTHING, so re-running
 *     the whole set is safe (requirement C: idempotency).
 *
 * Usage:
 *   node scripts/apply-postgres-migrations.mjs [--force]
 */

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', 'postgres');
const FORCE = process.argv.includes('--force');

/** Build the pg PoolConfig from the environment (mirrors postgresConfig.ts). */
function getConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  const ssl = process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined;
  return {
    host: process.env.PGHOST ?? 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl,
  };
}

/**
 * Split a SQL file into individual statements on top-level semicolons,
 * ignoring semicolons inside line/block comments and single-quoted strings.
 * Comment-only / blank chunks are dropped.
 */
function splitStatements(sql) {
  const stmts = [];
  let cur = '';
  let inLine = false;
  let inBlock = false;
  let inStr = false;
  const n = sql.length;
  for (let i = 0; i < n; i++) {
    const ch = sql[i];
    const next = i + 1 < n ? sql[i + 1] : '';
    if (inLine) {
      if (ch === '\n') { inLine = false; cur += ch; }
      else cur += ch;
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') { inBlock = false; cur += '*/'; i++; continue; }
      cur += ch; continue;
    }
    if (inStr) {
      if (ch === "'") {
        if (next === "'") { cur += "''"; i++; continue; }
        inStr = false; cur += ch; continue;
      }
      cur += ch; continue;
    }
    if (ch === '-' && next === '-') { inLine = true; cur += '--'; i++; continue; }
    if (ch === '/' && next === '*') { inBlock = true; cur += '/*'; i++; continue; }
    if (ch === "'") { inStr = true; cur += ch; continue; }
    if (ch === ';') {
      if (cur.trim()) stmts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts.filter(
    (s) => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().length > 0
  );
}

/** Leading numeric version prefix, e.g. "002_master_data.sql" -> "002". */
function versionOf(filename) {
  const m = /^(\d+)_/.exec(filename);
  return m ? m[1] : null;
}

async function main() {
  const pool = new Pool(getConfig());
  let client;
  try {
    client = await pool.connect();

    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version TEXT PRIMARY KEY,
         description TEXT NOT NULL,
         applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`
    );

    const applied = new Set(
      (await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version)
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^(\d+)_.*\.sql$/.test(f))
      .sort();

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const version = versionOf(file);
      if (!version) {
        console.warn(`! Skipping unversioned file: ${file}`);
        continue;
      }
      if (applied.has(version) && !FORCE) {
        skippedCount++;
        continue;
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      const statements = splitStatements(sql);

      try {
        await client.query('BEGIN');
        for (const stmt of statements) {
          await client.query(stmt);
        }
        await client.query(
          'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [version, file]
        );
        await client.query('COMMIT');
        appliedCount++;
        console.log(`✓ Applied ${version} (${file})`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed ${version} (${file}): ${err.message}`);
        throw err;
      }
    }

    console.log(`\nMigration run complete: ${appliedCount} applied, ${skippedCount} skipped.`);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration runner aborted:', err.message);
  process.exit(1);
});
