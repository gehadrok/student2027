/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for the PostgreSQL dialect helpers (PG-2A). No live PostgreSQL
 * server is required.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  toPostgresPlaceholders,
  countSqlPlaceholders,
  convertInsertOrIgnore,
  convertInsertOrReplace,
  resolveConflictTarget,
  preparePostgresStatement,
  DEFAULT_CONFLICT_TARGETS,
} from './sqlDialect';

describe('toPostgresPlaceholders', () => {
  it('converts ? to $1, $2, ... preserving order', () => {
    assert.strictEqual(
      toPostgresPlaceholders('SELECT * FROM t WHERE a = ? AND b = ? AND c = ?'),
      'SELECT * FROM t WHERE a = $1 AND b = $2 AND c = $3',
    );
  });

  it('counts placeholders correctly', () => {
    assert.strictEqual(countSqlPlaceholders('INSERT INTO t (a,b,c) VALUES (?,?,?)'), 3);
    assert.strictEqual(countSqlPlaceholders('SELECT 1'), 0);
  });

  it('skips ? inside single-quoted string literals', () => {
    const sql = `SELECT 'is this a ? param' AS note, id = ?`;
    assert.strictEqual(toPostgresPlaceholders(sql), `SELECT 'is this a ? param' AS note, id = $1`);
    assert.strictEqual(countSqlPlaceholders(sql), 1);
  });

  it('skips ? inside escaped quotes within a string literal', () => {
    const sql = `SELECT 'a ''?'' b' AS note, col = ?`;
    assert.strictEqual(toPostgresPlaceholders(sql), `SELECT 'a ''?'' b' AS note, col = $1`);
    assert.strictEqual(countSqlPlaceholders(sql), 1);
  });

  it('skips ? inside -- line comments', () => {
    const sql = `SELECT * FROM t WHERE id = ? -- filter ? here\n  AND x = ?`;
    assert.strictEqual(
      toPostgresPlaceholders(sql),
      `SELECT * FROM t WHERE id = $1 -- filter ? here\n  AND x = $2`,
    );
  });

  it('skips ? inside /* block comments */', () => {
    const sql = `SELECT * /* why ? here */ FROM t WHERE id = ?`;
    assert.strictEqual(toPostgresPlaceholders(sql), `SELECT * /* why ? here */ FROM t WHERE id = $1`);
  });
});

describe('convertInsertOrIgnore', () => {
  it('adds ON CONFLICT DO NOTHING after VALUES', () => {
    const out = convertInsertOrIgnore(
      'INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)',
    );
    assert.strictEqual(
      out,
      'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
    );
  });

  it('is a no-op for normal INSERT', () => {
    assert.strictEqual(convertInsertOrIgnore('INSERT INTO t (a) VALUES (?)'), 'INSERT INTO t (a) VALUES (?)');
  });
});

describe('convertInsertOrReplace', () => {
  it('builds ON CONFLICT ... DO UPDATE SET from column list', () => {
    const out = convertInsertOrReplace(
      'INSERT OR REPLACE INTO teachers (id, name, active) VALUES (?, ?, ?)',
      ['id'],
    );
    assert.strictEqual(
      out,
      'INSERT INTO teachers (id, name, active) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active',
    );
    assert.ok(!/\bOR REPLACE\b/.test(out));
  });

  it('uses DO NOTHING when only conflict columns exist', () => {
    const out = convertInsertOrReplace('INSERT OR REPLACE INTO t (id) VALUES (?)', ['id']);
    assert.ok(/ON CONFLICT \(id\) DO NOTHING/.test(out));
  });

  it('returns stripped statement when column list cannot be parsed', () => {
    const out = convertInsertOrReplace('INSERT OR REPLACE INTO t VALUES (?)', ['id']);
    assert.strictEqual(out, 'INSERT INTO t VALUES (?)');
  });

  it('resolves default conflict target per table', () => {
    assert.deepStrictEqual(resolveConflictTarget('INSERT OR REPLACE INTO students (id, x) VALUES (?, ?)'), ['id']);
    assert.deepStrictEqual(resolveConflictTarget('INSERT OR REPLACE INTO unknown (id) VALUES (?)'), ['id']);
  });

  it('exposes conflict targets for the known OR REPLACE tables', () => {
    assert.deepStrictEqual(DEFAULT_CONFLICT_TARGETS.teachers, ['id']);
    assert.deepStrictEqual(DEFAULT_CONFLICT_TARGETS.students, ['id']);
    assert.deepStrictEqual(DEFAULT_CONFLICT_TARGETS.fee_payments, ['id']);
    assert.deepStrictEqual(DEFAULT_CONFLICT_TARGETS.expense_records, ['id']);
  });
});

describe('preparePostgresStatement (full pipeline)', () => {
  it('converts placeholders and keeps param count aligned', () => {
    const { sql, params } = preparePostgresStatement(
      'INSERT OR REPLACE INTO teachers (id, name, is_active) VALUES (?, ?, ?)',
      ['t1', 'Bob', 1],
    );
    assert.strictEqual(
      sql,
      'INSERT INTO teachers (id, name, is_active) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active',
    );
    // Params are passed through unchanged (SMALLINT columns accept 0/1 directly).
    assert.deepStrictEqual(params, ['t1', 'Bob', 1]);
  });

  it('keeps a plain statement idempotent on re-run', () => {
    const once = preparePostgresStatement('SELECT * FROM t WHERE id = ?', ['x']);
    const twice = preparePostgresStatement(once.sql, once.params);
    assert.strictEqual(twice.sql, once.sql);
    assert.deepStrictEqual(twice.params, once.params);
  });

  it('does not alter a statement that already uses $N', () => {
    const { sql } = preparePostgresStatement('SELECT * FROM t WHERE id = $1', ['x']);
    assert.strictEqual(sql, 'SELECT * FROM t WHERE id = $1');
  });

  it('leaves is_active = 1 comparisons untouched (SMALLINT semantics)', () => {
    const { sql } = preparePostgresStatement('SELECT * FROM t WHERE is_active = 1', []);
    assert.strictEqual(sql, 'SELECT * FROM t WHERE is_active = 1');
  });
});
