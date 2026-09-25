/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-4 live SQL sweep (B3):
 *   - Full migration set is idempotent (table row counts are stable after a
 *     second apply).
 *   - No orphaned foreign-key rows exist in any table (referential integrity).
 *   - The financial ledger is internally consistent (paid + remaining = total,
 *     all monetary values non-negative, expense amounts positive).
 *
 * Requires a live PostgreSQL 16 instance (PGHOST / PGUSER / PGPASSWORD /
 * PGDATABASE). Skipped when not configured.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { getPostgresConfig } from './postgresConfig';
import { PostgreSQLDataSource } from './PostgreSQLDataSource';

const PG_CONFIGURED = Boolean(
  process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD
);
const describePg = PG_CONFIGURED ? describe : describe.skip;

process.env.PGDATABASE = process.env.PG_TEST_DATABASE ?? 'kayan_school_erp';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../migrations/postgres', import.meta.url));

function splitSqlStatements(sql: string): string[] {
  const stmts: string[] = [];
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
      cur = ''; continue;
    }
    cur += ch;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts.filter((s) => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().length > 0);
}

async function applyMigrations(ds: PostgreSQLDataSource): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    for (const stmt of splitSqlStatements(sql)) {
      await ds.execute(stmt);
    }
  }
}

interface Fk {
  child: string;
  childcol: string;
  parent: string;
  parentcol: string;
}

let ds: PostgreSQLDataSource;

async function getAllTables(): Promise<string[]> {
  const rows = await ds.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return rows.map((r) => r.table_name);
}

async function getTableCounts(): Promise<Record<string, number>> {
  const tables = await getAllTables();
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const rows = await ds.query<{ c: string | number }>(`SELECT COUNT(*) AS c FROM "${t}"`);
    counts[t] = Number(rows[0].c);
  }
  return counts;
}

describePg('PG-4 live SQL sweep (B3)', () => {
  before(async () => {
    ds = new PostgreSQLDataSource(await getPostgresConfig());
    await applyMigrations(ds);
  });

  after(async () => {
    if (ds) await ds.close();
  });

  it('full migration set is idempotent (row counts stable after re-apply)', async () => {
    const before = await getTableCounts();
    await applyMigrations(ds);
    const after = await getTableCounts();
    assert.deepEqual(after, before, 're-applying migrations must not change row counts');
  });

  it('no orphaned foreign-key rows in any table', async () => {
    const fks = await ds.query<Fk>(
      `SELECT cc.relname AS child, ca.attname AS childcol,
              pc.relname AS parent, pa.attname AS parentcol
       FROM pg_constraint k
       JOIN pg_class cc ON cc.oid = k.conrelid
       JOIN pg_class pc ON pc.oid = k.confrelid
       JOIN pg_attribute ca ON ca.attrelid = k.conrelid AND ca.attnum = ANY(k.conkey)
       JOIN pg_attribute pa ON pa.attrelid = k.confrelid AND pa.attnum = ANY(k.confkey)
       WHERE k.contype = 'f' AND cc.relnamespace = 'public'::regnamespace`
    );

    const failures: string[] = [];
    for (const fk of fks) {
      const rows = await ds.query<{ orphans: string | number }>(
        `SELECT COUNT(*) AS orphans FROM "${fk.child}" c
         LEFT JOIN "${fk.parent}" p ON c."${fk.childcol}" = p."${fk.parentcol}"
         WHERE c."${fk.childcol}" IS NOT NULL AND p."${fk.parentcol}" IS NULL`
      );
      const orphans = Number(rows[0].orphans);
      if (orphans !== 0) {
        failures.push(`${fk.child}.${fk.childcol} -> ${fk.parent}.${fk.parentcol}: ${orphans} orphan(s)`);
      }
    }
    assert.equal(failures.length, 0, `referential-integrity violations:\n${failures.join('\n')}`);
  });

  it('financial ledger is internally consistent', async () => {
    const bad = await ds.query<{ c: string | number }>(
      `SELECT COUNT(*) AS c FROM fee_payments
       WHERE paid_amount + remaining_amount <> total_amount
          OR paid_amount < 0 OR remaining_amount < 0 OR total_amount < 0`
    );
    assert.equal(Number(bad[0].c), 0, 'fee_payments ledger must balance and stay non-negative');

    const badExp = await ds.query<{ c: string | number }>(
      `SELECT COUNT(*) AS c FROM expense_records WHERE amount <= 0`
    );
    assert.equal(Number(badExp[0].c), 0, 'expense_records amounts must be positive');
  });
});
