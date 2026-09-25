process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'c31-read-test-secret';

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DataSourceFactory } from '../../../core/datasource/DataSourceFactory';
import { getTokenService } from '../../../core/auth/authMiddleware';
import { createOperationalRouter } from './operationalRoutes';

interface Captured { sql: string; params: any[] }

const TABLE_NAMES = ['students', 'teachers', 'school_classes', 'sections', 'subjects'];

class FakeOperationalDataSource {
  permissions: Record<string, Array<{ code: string; resource: string; action: string }>> = {};
  tables: Record<string, any[]> = {
    students: [], teachers: [], parents: [], parent_students: [],
    school_classes: [], sections: [], subjects: [],
  };
  readonly calls: Captured[] = [];

  private record(sql: string, params: any[]): void {
    this.calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
  }

  private tableFor(sql: string): string | null {
    for (const table of TABLE_NAMES) {
      if (new RegExp(`FROM ${table} [a-z]+`).test(sql) || sql.includes(`FROM ${table} `)) return table;
    }
    return null;
  }

  /**
   * Applies the alias-qualified equality conditions of the generated SQL in
   * order. Sub-query predicates (no table alias) and IN-lists are intentionally
   * not interpreted: the scope correctness is asserted from the SQL text.
   */
  private applyConditions(sql: string, params: any[], table: string): any[] {
    const aliasMatch = sql.match(new RegExp(`FROM ${table} ([a-z]+)`));
    const alias = aliasMatch ? aliasMatch[1] : null;
    let rows = this.tables[table];
    if (!alias) return rows;

    const condition = new RegExp(`${alias}\\.(\\w+) = $`);
    const segments = sql.split('?');
    const filters: Array<{ column: string; value: any }> = [];
    for (let i = 0; i < segments.length - 1; i += 1) {
      const column = segments[i].match(condition);
      if (column) filters.push({ column: column[1], value: params[i] });
    }
    for (const filter of filters) {
      rows = rows.filter((row: any) => String(row[filter.column]) === String(filter.value));
    }
    return rows;
  }

