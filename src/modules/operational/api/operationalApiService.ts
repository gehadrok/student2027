/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Operational Academic READ application service.
 *
 * Resolves the principal scope server-side, validates paging, applies the
 * approved per-role projection, and maps DB rows to API field names.
 * No write operation exists in this service.
 */

import type { IDataSource } from '../../../core/datasource/IDataSource';
import type { UserRole } from '../../types';
import { ApiError } from '../../master-data/api/errors';
import {
  CLASS_PROJECTION,
  SECTION_PROJECTION,
  STUDENT_PROJECTION,
  SUBJECT_PROJECTION,
  TEACHER_PROJECTION,
  hasReadGrant,
  projectRow,
} from '../permissions';
import { OperationalReadRepository, TABLE_SPECS, parsePaging } from '../repository/operationalReadRepository';
import type {
  ClassRecordView,
  OperationalListQuery,
  OperationalListResult,
  PrincipalScope,
  SectionRecordView,
  StudentRecordView,
  SubjectRecordView,
  TeacherRecordView,
} from '../types';

interface PrincipalIdentity {
  userId: string;
  role: UserRole;
}

const ROW_MAPPERS: Record<string, (row: Record<string, any>) => Record<string, any>> = {
  student: (row) => ({
    id: row.id,
    userId: row.user_id,
    academicId: row.academic_id,
    name: row.name,
    classId: row.class_id,
    sectionId: row.section_id,
    parentId: row.parent_id,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    birthDate: row.birth_date,
    gender: row.gender,
    photo: row.photo,
    status: row.status,
    healthNotes: row.health_notes,
    enrollmentDate: row.enrollment_date,
  }),
  teacher: (row) => ({
    id: row.id,
    userId: row.user_id,
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
    classId: row.class_id,
    roomNumber: row.room_number,
    capacity: row.capacity,
    supervisorTeacherId: row.supervisor_teacher_id,
  }),
  subject: (row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    classId: row.class_id,
    teacherId: row.teacher_id,
    weeklyHours: row.weekly_hours,
    maxScore: row.max_score,
    passScore: row.pass_score,
    color: row.color,
    subjectId: row.subject_id,
  }),
};

function projectionFor(resource: string, role: UserRole): readonly (keyof any)[] {
  switch (resource) {
    case 'student':
      return STUDENT_PROJECTION[role];
    case 'teacher':
      return TEACHER_PROJECTION[role];
    case 'class':
      return CLASS_PROJECTION[role];
    case 'section':
      return SECTION_PROJECTION[role];
    case 'subject':
      return SUBJECT_PROJECTION[role];
    default:
      return [];
  }
}

export class OperationalApiService {
  private readonly repository: OperationalReadRepository;

  constructor(private readonly ds: IDataSource) {
    this.repository = new OperationalReadRepository(ds);
  }

  private assertResource(resource: string): void {
    if (!TABLE_SPECS[resource]) {
      throw new ApiError(404, 'المورد غير موجود');
    }
  }

  private assertGrant(resource: string, role: UserRole): void {
    if (!hasReadGrant(role, resource)) {
      throw new ApiError(403, 'ممنوع: لا تملك صلاحية القراءة لهذا المورد');
    }
  }

  async resolveScope(identity: PrincipalIdentity): Promise<PrincipalScope> {
    const scope: PrincipalScope = {
      userId: identity.userId,
      role: identity.role,
      teacherId: null,
      ownStudentId: null,
      ownClassId: null,
      ownSectionId: null,
      childStudentIds: [],
      childClassIds: [],
    };

    if (identity.role === 'teacher') {
      const teacher = await this.ds.query<{ id: string }>(
        'SELECT id FROM teachers WHERE user_id = ?',
        [identity.userId],
      );
      scope.teacherId = teacher.length > 0 ? teacher[0].id : null;
      return scope;
    }

    if (identity.role === 'student') {
      const student = await this.ds.query<{ id: string; class_id: string; section_id: string }>(
        'SELECT id, class_id, section_id FROM students WHERE user_id = ?',
        [identity.userId],
      );
      if (student.length > 0) {
        scope.ownStudentId = student[0].id;
        scope.ownClassId = student[0].class_id;
        scope.ownSectionId = student[0].section_id;
      }
      return scope;
    }

    if (identity.role === 'parent') {
      const children = await this.ds.query<{ student_id: string }>(
        `SELECT ps.student_id AS student_id
           FROM parent_students ps
           JOIN parents p ON p.id = ps.parent_id
          WHERE p.user_id = ?`,
        [identity.userId],
      );
      scope.childStudentIds = children.map((row) => row.student_id);
      if (scope.childStudentIds.length > 0) {
        const classRows = await this.ds.query<{ class_id: string }>(
          `SELECT DISTINCT class_id FROM students WHERE id IN (${scope.childStudentIds.map(() => '?').join(', ')})`,
          [...scope.childStudentIds],
        );
        scope.childClassIds = classRows.map((row) => row.class_id);
      }
      return scope;
    }

    return scope;
  }

  async list<T>(
    resource: string,
    identity: PrincipalIdentity,
    query: OperationalListQuery,
  ): Promise<OperationalListResult<T>> {
    this.assertResource(resource);
    this.assertGrant(resource, identity.role);

    try {
      parsePaging(query);
    } catch (err) {
      throw new ApiError(400, err instanceof RangeError ? err.message : 'معالجة ترقيم الصفحات غير صالحة');
    }

    const scope = await this.resolveScope(identity);
    const { rows, total, page, pageSize } = await this.repository.list(resource, scope, query);
    const fields = projectionFor(resource, identity.role);
    const mapper = ROW_MAPPERS[resource];

    return {
      data: rows.map((row) => projectRow<T>(mapper(row), fields)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getById<T>(resource: string, identity: PrincipalIdentity, id: string): Promise<T> {
    this.assertResource(resource);
    this.assertGrant(resource, identity.role);
    if (!id) {
      throw new ApiError(400, 'المعرف مطلوب');
    }

    const scope = await this.resolveScope(identity);
    const row = await this.repository.getById(resource, scope, id);
    if (!row) {
      throw new ApiError(404, 'السجل غير موجود');
    }

    const fields = projectionFor(resource, identity.role);
    return projectRow<T>(ROW_MAPPERS[resource](row), fields);
  }

  async listTeacherClassIds(teacherId: string): Promise<string[]> {
    const rows = await this.ds.query<{ class_id: string }>(
      'SELECT class_id FROM teacher_classes WHERE teacher_id = ?',
      [teacherId],
    );
    return rows.map((row) => row.class_id);
  }
}

export type OperationalView =
  | StudentRecordView
  | TeacherRecordView
  | ClassRecordView
  | SectionRecordView
  | SubjectRecordView;
