/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Approved READ grant matrix and approved projection fields.
 *
 * Owner decisions (C3.1 unblock). This module is the single source of truth
 * for both the server guard and the response projection. Any field not listed
 * here is never exposed.
 */

import type { UserRole } from '../../types';
import type {
  ClassRecordView,
  SectionRecordView,
  StudentRecordView,
  SubjectRecordView,
  TeacherRecordView,
} from './types';

export const READ_ACTION = 'read';

export const RESOURCE_PERMISSION: Record<string, string> = {
  student: 'student:read',
  teacher: 'teacher:read',
  class: 'class:read',
  section: 'section:read',
  subject: 'subject:read',
};

export const ROLE_READ_GRANTS: Record<UserRole, string[]> = {
  admin: ['student', 'teacher', 'class', 'section', 'subject'],
  teacher: ['student', 'class', 'section'],
  student: ['student', 'class', 'section', 'subject'],
  parent: ['student', 'class', 'section', 'subject'],
};

export const DEFERRED_ROLE_GRANTS: Record<UserRole, string[]> = {
  admin: [],
  teacher: ['teacher', 'subject'],
  student: ['teacher'],
  parent: ['teacher'],
};

export function hasReadGrant(role: UserRole, resource: string): boolean {
  const grants = ROLE_READ_GRANTS[role];
  return Array.isArray(grants) && grants.includes(resource);
}

type Field<T> = keyof T;

const ADMIN_STUDENT_FIELDS: Field<StudentRecordView>[] = [
  'id', 'academicId', 'name', 'classId', 'sectionId', 'status', 'enrollmentDate', 'photo',
  'birthDate', 'gender', 'parentId', 'parentName', 'parentPhone', 'healthNotes', 'userId',
];

const TEACHER_STUDENT_FIELDS: Field<StudentRecordView>[] = [
  'id', 'academicId', 'name', 'classId', 'sectionId', 'status', 'enrollmentDate', 'photo',
];

const SELF_STUDENT_FIELDS: Field<StudentRecordView>[] = [
  'id', 'academicId', 'name', 'classId', 'sectionId', 'status', 'enrollmentDate', 'photo',
  'birthDate', 'gender',
];

export const STUDENT_PROJECTION: Record<UserRole, Field<StudentRecordView>[]> = {
  admin: ADMIN_STUDENT_FIELDS,
  teacher: TEACHER_STUDENT_FIELDS,
  student: SELF_STUDENT_FIELDS,
  parent: SELF_STUDENT_FIELDS,
};

const ADMIN_TEACHER_FIELDS: Field<TeacherRecordView>[] = [
  'id', 'name', 'email', 'phone', 'specialization', 'status', 'photo', 'userId', 'classIds',
];

export const TEACHER_PROJECTION: Record<UserRole, Field<TeacherRecordView>[]> = {
  admin: ADMIN_TEACHER_FIELDS,
  teacher: [],
  student: [],
  parent: [],
};

export const CLASS_PROJECTION: Record<UserRole, Field<ClassRecordView>[]> = {
  admin: ['id', 'name', 'level'],
  teacher: ['id', 'name', 'level'],
  student: ['id', 'name', 'level'],
  parent: ['id', 'name', 'level'],
};

export const SECTION_PROJECTION: Record<UserRole, Field<SectionRecordView>[]> = {
  admin: ['id', 'name', 'classId', 'roomNumber', 'capacity', 'supervisorTeacherId'],
  teacher: ['id', 'name', 'classId', 'roomNumber', 'capacity', 'supervisorTeacherId'],
  student: ['id', 'name', 'classId', 'roomNumber', 'capacity', 'supervisorTeacherId'],
  parent: ['id', 'name', 'classId', 'roomNumber', 'capacity', 'supervisorTeacherId'],
};

export const SUBJECT_PROJECTION: Record<UserRole, Field<SubjectRecordView>[]> = {
  admin: ['id', 'name', 'code', 'classId', 'teacherId', 'weeklyHours', 'maxScore', 'passScore', 'color', 'subjectId'],
  teacher: [],
  student: ['id', 'name', 'code', 'classId', 'teacherId', 'weeklyHours', 'maxScore', 'passScore', 'color', 'subjectId'],
  parent: ['id', 'name', 'code', 'classId', 'teacherId', 'weeklyHours', 'maxScore', 'passScore', 'color', 'subjectId'],
};

export const NEVER_EXPOSED_FIELDS = [
  'password',
  'password_hash',
  'passwordHash',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
  'qualification',
  'experience_years',
  'experienceYears',
  'subjectIds',
  'subject_ids',
  'linked_student_ids',
] as const;

export function projectRow<T>(row: Record<string, any>, fields: readonly (keyof T)[]): T {
  const out: Record<string, any> = {};
  for (const field of fields) {
    if (row[field as string] !== undefined) out[field as string] = row[field as string];
  }
  return out as T;
}
