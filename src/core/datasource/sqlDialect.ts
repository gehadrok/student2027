/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PostgreSQL SQL dialect helpers for the Kayan School ERP PostgreSQL
 * migration (PG-2).
 *
 * These are PURE functions (no database connection) so they can be unit-tested
 * without a live PostgreSQL server.
 *
 * Design note (PG-2 boundary translation):
 * The application repositories were written against SQLite and emit SQLite-style
 * SQL (placeholder params, INSERT OR IGNORE/REPLACE). PostgreSQLDataSource
 * routes every statement through preparePostgresStatement so the repositories
 * themselves do NOT need dialect-specific branches. This keeps the IDataSource
 * abstraction intact and guarantees SQLite keeps working unchanged.
 *
 * Type-mapping policy (finalized D7 / D8 / D9):
 *   * boolean-like flags  -> SMALLINT (preserves existing SQLite 0/1 semantics;
 *     no boolean coercion is performed because 0/1 is valid for SMALLINT in
 *     both engines).
 *   * timestamps          -> TIMESTAMP (preserves stored UTC values without
 *     introducing timezone conversion).
 *   * monetary / decimal  -> NUMERIC(18,2) (exact financial precision).
 * Therefore the only required runtime transforms are placeholder conversion
 * and INSERT OR IGNORE / INSERT OR REPLACE handling.
 */

/**
 * Default conflict target (primary key columns) used when translating
 * INSERT OR REPLACE. Every repository that currently uses INSERT OR REPLACE has
 * a single `id` TEXT primary key, so `id` is the safe default. Join tables that
 * use INSERT OR IGNORE rely on ON CONFLICT DO NOTHING (no explicit target)
 * instead and are not listed here.
 */
export const DEFAULT_CONFLICT_TARGETS: Record<string, string[]> = {
  teachers: ['id'],
  students: ['id'],
  fee_payments: ['id'],
  expense_records: ['id'],
  // Composite-PK junction tables (PG-4.1 §2.3): these are only ever written via
  // INSERT OR IGNORE (ON CONFLICT DO NOTHING), so an explicit target is not
  // required; they are listed here for mechanical completeness/auditability.
  // Column order matches the live schema's composite primary keys exactly.
  teacher_subjects: ['teacher_id', 'subject_id'],
  teacher_classes: ['teacher_id', 'class_id'],
  parent_students: ['parent_id', 'student_id'],
  user_linked_students: ['user_id', 'student_id'],
  // RBAC composite-PK junction tables. Not yet written by repositories (the
  // 14 baseline roles are seeded in PG-6), but listed here so a future
  // INSERT OR REPLACE against them resolves to the real composite key instead
  // of the default `id` (which does not exist on these tables). Columns match
  // the live schema's composite primary keys exactly.
  user_roles: ['user_id', 'role_id'],
  role_permissions: ['role_id', 'permission_id'],
};

/**
 * Walk the SQL string and invoke onPlaceholder(index) for every `?` that is NOT
 * inside a single-quoted string literal or a `--` line / block comment. Shared so
 * placeholder counting and conversion stay consistent.
 */
function walkPlaceholders(sql: string, onPlaceholder: (index: number) => void): void {
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  const n = sql.length;
  let i = 0;
  while (i < n) {
    const ch = sql[i];
    const next = i + 1 < n ? sql[i + 1] : '';
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') inBlockComment = false;
      i++;
      continue;
    }
    if (inString) {
      if (ch === "'") {
        if (next === "'") {
          i += 2;
          continue;
        }
        inString = false;
      }
      i++;
      continue;
    }
    if (ch === "'") {
      inString = true;
      i++;
      continue;
    }
    if (ch === '-' && next === '-') {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '?') {
      onPlaceholder(i);
    }
    i++;
  }
}

/**
 * Count the number of bindable `?` placeholders outside string literals and
 * comments. Used to validate that the converted statement still has exactly the
 * same number of parameters as the caller supplied.
 */
export function countSqlPlaceholders(sql: string): number {
  let count = 0;
  walkPlaceholders(sql, () => {
    count++;
  });
  return count;
}

/**
 * Convert SQLite `?` positional placeholders to PostgreSQL `$1, $2, ...`.
 * Parameter ordering is preserved exactly. `?` characters that appear inside
 * single-quoted string literals or inside comments are left untouched.
 */
export function toPostgresPlaceholders(sql: string): string {
  let result = '';
  let param = 0;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  const n = sql.length;
  let i = 0;
  while (i < n) {
    const ch = sql[i];
    const next = i + 1 < n ? sql[i + 1] : '';
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      result += ch;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') inBlockComment = false;
      result += ch;
      i++;
      continue;
    }
    if (inString) {
      if (ch === "'") {
        if (next === "'") {
          result += "''";
          i += 2;
          continue;
        }
        inString = false;
      }
      result += ch;
      i++;
      continue;
    }
    if (ch === "'") {
      inString = true;
      result += ch;
      i++;
      continue;
    }
    if (ch === '-' && next === '-') {
      inLineComment = true;
      result += '--';
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      result += '/*';
      i += 2;
      continue;
    }
    if (ch === '?') {
      param++;
      result += `$${param}`;
      i++;
      continue;
    }
    result += ch;
    i++;
  }
  return result;
}

