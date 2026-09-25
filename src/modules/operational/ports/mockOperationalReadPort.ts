/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Mock implementation of the operational read ports.
 *
 * Reads the existing browser SQLite path (no new persistence) and returns the
 * same field names, envelope and approved projection as the real ports, so both
 * modes satisfy one contract. Existing screens are NOT migrated in C3.1, so Mock
 * Mode behaviour on screen is unchanged.
 */

import { getRealmDB } from '../../../lib/db';
import { getCurrentUser } from '../../../lib/db';
import type { UserRole } from '../../types';
import {
  CLASS_PROJECTION,
  SECTION_PROJECTION,
  STUDENT_PROJECTION,
  SUBJECT_PROJECTION,
  TEACHER_PROJECTION,
  projectRow,
} from '../permissions';
import {
  normalizePageQuery,
  type OperationalListQuery,
  type OperationalPage,
  type OperationalReadPort,
  type OperationalRecordView,
  type OperationalResourceKey,
} from './operationalReadPort';

const MAPPERS: Record<OperationalResourceKey, (row: any) => Record<string, any>> = {
  student: (row) => ({
    id: row.id,
    userId: row.userId,
    academicId: row.academicId,
    name: row.name,
    classId: row.classId,
    sectionId: row.sectionId,
    parentId: row.parentId,
    parentName: row.parentName,
    parentPhone: row.parentPhone,
    birthDate: row.birthDate,
    gender: row.gender,
    photo: row.photo,
    status: row.status,
    healthNotes: row.healthNotes,
    enrollmentDate: row.enrollmentDate,
  }),
  teacher: (row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    specialization: row.specialization,
    photo: row.photo,
    status: row.status,
  }),
  class: (row) => ({ id: row.id, name: row.name, level: row.level }),
  section: (row) => ({
    id: row.id,
    name: row.name,
    classId: row.classId,
    roomNumber: row.roomNumber,
    capacity: row.capacity,
    supervisorTeacherId: row.supervisorTeacherId,
  }),
  subject: (row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    classId: row.classId,
    teacherId: row.teacherId,
    weeklyHours: row.weeklyHours,
    maxScore: row.maxScore,
    passScore: row.passScore,
    color: row.color,
    subjectId: undefined,
  }),
};

const PROJECTIONS: Record<OperationalResourceKey, Record<UserRole, readonly (keyof any)[]>> = {
  student: STUDENT_PROJECTION,
  teacher: TEACHER_PROJECTION,
  class: CLASS_PROJECTION,
  section: SECTION_PROJECTION,
  subject: SUBJECT_PROJECTION,
};

interface MockScope {
  role: UserRole;
  userId: string;
  teacherId: string | null;
  ownStudentId: string | null;
  ownClassIds: string[];
  childStudentIds: string[];
}

function resolveScope(): MockScope {
  const user = getCurrentUser();
  const role = (user?.role ?? 'admin') as UserRole;
  const userId = user?.id ?? '';
  const db = getRealmDB();

  const scope: MockScope = {
    role,
    userId,
    teacherId: null,
    ownStudentId: null,
    ownClassIds: [],
    childStudentIds: [],
  };

  if (role === 'teacher') {
    const teacher = db.teachers.find((t) => t.userId === userId);
    scope.teacherId = teacher ? teacher.id : null;
    return scope;
  }

  if (role === 'student') {
    const student = db.students.find((s) => s.userId === userId);
    scope.ownStudentId = student ? student.id : null;
    scope.ownClassIds = student ? [student.classId] : [];
    return scope;
  }

  if (role === 'parent') {
    const parent = db.parents.find((p) => p.userId === userId);
    const linkIds = parent?.studentIds ?? user?.linkedStudentIds ?? [];
    scope.childStudentIds = linkIds.slice();
    scope.ownClassIds = db.students.filter((s) => scope.childStudentIds.includes(s.id)).map((s) => s.classId);
    return scope;
  }

  return scope;
}

function rowsFor(resource: OperationalResourceKey, scope: MockScope): any[] {
  const db = getRealmDB();
  const rows =
    resource === 'student' ? db.students
      : resource === 'teacher' ? db.teachers
        : resource === 'class' ? db.classes
          : resource === 'section' ? db.sections
            : db.subjects;

  if (scope.role === 'admin') return rows;

  if (resource === 'student') {
    if (scope.role === 'teacher') {
      const teacher = db.teachers.find((t) => t.id === scope.teacherId);
      const classIds = teacher?.classIds ?? [];
      return rows.filter((s) => classIds.includes(s.classId));
    }
    if (scope.role === 'student') return rows.filter((s) => s.id === scope.ownStudentId);
    return rows.filter((s) => scope.childStudentIds.includes(s.id));
  }

  if (scope.role === 'teacher') {
    const teacher = db.teachers.find((t) => t.id === scope.teacherId);
    const classIds = teacher?.classIds ?? [];
    return rows.filter((r) => classIds.includes(r.classId));
  }
  if (scope.role === 'student') return rows.filter((r) => scope.ownClassIds.includes(r.classId));
  return rows.filter((r) => scope.ownClassIds.includes(r.classId));
}

function filterRows(resource: OperationalResourceKey, rows: any[], query: OperationalListQuery): any[] {
  let filtered = rows;
  if (query.classId) filtered = filtered.filter((r) => r.classId === query.classId);
  if (resource === 'student') {
    if (query.sectionId) filtered = filtered.filter((r) => r.sectionId === query.sectionId);
    if (query.status) filtered = filtered.filter((r) => r.status === query.status);
  }
  if (query.searchQuery) {
    const q = String(query.searchQuery).toLowerCase();
    filtered = filtered.filter((r) =>
      [r.name, r.academicId, r.parentName, r.specialization]
        .filter((v) => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(q)),
    );
  }
  return filtered;
}

export function createMockOperationalReadPort(): OperationalReadPort {
  return {
    async list<T = OperationalRecordView>(
      resource: OperationalResourceKey,
      query: OperationalListQuery = {},
    ): Promise<OperationalPage<T>> {
      const normalized = normalizePageQuery(query);
      const scope = resolveScope();
      const rows = filterRows(resource, rowsFor(resource, scope), normalized);
      const page = normalized.page ?? 1;
      const pageSize = normalized.pageSize ?? 25;
      const start = (page - 1) * pageSize;
      const fields = PROJECTIONS[resource][scope.role];
      const mapper = MAPPERS[resource];
      return {
        data: rows.slice(start, start + pageSize).map((row) => projectRow<T>(mapper(row), fields)),
        total: rows.length,
        page,
        pageSize,
        totalPages: Math.ceil(rows.length / pageSize) || 1,
      };
    },

    async getById<T = OperationalRecordView>(resource: OperationalResourceKey, id: string): Promise<T> {
      const scope = resolveScope();
      const row = rowsFor(resource, scope).find((r) => r.id === id);
      if (!row) throw new RangeError('السجل غير موجود');
      return projectRow<T>(MAPPERS[resource](row), PROJECTIONS[resource][scope.role]);
    },
  };
}

export const mockOperationalReadPort: OperationalReadPort = createMockOperationalReadPort();
