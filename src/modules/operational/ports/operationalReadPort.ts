/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Client read ports for the operational academic resources.
 *
 * Ports are READ ONLY. The mock implementation preserves the existing browser
 * behaviour; the real implementation calls the C3.1 GET endpoints through the
 * shared ApiClient (bearer token, 401/403 handling).
 */

import type {
  ClassRecordView,
  SectionRecordView,
  StudentRecordView,
  SubjectRecordView,
  TeacherRecordView,
} from '../types';

export const OPERATIONAL_READ_PATHS = {
  student: '/api/students',
  teacher: '/api/teachers',
  class: '/api/classes',
  section: '/api/sections',
  subject: '/api/subjects',
} as const;

export type OperationalResourceKey = keyof typeof OPERATIONAL_READ_PATHS;

export interface OperationalListQuery {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  classId?: string;
  sectionId?: string;
  status?: string;
  teacherId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OperationalPage<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type OperationalRecordView =
  | StudentRecordView
  | TeacherRecordView
  | ClassRecordView
  | SectionRecordView
  | SubjectRecordView;

export interface OperationalReadPort {
  list<T = OperationalRecordView>(resource: OperationalResourceKey, query?: OperationalListQuery): Promise<OperationalPage<T>>;
  getById<T = OperationalRecordView>(resource: OperationalResourceKey, id: string): Promise<T>;
}

export const MAX_PORT_PAGE_SIZE = 100;

export function normalizePageQuery(query: OperationalListQuery = {}): OperationalListQuery {
  const normalized: OperationalListQuery = { ...query };
  if (normalized.page !== undefined) normalized.page = Math.max(1, Math.floor(Number(normalized.page) || 1));
  if (normalized.pageSize !== undefined) {
    const size = Math.floor(Number(normalized.pageSize) || 0);
    if (size > MAX_PORT_PAGE_SIZE) {
      throw new RangeError(`pageSize must be between 1 and ${MAX_PORT_PAGE_SIZE}`);
    }
    if (size >= 1) normalized.pageSize = size;
  }
  return normalized;
}