  private applyPaging(sql: string, params: any[], rows: any[]): any[] {
    if (!/LIMIT \? OFFSET \?/.test(sql)) return rows;
    const limit = Number(params[params.length - 2]);
    const offset = Number(params[params.length - 1]);
    return rows.slice(offset, offset + limit);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.record(sql, params);
    if (sql.includes('FROM user_roles ur')) return (this.permissions[params[0]] ?? []) as T[];

    if (sql.includes('SELECT id FROM teachers WHERE user_id')) {
      return this.tables.teachers.filter((t) => t.user_id === params[0]).map((t) => ({ id: t.id })) as T[];
    }
    if (sql.includes('FROM students WHERE user_id')) {
      return this.tables.students
        .filter((s) => s.user_id === params[0])
        .map((s) => ({ id: s.id, class_id: s.class_id, section_id: s.section_id })) as T[];
    }
    if (sql.includes('FROM parent_students ps')) {
      const parent = this.tables.parents.find((p) => p.user_id === params[0]);
      if (!parent) return [] as T[];
      return this.tables.parent_students
        .filter((l) => l.parent_id === parent.id)
        .map((l) => ({ student_id: l.student_id })) as T[];
    }
    if (sql.includes('SELECT DISTINCT class_id FROM students')) {
      const ids = params as string[];
      return this.tables.students.filter((s) => ids.includes(s.id)).map((s) => ({ class_id: s.class_id })) as T[];
    }

    const table = this.tableFor(sql);
    if (!table) return [] as T[];
    return this.applyPaging(sql, params, this.applyConditions(sql, params, table)) as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T[]>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async count(sql: string, params: any[] = []): Promise<number> {
    this.record(sql, params);
    if (sql.includes('FROM user_roles ur')) return (this.permissions[params[0]] ?? []).length;
    const table = this.tableFor(sql);
    if (!table) return 0;
    return this.applyConditions(sql, params, table).length;
  }

  async execute(): Promise<{ changes: number; lastInsertRowid: number }> {
    return { changes: 0, lastInsertRowid: 0 };
  }
  async transaction() { return { success: true }; }
  async prepare() { return { run: () => {}, free: () => {} }; }
  async exists() { return false; }
  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
}

const ds = new FakeOperationalDataSource();
DataSourceFactory.setInstance(ds as never);

ds.tables.school_classes = [
  { id: 'c1', name: 'الصف الأول', level: 10 },
  { id: 'c2', name: 'الصف الثاني', level: 11 },
];
ds.tables.sections = [
  { id: 'sec1', name: 'شعبة أ', class_id: 'c1', room_number: '101', capacity: 30, supervisor_teacher_id: 't1' },
  { id: 'sec3', name: 'شعبة أ', class_id: 'c2', room_number: '201', capacity: 32, supervisor_teacher_id: null },
];
ds.tables.teachers = [
  { id: 't1', user_id: 'u2', name: 'معلم', email: 't@kayan.test', phone: '0501', specialization: 'رياضيات', qualification: 'ماجستير', experience_years: 12, photo: 't.png', status: 'active' },
];
ds.tables.students = [
  { id: 's1', user_id: 'u8', academic_id: 'STU-1', name: 'عمر', class_id: 'c1', section_id: 'sec1', parent_id: 'p1', parent_name: 'ولي عمر', parent_phone: '050999', birth_date: '2012-04-12', gender: 'male', photo: 'a.png', status: 'active', health_notes: 'حساسية', enrollment_date: '2024-09-01' },
  { id: 's3', user_id: 'u10', academic_id: 'STU-3', name: 'يوسف', class_id: 'c2', section_id: 'sec3', parent_id: 'p1', parent_name: 'ولي عمر', parent_phone: '050999', birth_date: '2010-02-18', gender: 'male', photo: null, status: 'active', health_notes: null, enrollment_date: '2023-09-01' },
];
ds.tables.parents = [{ id: 'p1', user_id: 'u6', name: 'ولي', email: 'p@kayan.test', phone: '0509' }];
ds.tables.parent_students = [{ parent_id: 'p1', student_id: 's1' }, { parent_id: 'p1', student_id: 's3' }];
ds.tables.subjects = [
  { id: 'sub1', name: 'رياضيات', code: 'M1', class_id: 'c1', teacher_id: 't1', weekly_hours: 4, max_score: 100, pass_score: 50, color: '#111', subject_id: 'sm1' },
];

const ALL_READ = ['student', 'class', 'section', 'subject', 'teacher'].map((resource) => ({
  code: `${resource}:read`, resource, action: 'read',
}));

ds.permissions['adm1'] = ALL_READ;
ds.permissions['u2'] = [
  { code: 'student:read', resource: 'student', action: 'read' },
  { code: 'class:read', resource: 'class', action: 'read' },
  { code: 'section:read', resource: 'section', action: 'read' },
];
ds.permissions['u8'] = ALL_READ.filter((p) => p.resource !== 'teacher');
ds.permissions['u6'] = ALL_READ.filter((p) => p.resource !== 'teacher');

let base = '';
let server: ReturnType<express.Express['listen']> | null = null;

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use('/api', createOperationalRouter());
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server!.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

async function token(userId: string, role: string): Promise<string> {
  return getTokenService().generate({ userId, role, email: `${userId}@kayan.test`, name: userId });
}

const ROLE_OF: Record<string, string> = {
  'adm1': 'admin',
  'u2': 'teacher',
  'u8': 'student',
  'u6': 'parent',
};

async function call(path: string, options: { method?: string; as?: string } = {}): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.as) {
    headers.Authorization = `Bearer ${await token(options.as, ROLE_OF[options.as])}`;
  }
  const res = await fetch(`${base}${path}`, { method: options.method ?? 'GET', headers });
  let body: any = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

function lastSqlFor(fragment: string): Captured | undefined {
  return [...ds.calls].reverse().find((c) => c.sql.includes(fragment));
}

test.before(async () => { await startServer(); });
test.after(() => { server?.close(); });

test('no bearer token is rejected with 401', async () => {
  const res = await call('/api/students');
  assert.equal(res.status, 401);
  assert.equal(typeof res.body.error, 'string');
});

test('an invalid bearer token is rejected with 401', async () => {
  const res = await fetch(`${base}/api/students`, { headers: { Authorization: 'Bearer not-a-token' } });
  assert.equal(res.status, 401);
});

test('admin can read all five operational resources', async () => {
  for (const path of ['/api/students', '/api/teachers', '/api/classes', '/api/sections', '/api/subjects']) {
    const res = await call(path, { as: 'adm1' });
    assert.equal(res.status, 200, path);
    assert.equal(Array.isArray(res.body.data), true, path);
    assert.equal(typeof res.body.total, 'number', path);
    assert.equal(typeof res.body.page, 'number', path);
    assert.equal(typeof res.body.pageSize, 'number', path);
    assert.equal(typeof res.body.totalPages, 'number', path);
  }
});

test('teacher is denied subjects and teachers in C3.1 (not granted)', async () => {
  assert.equal((await call('/api/subjects', { as: 'u2' })).status, 403);
  assert.equal((await call('/api/teachers', { as: 'u2' })).status, 403);
});

test('student and parent are denied teachers (not granted)', async () => {
  assert.equal((await call('/api/teachers', { as: 'u8' })).status, 403);
  assert.equal((await call('/api/teachers', { as: 'u6' })).status, 403);
});