/**
 * Convert SQLite `INSERT OR IGNORE INTO t (...) VALUES (...)` into PostgreSQL
 * `INSERT INTO t (...) VALUES (...) ON CONFLICT DO NOTHING`.
 *
 * Semantics are preserved: SQLite INSERT OR IGNORE silently skips the row when
 * ANY uniqueness / primary-key constraint would be violated, and PostgreSQL
 * ON CONFLICT DO NOTHING (without an explicit target) does exactly that.
 *
 * PostgreSQL requires ON CONFLICT to appear AFTER the VALUES list.
 */
export function convertInsertOrIgnore(sql: string): string {
  if (!/\bINSERT\s+OR\s+IGNORE\b/i.test(sql)) return sql;
  const stripped = sql.replace(/\bINSERT\s+OR\s+IGNORE\b/i, 'INSERT');
  return stripped.replace(/(\s*)\)$/, '$1) ON CONFLICT DO NOTHING');
}

function extractInsertColumns(sql: string): string[] | null {
  const m = /INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+[`"]?\w+[`"]?\s*\(([^)]*)\)\s*VALUES/i.exec(sql);
  if (!m) return null;
  return m[1]
    .split(',')
    .map((c) => c.trim().replace(/^[`"]|[`"]$/g, ''))
    .filter(Boolean);
}

function extractInsertTable(sql: string): string | null {
  const tm = /INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+[`"]?(\w+)[`"]?/i.exec(sql);
  return tm ? tm[1] : null;
}

/**
 * Convert SQLite `INSERT OR REPLACE INTO t (cols) VALUES (...)` into PostgreSQL
 * `INSERT INTO t (cols) VALUES (...) ON CONFLICT (conflictCols) DO UPDATE SET
 * <all non-conflict cols> = EXCLUDED.<col>`.
 *
 * This is an EXPLICIT, non-blind conversion: the caller supplies the conflict
 * target (the primary key / unique columns) and the SET clause is derived from
 * the parsed column list. If the column list cannot be parsed, the statement is
 * returned with OR REPLACE removed but WITHOUT an ON CONFLICT clause, so the
 * caller can detect the unsupported shape.
 *
 * Behavioral note: SQLite INSERT OR REPLACE deletes and re-inserts the row (so
 * any column with a DEFAULT would be reset), whereas ON CONFLICT DO UPDATE only
 * changes the listed columns. Columns that are intentionally excluded from the
 * INSERT column list (e.g. created_at) are preserved on update — which matches
 * the expected "update should not reset creation metadata" behavior.
 */
export function convertInsertOrReplace(sql: string, conflictColumns: string[]): string {
  if (!/\bINSERT\s+OR\s+REPLACE\b/i.test(sql)) return sql;
  const stripped = sql.replace(/\bINSERT\s+OR\s+REPLACE\b/i, 'INSERT');
  const cols = extractInsertColumns(stripped);
  const conflict = conflictColumns.map((c) => c.trim());
  if (!cols) {
    return stripped;
  }
  const setCols = cols.filter((c) => !conflict.includes(c));
  const conflictClause = conflict.join(', ');
  if (setCols.length === 0) {
    return stripped.replace(/(\s*)\)$/, `$1) ON CONFLICT (${conflictClause}) DO NOTHING`);
  }
  const setClause = setCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  return stripped.replace(
    /(\s*)\)$/,
    `$1) ON CONFLICT (${conflictClause}) DO UPDATE SET ${setClause}`,
  );
}

/**
 * Resolve the conflict target for an INSERT OR REPLACE statement from
 * DEFAULT_CONFLICT_TARGETS (keyed by table name), defaulting to ['id'].
 */
export function resolveConflictTarget(sql: string): string[] {
  const table = extractInsertTable(sql);
  if (table && DEFAULT_CONFLICT_TARGETS[table]) {
    return DEFAULT_CONFLICT_TARGETS[table];
  }
  return ['id'];
}

/**
 * Full pipeline applied by PostgreSQLDataSource to every statement.
 *
 * 1. Convert INSERT OR IGNORE -> ON CONFLICT DO NOTHING.
 * 2. Convert INSERT OR REPLACE -> ON CONFLICT (...) DO UPDATE SET ... using the
 *    resolved conflict target.
 * 3. Convert `?` placeholders to PostgreSQL `$N`.
 *
 * The returned sql is PostgreSQL-ready. The function is idempotent (re-running
 * on a string that already uses $N leaves it unchanged because no `?` remain).
 */
export function preparePostgresStatement(
  sql: string,
  params: unknown[] = [],
): { sql: string; params: unknown[] } {
  let semantic = convertInsertOrIgnore(sql);
  if (/\bINSERT\s+OR\s+REPLACE\b/i.test(semantic)) {
    semantic = convertInsertOrReplace(semantic, resolveConflictTarget(semantic));
  }
  const pgSql = toPostgresPlaceholders(semantic);
  return { sql: pgSql, params: params.slice() };
}
