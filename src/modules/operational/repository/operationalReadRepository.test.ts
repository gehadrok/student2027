import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PAGE_SIZE,
  OperationalReadRepository,
  TABLE_SPECS,
  buildScopeClause,
  parsePaging,
  resolveSort,
} from './operationalReadRepository';
import type { PrincipalScope } from '../types';

interface Captured {
  sql: string;
  params: any[];
}

export class RecordingDataSource {
  readonly queries: Captured[] = [];
  readonly counts: Captured[] = [];
  rows: Record<string, any>[] = [];
  total = 0;

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.queries.push({ sql, params });
    return this.rows as T[];
  }
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    this.queries.push({ sql, params });
    return (this.rows[0] as T) ?? null;
  }
  async count(sql: string, params: any[] = []): Promise<number> {
    this.counts.push({ sql, params });
    return this.total;
  }
  async execute(): Promise<{ changes: number; lastInsertRowid: number }> {
    return { changes: 0, lastInsertRowid: 0 };
  }
  async transaction() {
    return { success: true };
  }
  async prepare() {
    return { run: () => {}, free: () => {} };
  }
  async exists() {
    return this.rows.length > 0;
  }
  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
}

function scope(overrides: Partial<PrincipalScope> = {}): PrincipalScope {
  return {
    userId: 'u-admin',
    role: 'admin',
    teacherId: null,
    ownStudentId: null,
    ownClassId: null,
    ownSectionId: null,
    childStudentIds: [],
    childClassIds: [],
    ...overrides,
  };
}

test('admin scope adds no predicate and is not narrowed by client parameters', async () => {
  const ds = new RecordingDataSource();
  const repo = new OperationalReadRepository(ds);

  await repo.list('student', scope(), { classId: 'c1' });

  assert.equal(ds.queries[0].sql.includes('teacher_classes'), false);
  assert.equal(ds.queries[0].sql.includes('parent_students'), false);
  assert.ok(ds.queries[0].sql.includes('class_id = ?'));
  assert.deepEqual(ds.queries[0].params, ['c1', 25, 0]);
});

test('no SELECT * is ever issued and every column is allow-listed', async () => {
  const ds = new RecordingDataSource();
  const repo = new OperationalReadRepository(ds);

  for (const resource of Object.keys(TABLE_SPECS)) {
    await repo.list(resource, scope(), {});
  }

  for (const captured of [...ds.queries, ...ds.counts]) {
    assert.equal(captured.sql.includes('SELECT *'), false);
  }
  const studentSql = ds.queries[0].sql;
  for (const column of TABLE_SPECS.student.columns) {
    assert.ok(studentSql.includes(`s.${column}`), `missing column ${column}`);
  }
  assert.equal(studentSql.includes('password'), false);
});

test('teacher scope is derived from teacher_classes, never from a client parameter', () => {
  const clause = buildScopeClause('student', scope({ role: 'teacher', teacherId: 't9' }));
  assert.ok(clause.sql.includes('teacher_classes'));
  assert.deepEqual(clause.params, ['t9']);

  const subjectClause = buildScopeClause('subject', scope({ role: 'teacher', teacherId: 't9' }));
  assert.ok(subjectClause.sql.includes('teacher_classes'));
  assert.equal(subjectClause.sql.includes('teacher_subjects'), false);
});

test('student scope resolves to the own record only', () => {
  const clause = buildScopeClause('student', scope({ role: 'student', ownStudentId: 's5' }));
  assert.equal(clause.sql, 's.id = ?');
  assert.deepEqual(clause.params, ['s5']);
});

test('parent scope is derived from the resolved child ids only', () => {
  const clause = buildScopeClause('student', scope({ role: 'parent', childStudentIds: ['s1', 's2'] }));
  assert.ok(clause.sql.includes('IN (?, ?)'));
  assert.deepEqual(clause.params, ['s1', 's2']);
});

test('an unresolvable scope fails closed instead of widening', () => {
  for (const resource of ['student', 'class', 'section', 'subject']) {
    const teacher = buildScopeClause(resource, scope({ role: 'teacher', teacherId: null }));
    assert.equal(teacher.sql, '1 = 0', `${resource} teacher`);
    const parent = buildScopeClause(resource, scope({ role: 'parent', childStudentIds: [], childClassIds: [] }));
    assert.equal(parent.sql, '1 = 0', `${resource} parent`);
  }
});

test('filters are parameterized, never interpolated', async () => {
  const ds = new RecordingDataSource();
  const repo = new OperationalReadRepository(ds);

  await repo.list('student', scope(), { searchQuery: "x' OR 1=1 --", status: 'active' });

  assert.equal(ds.queries[0].params[0], "%x' OR 1=1 --%");
  assert.equal(ds.queries[0].params.includes('active'), true);
  assert.equal(ds.queries[0].sql.includes('OR 1=1'), false);
});

test('paging defaults and offsets', () => {
  assert.deepEqual(parsePaging({}), { page: 1, pageSize: 25, offset: 0 });
  assert.deepEqual(parsePaging({ page: '3', pageSize: '10' }), { page: 3, pageSize: 10, offset: 20 });
  assert.equal(MAX_PAGE_SIZE, 100);
});

test('pageSize above the approved maximum is rejected', () => {
  assert.throws(() => parsePaging({ pageSize: '101' }), RangeError);
  assert.throws(() => parsePaging({ pageSize: 0 }), RangeError);
  assert.throws(() => parsePaging({ page: '0' }), RangeError);
  assert.throws(() => parsePaging({ page: '1.5' }), RangeError);
  assert.doesNotThrow(() => parsePaging({ pageSize: '100' }));
});

test('sortBy outside the allow-list is ignored, never injected', async () => {
  const allowed = resolveSort('student', { sortBy: 'academic_id', sortOrder: 'desc' });
  assert.deepEqual(allowed, { column: 'academic_id', direction: 'DESC' });

  const rejected = resolveSort('student', { sortBy: 'name; DROP TABLE students' });
  assert.equal(rejected.column, 'name');

  const counted = new RecordingDataSource();
  await new OperationalReadRepository(counted).list('student', scope(), { sortBy: 'name; DROP TABLE students' });
  assert.equal(counted.queries[0].sql.includes('DROP TABLE'), false);
});

test('getById applies the same scope predicate as the list', async () => {
  const ds = new RecordingDataSource();
  ds.rows = [{ id: 's1' }];
  const repo = new OperationalReadRepository(ds);

  const found = await repo.getById('student', scope({ role: 'student', ownStudentId: 's1' }), 's1');
  assert.deepEqual(found, { id: 's1' });
  assert.ok(ds.queries[0].sql.includes('s.id = ? AND s.id = ?'));
  assert.deepEqual(ds.queries[0].params, ['s1', 's1']);

  ds.rows = [];
  assert.equal(await repo.getById('student', scope({ role: 'student', ownStudentId: 's1' }), 'nope'), null);
});

test('the repository issues no write statement', async () => {
  const ds = new RecordingDataSource();
  const repo = new OperationalReadRepository(ds);

  await repo.list('subject', scope(), {});
  await repo.getById('subject', scope(), 'sub1');

  const allSql = [...ds.queries, ...ds.counts].map((c) => c.sql.toUpperCase()).join(' ');
  for (const verb of ['INSERT ', 'UPDATE ', 'DELETE ']) {
    assert.equal(allSql.includes(verb), false, verb);
  }
});
