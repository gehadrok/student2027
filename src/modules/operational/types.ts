/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Operational Academic READ contracts (types only).
 *
 * READ ONLY. No write operations are declared, implemented or routed.
 */

import type { UserRole } from '../../types';

export const OPERATIONAL_RESOURCES = ['student', 'teacher', 'class', 'section', 'subject'] as const;

export type OperationalResource = (typeof OPERATIONAL_RESOURCES)[number];

export interface OperationalListQuery {
  page?: string | number;
  pageSize?: string | number;
  searchQuery?: string;
  classId?: string;
  sectionId?: string;
  status?: string;
  teacherId?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface OperationalListResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PrincipalScope {
  userId: string;
  role: UserRole;
  teacherId: string | null;
  ownStudentId: string | null;
  ownClassId: string | null;
  ownSectionId: string | null;
  childStudentIds: string[];
  childClassIds: string[];
}

export interface StudentRecordView {
  id: string;
  academicId: string;
  name: string;
  classId: string;
  sectionId: string;
  status: string;
  enrollmentDate: string;
  photo?: string;
  birthDate?: string;
  gender?: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  healthNotes?: string;
  userId?: string;
}

export interface TeacherRecordView {
  id: string;
  name: string;
  specialization: string;
  status: string;
  photo?: string;
  email?: string;
  phone?: string;
  userId?: string;
  classIds?: string[];
}

export interface ClassRecordView {
  id: string;
  name: string;
  level: number;
}

export interface SectionRecordView {
  id: string;
  name: string;
  classId: string;
  roomNumber: string;
  capacity: number;
  supervisorTeacherId?: string;
}

export interface SubjectRecordView {
  id: string;
  name: string;
  code?: string;
  classId: string;
  teacherId: string;
  weeklyHours: number;
  maxScore: number;
  passScore: number;
  color?: string;
  subjectId?: string;
}

export type OperationalRow =
  | StudentRecordView
  | TeacherRecordView
  | ClassRecordView
  | SectionRecordView
  | SubjectRecordView;
