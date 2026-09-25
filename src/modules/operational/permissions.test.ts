import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASS_PROJECTION,
  DEFERRED_ROLE_GRANTS,
  NEVER_EXPOSED_FIELDS,
  ROLE_READ_GRANTS,
  SECTION_PROJECTION,
  STUDENT_PROJECTION,
  SUBJECT_PROJECTION,
  TEACHER_PROJECTION,
  hasReadGrant,
  projectRow,
} from './permissions';
import type { UserRole } from '../types';

const ADMIN_STUDENT_ROW = {
  id: 's1',
  user_id: 'u8',
  academic_id: 'STU-1',
  name: 'طالب',
  class_id: 'c1',
  section_id: 'sec1',
  parent_id: 'p1',
  parent_name: 'ولي الأمر',
  parent_phone: '0500000000',
  birth_date: '2012-01-01',
  gender: 'male',
  photo: 'p.png',
  status: 'active',
  health_notes: 'حساسية',
  enrollment_date: '2024-09-01',
};

const mappedStudent = {
  id: 's1', userId: 'u8', academicId: 'STU-1', name: 'طالب', classId: 'c1', sectionId: 'sec1',
  parentId: 'p1', parentName: 'ولي الأمر', parentPhone: '0500000000', birthDate: '2012-01-01',
  gender: 'male', photo: 'p.png', status: 'active', healthNotes: 'حساسية', enrollmentDate: '2024-09-01',
};

const ADMIN_TEACHER_ROW = {
  id: 't1', user_id: 'u2', name: 'معلم', email: 't@kayan.test', phone: '0501', specialization: 'رياضيات',
  qualification: 'ماجستير', experience_years: 12, photo: 't.png', status: 'active',
};

const mappedTeacher = {
  id: 't1', userId: 'u2', name: 'معلم', email: 't@kayan.test', phone: '0501',
  specialization: 'رياضيات', photo: 't.png', status: 'active',
};

test('the approved read grant matrix is exactly the owner decision', () => {
  assert.deepEqual(ROLE_READ_GRANTS.admin, ['student', 'teacher', 'class', 'section', 'subject']);
  assert.deepEqual(ROLE_READ_GRANTS.teacher, ['student', 'class', 'section']);
  assert.deepEqual(ROLE_READ_GRANTS.student, ['student', 'class', 'section', 'subject']);
  assert.deepEqual(ROLE_READ_GRANTS.parent, ['student', 'class', 'section', 'subject']);
});

test('deferred grants are not granted', () => {
  assert.equal(hasReadGrant('teacher', 'subject'), false);
  assert.equal(hasReadGrant('teacher', 'teacher'), false);
  assert.equal(hasReadGrant('student', 'teacher'), false);
  assert.equal(hasReadGrant('parent', 'teacher'), false);
  assert.deepEqual(DEFERRED_ROLE_GRANTS.teacher, ['teacher', 'subject']);
});

test('admin student projection keeps the approved administrative fields', () => {
  const out = projectRow(mappedStudent, STUDENT_PROJECTION.admin) as Record<string, unknown>;
  assert.equal(out.parentPhone, '0500000000');
  assert.equal(out.healthNotes, 'حساسية');
  assert.equal(out.birthDate, '2012-01-01');
  assert.equal(out.gender, 'male');
  assert.equal(out.parentName, 'ولي الأمر');
  assert.equal(out.userId, 'u8');
  assert.equal(out.parentId, 'p1');
  assert.equal('createdAt' in out, false);
});

test('teacher student projection excludes parent_phone, health_notes, parent_name, birth_date, gender', () => {
  const out = projectRow(mappedStudent, STUDENT_PROJECTION.teacher) as Record<string, unknown>;
  for (const forbidden of ['parentPhone', 'healthNotes', 'parentName', 'birthDate', 'gender', 'userId', 'parentId']) {
    assert.equal(forbidden in out, false, `teacher must not receive ${forbidden}`);
  }
  assert.equal(out.name, 'طالب');
  assert.equal(out.academicId, 'STU-1');
  assert.equal(out.classId, 'c1');
  assert.equal(out.status, 'active');
  assert.equal(out.enrollmentDate, '2024-09-01');
});

test('student and parent student projections exclude health_notes and parent contact fields', () => {
  for (const role of ['student', 'parent'] as UserRole[]) {
    const out = projectRow(mappedStudent, STUDENT_PROJECTION[role]) as Record<string, unknown>;
    for (const forbidden of ['healthNotes', 'parentName', 'parentPhone', 'userId', 'parentId']) {
      assert.equal(forbidden in out, false, `${role} must not receive ${forbidden}`);
    }
    assert.equal(out.birthDate, '2012-01-01');
    assert.equal(out.gender, 'male');
  }
});

test('teacher projection for non-admin roles is empty (teacher:read not granted)', () => {
  for (const role of ['teacher', 'student', 'parent'] as UserRole[]) {
    assert.deepEqual(TEACHER_PROJECTION[role], []);
  }
});

test('admin teacher projection excludes qualification, experience_years and subjectIds', () => {
  const out = projectRow(mappedTeacher, TEACHER_PROJECTION.admin) as Record<string, unknown>;
  assert.equal(out.email, 't@kayan.test');
  assert.equal(out.phone, '0501');
  assert.equal(out.userId, 'u2');
  for (const deferred of ['qualification', 'experienceYears', 'subjectIds', 'classIds']) {
    assert.equal(deferred in out, false, deferred);
  }
  assert.equal('qualification' in out, false);
});

test('no projection can emit credential or internal-audit material', () => {
  const credentialRow = { ...ADMIN_STUDENT_ROW, password_hash: 'hash', password: 'plain' };
  const mappedWithSecrets = { ...mappedStudent, password_hash: 'hash', password: 'plain' };
  for (const role of ['admin', 'teacher', 'student', 'parent'] as UserRole[]) {
    const out = projectRow(mappedWithSecrets, STUDENT_PROJECTION[role]);
    const serialized = JSON.stringify(out).toLowerCase();
    for (const field of NEVER_EXPOSED_FIELDS) {
      assert.equal(serialized.includes(field.toLowerCase()), false, `${role} leaked ${field}`);
    }
  }
  assert.equal(Object.keys(credentialRow).length > 0, true);
});

test('class, section and subject projections expose no personal fields', () => {
  for (const role of ['admin', 'teacher', 'student', 'parent'] as UserRole[]) {
    assert.deepEqual(CLASS_PROJECTION[role], ['id', 'name', 'level']);
    assert.deepEqual(SECTION_PROJECTION[role], ['id', 'name', 'classId', 'roomNumber', 'capacity', 'supervisorTeacherId']);
    const subject = projectRow({
      id: 'sub1', name: 'رياضيات', code: 'M1', classId: 'c1', teacherId: 't1',
      weeklyHours: 4, maxScore: 100, passScore: 50, color: '#fff', subjectId: 'sm1',
    }, SUBJECT_PROJECTION[role]);
    const serialized = JSON.stringify(subject).toLowerCase();
    for (const field of ['email', 'phone', 'healthnotes', 'parentphone', 'birthdate', 'userid']) {
      assert.equal(serialized.includes(field), false, `${role}/${field}`);
    }
  }
});

test('subjects are not readable by the teacher role in C3.1', () => {
  assert.deepEqual(SUBJECT_PROJECTION.teacher, []);
});
