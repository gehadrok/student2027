/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-4 live reconciliation (B1): exercises the real repository operations of
 * StudentRepository, TeacherRepository, FinancialRepository and
 * DashboardRepository against a live PostgreSQL instance through
 * PostgreSQLDataSource. This proves the IDataSource -> PostgreSQLDataSource
 * translation (placeholder conversion, INSERT OR REPLACE -> ON CONFLICT DO
 * UPDATE, INSERT OR IGNORE -> ON CONFLICT DO NOTHING) is correct end to end.
 *
 * The test inserts a small set of isolated temporary rows (prefixed `rec_`),
 * reconciles them through the repositories, and deletes them in FK-safe order
 * in `after`, leaving the database unchanged.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { getPostgresConfig } from './postgresConfig';
import { PostgreSQLDataSource } from './PostgreSQLDataSource';
import { StudentRepository } from '../../modules/students/repository/studentRepository';
import { TeacherRepository } from '../../modules/teachers/repository/teacherRepository';
import { FinancialRepository } from '../../modules/financial/repository/financialRepository';
import { DashboardRepository } from '../../modules/dashboard/repository/dashboardRepository';

const PG_CONFIGURED = Boolean(
  process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD
);
const describePg = PG_CONFIGURED ? describe : describe.skip;

// Always target the dedicated PG dev database, not the default env DB.
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

const ids = {
  user: 'rec_u1',
  teacher: 'rec_t1',
  class: 'rec_c1',
  subject: 'rec_sub1',
  section: 'rec_s1',
  parent: 'rec_p1',
  student: 'rec_st1',
  payment: 'rec_pay1',
  expense: 'rec_exp1',
};

let ds: PostgreSQLDataSource;

async function seedPrereq(): Promise<void> {
  await ds.execute(
    `INSERT INTO users (id,name,role,email,password_hash,phone,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,now(),now())`,
    [ids.user, 'Recon User', 'admin', `${ids.user}@recon.local`, 'x', '000', 'active']
  );
  await ds.execute(
    `INSERT INTO school_classes (id,name,level,created_at) VALUES (?,?,?,now())`,
    [ids.class, 'Recon Class rec_c1', 1]
  );
  // Seed the teacher before `subjects`, which references it via FK.
  await ds.execute(
    `INSERT INTO teachers (id,user_id,name,email,phone,specialization,qualification,experience_years,status,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,now())`,
    [ids.teacher, ids.user, 'Recon Teacher', `${ids.teacher}@recon.local`, '000', 'Math', 'BSc', 5, 'active']
  );
  await ds.execute(
    `INSERT INTO subjects (id,class_id,teacher_id,weekly_hours,max_score,pass_score,updated_at,created_at)
     VALUES (?,?,?,?,?,?,now(),now())`,
    [ids.subject, ids.class, ids.teacher, 5, 100, 50]
  );
  await ds.execute(
    `INSERT INTO sections (id,name,class_id,room_number,capacity,created_at) VALUES (?,?,?,?,?,now())`,
    [ids.section, 'Recon Sec rec_s1', ids.class, 'R1', 30]
  );
  await ds.execute(
    `INSERT INTO parents (id,user_id,name,email,phone,created_at) VALUES (?,?,?,?,?,now())`,
    [ids.parent, ids.user, 'Recon Parent', `${ids.parent}@recon.local`, '000']
  );
}

async function teardown(): Promise<void> {
  // Junction / child rows first, then the entities they reference.
  await ds.execute(`DELETE FROM teacher_subjects WHERE teacher_id = ?`, [ids.teacher]);
  await ds.execute(`DELETE FROM teacher_classes WHERE teacher_id = ?`, [ids.teacher]);
  await ds.execute(`DELETE FROM parent_students WHERE student_id = ?`, [ids.student]);
  await ds.execute(`DELETE FROM fee_payments WHERE id = ?`, [ids.payment]);
  await ds.execute(`DELETE FROM expense_records WHERE id = ?`, [ids.expense]);
  await ds.execute(`DELETE FROM students WHERE id = ?`, [ids.student]);
  await ds.execute(`DELETE FROM subjects WHERE id = ?`, [ids.subject]);
  await ds.execute(`DELETE FROM sections WHERE id = ?`, [ids.section]);
  await ds.execute(`DELETE FROM teachers WHERE id = ?`, [ids.teacher]);
  await ds.execute(`DELETE FROM school_classes WHERE id = ?`, [ids.class]);
  await ds.execute(`DELETE FROM parents WHERE id = ?`, [ids.parent]);
  await ds.execute(`DELETE FROM users WHERE id = ?`, [ids.user]);
}

