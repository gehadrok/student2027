/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structural validation of the PostgreSQL migration files (PG-2B).
 * No live PostgreSQL server is required; this only checks that the DDL is
 * well-formed for the migration framework and free of SQLite-only constructs.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/postgres', import.meta.url));

function loadMigrationFiles(): Array<{ name: string; sql: string }> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.map((name) => ({
    name,
    sql: readFileSync(join(MIGRATIONS_DIR, name), 'utf8'),
  }));
}

describe('PostgreSQL pilot migrations (structural)', () => {
  const files = loadMigrationFiles();
  const combined = files.map((f) => f.sql).join('\n');

  it('has at least one migration file', () => {
    assert.ok(files.length >= 1, 'expected migration files under migrations/postgres/');
  });

  for (const file of files) {
    it(`[${file.name}] is non-empty and defines tables or seeds data`, () => {
      assert.ok(file.sql.trim().length > 0, `${file.name} is empty`);
      assert.ok(
        /CREATE\s+TABLE/i.test(file.sql) || /INSERT\s+INTO/i.test(file.sql),
        `${file.name} defines neither tables nor seed data`
      );
    });

    it(`[${file.name}] contains no SQLite-only constructs`, () => {
      assert.ok(!/\bAUTOINCREMENT\b/i.test(file.sql), `${file.name} uses AUTOINCREMENT`);
      assert.ok(!/\bINSERT\s+OR\s+(REPLACE|IGNORE)\b/i.test(file.sql), `${file.name} uses INSERT OR *`);
      assert.ok(!/\bPRAGMA\b/i.test(file.sql), `${file.name} uses PRAGMA`);
      assert.ok(!/\bDATETIME\b/i.test(file.sql), `${file.name} uses DATETIME (use TIMESTAMP)`);
      assert.ok(!/\bREAL\b/i.test(file.sql), `${file.name} uses REAL (use NUMERIC)`);
      assert.ok(!/\?/.test(file.sql), `${file.name} contains bind placeholders`);
    });
  }

  it('the migration set as a whole uses native PG smallint/timestamp/money types', () => {
    assert.ok(/\bSMALLINT\b/i.test(combined), 'expected SMALLINT flag columns somewhere (D7)');
    assert.ok(/\bNUMERIC\s*\(\s*18\s*,\s*2\s*\)/i.test(combined), 'expected NUMERIC(18,2) somewhere (D9)');
    assert.ok(/\bTIMESTAMP\b/i.test(combined), 'expected TIMESTAMP somewhere (D8)');
  });

  it('all FK references resolve to a declared table', () => {
    // Strip comments so prose like "references `school_classes`" in a note is
    // not mistaken for a real FOREIGN KEY constraint.
    const noComments = combined
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/--[^\n]*/g, '');
    const created = new Set<string>();
    const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/gi;
    let m: RegExpExecArray | null;
    while ((m = createRe.exec(noComments)) !== null) created.add(m[1].toLowerCase());

    const refRe = /REFERENCES\s+[`"]?(\w+)[`"]?/gi;
    let r: RegExpExecArray | null;
    const missing: string[] = [];
    while ((r = refRe.exec(noComments)) !== null) {
      if (!created.has(r[1].toLowerCase())) missing.push(r[1]);
    }
    assert.deepStrictEqual(missing, [], `FK references missing tables: ${missing.join(', ')}`);
  });

  it('declares the pilot-scope tables', () => {
    for (const t of [
      'academic_years',
      'academic_terms',
      'subjects_master',
      'academic_calendar_days',
      'education_stages',
      'grade_levels',
    ]) {
      const re = new RegExp('CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?' + t + '\\b', 'i');
      assert.ok(re.test(combined), `missing table ${t}`);
    }
  });

  it('declares all 25 PG-4.3 runtime tables (no SQLite-only constructs)', () => {
    const pg43 = [
      'users', 'teachers', 'parents', 'school_classes', 'sections', 'students',
      'teacher_subjects', 'teacher_classes', 'parent_students', 'user_linked_students',
      'fee_payments', 'expense_records',
      'attendance_records', 'grade_records', 'certificates', 'library_books',
      'book_borrowings', 'app_notifications', 'saved_reports',
      'school_settings', 'audit_logs', 'roles', 'permissions', 'user_roles', 'role_permissions',
    ];
    for (const t of pg43) {
      const re = new RegExp('CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?' + t + '\\b', 'i');
      assert.ok(re.test(combined), `missing PG-4.3 table ${t}`);
    }
  });
});
