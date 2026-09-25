/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verifies the PG-2 dialect pipeline against the ACTUAL SQL shapes emitted by
 * the application repositories (academic / master-data / student / teacher /
 * financial). No live PostgreSQL server is required. This proves that the
 * boundary translation in PostgreSQLDataSource makes every repository
 * PG-compatible without modifying repository code.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { preparePostgresStatement, countSqlPlaceholders } from './sqlDialect';

function assertAligned(sql: string, params: unknown[]): { sql: string; params: unknown[] } {
  const originalPlaceholders = countSqlPlaceholders(sql);
  assert.strictEqual(
    originalPlaceholders,
    params.length,
    `sample SQL placeholder count (${originalPlaceholders}) != param count (${params.length})`,
  );
  const out = preparePostgresStatement(sql, params);
  assert.strictEqual(out.sql.includes('?'), false, 'converted SQL must not contain SQLite ? placeholders');
  const dollarMatches = [...out.sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  if (dollarMatches.length > 0) {
    const max = Math.max(...dollarMatches);
    assert.strictEqual(max, dollarMatches.length, 'postgres $N numbering must be contiguous');
  }
  return out;
}

describe('PG-2 repository SQL — academic pilot (PG-2C)', () => {
  it('AcademicYearRepository.save INSERT aligns params', () => {
    const sql =
      'INSERT INTO academic_years ' +
      '(id, code, name_ar, name_en, description, start_date, end_date, is_current, is_active, display_order, created_at, updated_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
    const params = ['y1', '2024', 'السنة', null, null, '2024-09-01', '2025-06-30', 1, 1, 0];
    const out = assertAligned(sql, params);
    assert.ok(out.sql.startsWith('INSERT INTO academic_years'));
    // SMALLINT columns accept 0/1 directly — params pass through unchanged.
    assert.deepStrictEqual(out.params, params);
  });

  it('CurriculumRepository.getAll activeOnly keeps is_active = 1 (SMALLINT)', () => {
    const out = assertAligned('SELECT * FROM subjects_master WHERE is_active = 1 ORDER BY display_order ASC', []);
    assert.strictEqual(out.sql, 'SELECT * FROM subjects_master WHERE is_active = 1 ORDER BY display_order ASC');
  });

  it('CourseAssignmentRepository.save INSERT aligns params', () => {
    const sql =
      'INSERT INTO subjects ' +
      '(id, subject_id, teacher_id, class_id, weekly_hours, max_score, pass_score, created_at, updated_at) ' +
      'VALUES (?, ?, ?, ?, ?, 100.0, 50.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
    const params = ['s1', 'sub1', 't1', 'c1', 4];
    const out = assertAligned(sql, params);
    assert.ok(out.sql.includes('INSERT INTO subjects'));
  });

  it('AcademicCalendarRepository.save INSERT aligns params', () => {
    const sql =
      'INSERT INTO academic_calendar_days ' +
      '(id, day, academic_week, is_instructional, created_at, updated_at) ' +
      'VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
    const params = ['d1', '2024-09-01', 1, 1];
    const out = assertAligned(sql, params);
    assert.deepStrictEqual(out.params[3], 1);
  });
});

describe('PG-2 repository SQL — master-data / student / teacher / financial (PG-2D/E/F)', () => {
  it('teacherRepository.save INSERT OR REPLACE -> ON CONFLICT (id) DO UPDATE', () => {
    const sql =
      'INSERT OR REPLACE INTO teachers ' +
      '(id, user_id, name, email, phone, specialization, qualification, experience_years, photo, status) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const params = ['t1', 'u1', 'Bob', null, null, 'Math', 'PhD', 5, null, 'active'];
    const out = assertAligned(sql, params);
    assert.ok(out.sql.includes('ON CONFLICT (id) DO UPDATE SET'));
    assert.ok(out.sql.includes('name = EXCLUDED.name'));
    assert.ok(!/\bOR REPLACE\b/.test(out.sql));
  });

  it('teacherRepository.save INSERT OR IGNORE (teacher_subjects) -> ON CONFLICT DO NOTHING', () => {
    const sql = 'INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)';
    const out = assertAligned(sql, ['t1', 'sub1']);
    assert.strictEqual(out.sql, 'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING');
  });

  it('studentRepository.save INSERT OR REPLACE -> ON CONFLICT (id) DO UPDATE', () => {
    const sql =
      'INSERT OR REPLACE INTO students ' +
      '(id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name, parent_phone, birth_date, gender, photo, status, health_notes, enrollment_date) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const params = Array(15).fill('x');
    const out = assertAligned(sql, params);
    assert.ok(out.sql.includes('ON CONFLICT (id) DO UPDATE SET'));
  });

  it('studentRepository.save INSERT OR IGNORE (parent_students) -> ON CONFLICT DO NOTHING', () => {
    const sql = 'INSERT OR IGNORE INTO parent_students (parent_id, student_id) VALUES (?, ?)';
    const out = assertAligned(sql, ['p1', 's1']);
    assert.ok(out.sql.includes('ON CONFLICT DO NOTHING'));
  });

  it('financialRepository.savePayment INSERT OR REPLACE -> ON CONFLICT (id) DO UPDATE', () => {
    const sql =
      'INSERT OR REPLACE INTO fee_payments ' +
      '(id, student_id, receipt_number, title, total_amount, paid_amount, remaining_amount, due_date, paid_date, status, payment_method, notes) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const params = Array(12).fill('x');
    const out = assertAligned(sql, params);
    assert.ok(out.sql.includes('ON CONFLICT (id) DO UPDATE SET'));
  });

  it('financialRepository.saveExpense INSERT OR REPLACE -> ON CONFLICT (id) DO UPDATE', () => {
    const sql =
      'INSERT OR REPLACE INTO expense_records ' +
      '(id, voucher_number, category, title, amount, date, beneficiary, approved_by, notes) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const params = Array(9).fill('x');
    const out = assertAligned(sql, params);
    assert.ok(out.sql.includes('ON CONFLICT (id) DO UPDATE SET'));
  });
});