test('teacher students query is scoped through teacher_classes', async () => {
  const res = await call('/api/students', { as: 'u2' });
  assert.equal(res.status, 200);
  const scoped = lastSqlFor('FROM students s WHERE');
  assert.ok(scoped, 'expected a scoped students query');
  assert.ok(scoped!.sql.includes('teacher_classes'));
  assert.deepEqual(scoped!.params.slice(0, 1), ['t1']);
});

test('student students query is scoped to the own record', async () => {
  const res = await call('/api/students', { as: 'u8' });
  assert.equal(res.status, 200);
  const scoped = lastSqlFor('FROM students s WHERE');
  assert.ok(scoped!.sql.includes('s.id = ?'));
  assert.deepEqual(scoped!.params[0], 's1');
});

test('parent students query is scoped to parent_students children', async () => {
  const res = await call('/api/students', { as: 'u6' });
  assert.equal(res.status, 200);
  const childrenQuery = lastSqlFor('FROM parent_students ps');
  assert.ok(childrenQuery, 'expected a parent_students scope query');
  const scoped = lastSqlFor('FROM students s WHERE');
  assert.ok(scoped!.sql.includes('IN (?, ?)'));
  assert.deepEqual(scoped!.params.slice(0, 2), ['s1', 's3']);
});

test('teacher projection never carries parent_phone or health_notes', async () => {
  const res = await call('/api/students', { as: 'u2' });
  assert.equal(res.status, 200);
  for (const row of res.body.data) {
    assert.equal('parentPhone' in row, false);
    assert.equal('healthNotes' in row, false);
    assert.equal('parentName' in row, false);
    assert.equal('birthDate' in row, false);
    assert.equal('gender' in row, false);
  }
});

test('admin projection carries the approved administrative student fields', async () => {
  const res = await call('/api/students', { as: 'adm1' });
  const row = res.body.data[0];
  assert.equal(row.parentPhone, '050999');
  assert.equal(row.healthNotes, 'حساسية');
  assert.equal(row.birthDate, '2012-04-12');
  assert.equal(row.userId, 'u8');
  assert.equal('createdAt' in row, false);
  assert.equal('password' in row, false);
  assert.equal('passwordHash' in row, false);
});

test('no response can leak credential material', async () => {
  for (const actor of ['adm1', 'u2', 'u8', 'u6']) {
    for (const path of ['/api/students', '/api/teachers', '/api/classes', '/api/sections', '/api/subjects']) {
      const res = await call(path, { as: actor });
      if (res.status !== 200) continue;
      const serialized = JSON.stringify(res.body).toLowerCase();
      for (const forbidden of ['password', 'created_at', 'createdat', 'qualification', 'experience_years']) {
        assert.equal(serialized.includes(forbidden), false, `${actor} ${path} leaked ${forbidden}`);
      }
    }
  }
});

test('pageSize above 100 is rejected with 400', async () => {
  const res = await call('/api/students?pageSize=101', { as: 'adm1' });
  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
  assert.ok(lastSqlFor('FROM students s WHERE'), 'the query must not run after a paging rejection');
});

test('invalid paging values are rejected', async () => {
  assert.equal((await call('/api/students?page=0', { as: 'adm1' })).status, 400);
  assert.equal((await call('/api/students?pageSize=0', { as: 'adm1' })).status, 400);
  assert.equal((await call('/api/students?page=abc', { as: 'adm1' })).status, 400);
  assert.equal((await call('/api/students?pageSize=100', { as: 'adm1' })).status, 200);
});

test('a missing individual record returns 404', async () => {
  const res = await call('/api/students/does-not-exist', { as: 'adm1' });
  assert.equal(res.status, 404);
  assert.equal(typeof res.body.error, 'string');
});

test('an out-of-scope id is not readable by the principal', async () => {
  const res = await call('/api/students/s3', { as: 'u8' });
  assert.equal(res.status, 404);
});

test('an existing individual record is returned with the role projection', async () => {
  const admin = await call('/api/students/s1', { as: 'adm1' });
  assert.equal(admin.status, 200);
  assert.equal(admin.body.academicId, 'STU-1');

  const teacher = await call('/api/students/s1', { as: 'u2' });
  assert.equal(teacher.status, 200);
  assert.equal('parentPhone' in teacher.body, false);
  assert.equal('healthNotes' in teacher.body, false);
});

test('paging is applied with LIMIT/OFFSET and reflected in the envelope', async () => {
  const res = await call('/api/students?page=1&pageSize=1', { as: 'adm1' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.pageSize, 1);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.totalPages, 2);
  const paged = lastSqlFor('LIMIT ? OFFSET ?');
  assert.deepEqual(paged!.params.slice(-2), [1, 0]);
});

test('the router exposes no write route', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const res = await fetch(`${base}/api/students`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await token('adm1', 'admin')}`,
      },
      body: method === 'DELETE' ? undefined : JSON.stringify({ name: 'x' }),
    });
    assert.equal(res.status, 404, `${method} /api/students must not exist`);
  }
});