describePg('PG-4.4 repository reconciliation against live PostgreSQL (B1)', () => {
  before(async () => {
    ds = new PostgreSQLDataSource(await getPostgresConfig());
    // Ensure the full schema (and generic seed) exists; idempotent.
    await applyMigrations(ds);
    // Remove any leftover rows from a previous interrupted run.
    await teardown();
    await seedPrereq();
  });

  after(async () => {
    await teardown();
    if (ds) await ds.close();
  });

  it('StudentRepository: create -> read -> update -> parent pairing -> delete', async () => {
    const repo = new StudentRepository(ds);
    const base: any = {
      id: ids.student,
      userId: ids.user,
      academicId: 'A1',
      name: 'Recon Student',
      classId: ids.class,
      sectionId: ids.section,
      parentId: ids.parent,
      parentName: 'P Name',
      parentPhone: '000',
      birthDate: '2010-01-01',
      gender: 'male',
      status: 'active',
      enrollmentDate: '2024-09-01',
    };

    await repo.save(base);
    assert.equal((await repo.getById(ids.student))?.name, 'Recon Student');

    await repo.save({ ...base, name: 'Recon Student UPD' });
    assert.equal((await repo.getById(ids.student))?.name, 'Recon Student UPD');

    const pairing = await ds.query(
      `SELECT 1 FROM parent_students WHERE parent_id = ? AND student_id = ?`,
      [ids.parent, ids.student]
    );
    assert.equal(pairing.length, 1, 'parent_students junction row should exist');
  });

  it('TeacherRepository: save reconciles teacher_subjects / teacher_classes junctions', async () => {
    const repo = new TeacherRepository(ds);
    const teacher: any = {
      id: ids.teacher,
      userId: ids.user,
      name: 'Recon Teacher',
      email: `${ids.teacher}@recon.local`,
      phone: '000',
      specialization: 'Math',
      qualification: 'BSc',
      experienceYears: 5,
      subjectIds: [ids.subject],
      classIds: [ids.class],
      status: 'active',
    };

    await repo.save(teacher);
    assert.equal((await repo.getById(ids.teacher))?.name, 'Recon Teacher');

    const ts = await ds.query(
      `SELECT 1 FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?`,
      [ids.teacher, ids.subject]
    );
    assert.equal(ts.length, 1, 'teacher_subjects junction row should exist');

    const tc = await ds.query(
      `SELECT 1 FROM teacher_classes WHERE teacher_id = ? AND class_id = ?`,
      [ids.teacher, ids.class]
    );
    assert.equal(tc.length, 1, 'teacher_classes junction row should exist');

    // Re-saving with a different subject set must replace (not duplicate) junctions.
    await repo.save({ ...teacher, subjectIds: [], classIds: [] });
    const tsAfter = await ds.query(
      `SELECT 1 FROM teacher_subjects WHERE teacher_id = ?`,
      [ids.teacher]
    );
    assert.equal(tsAfter.length, 0, 'subject junctions should be cleared on re-save');
  });

  it('FinancialRepository: fee_payment (ledger math) and expense persist', async () => {
    const repo = new FinancialRepository(ds);

    await repo.savePayment({
      id: ids.payment,
      studentId: ids.student,
      title: 'Tuition',
      totalAmount: 1000,
      paidAmount: 400,
      status: 'partial',
      dueDate: '2025-01-01',
      paymentMethod: 'cash',
    } as any);
    const payments = await repo.getAllPayments();
    const p = payments.find((x: any) => x.id === ids.payment);
    assert.ok(p, 'fee_payment should be persisted');
    assert.equal(p.remainingAmount, 600, 'remaining = total - paid');

    await repo.saveExpense({
      id: ids.expense,
      voucherNumber: 'V1',
      category: 'أخرى',
      title: 'Electricity',
      amount: 50,
      date: '2025-01-01',
      beneficiary: 'Utility Co',
      approvedBy: 'Admin',
    });
    const expenses = await repo.getAllExpenses();
    assert.ok(expenses.find((x: any) => x.id === ids.expense), 'expense should be persisted');
  });

  it('DashboardRepository: KPIs and settings read through the datasource', async () => {
    const dash = new DashboardRepository(
      new StudentRepository(ds),
      new TeacherRepository(ds),
      new FinancialRepository(ds),
      ds
    );

    const kpis = await dash.getKpis();
    assert.equal(typeof kpis.totalStudents, 'number');
    assert.equal(typeof kpis.totalTeachers, 'number');
    assert.equal(typeof kpis.totalRevenue, 'number');
    assert.equal(typeof kpis.totalExpenses, 'number');
    assert.equal(typeof kpis.netBalance, 'number');
    assert.equal(kpis.totalRevenue - kpis.totalExpenses, kpis.netBalance);

    const settings = await dash.getSettings();
    assert.equal(typeof settings.schoolName, 'string');
    assert.ok(settings.schoolName.length > 0);
  });

  it('StudentRepository delete lifecycle is FK-safe', async () => {
    const repo = new StudentRepository(ds);
    // The repository delete does not cascade, so child references must be
    // removed first (mirrors the real deletion order in the application).
    await ds.execute(`DELETE FROM fee_payments WHERE student_id = ?`, [ids.student]);
    await ds.execute(`DELETE FROM parent_students WHERE student_id = ?`, [ids.student]);
    assert.equal(await repo.delete(ids.student), true);
    assert.equal(await repo.getById(ids.student), undefined);
  });
});
