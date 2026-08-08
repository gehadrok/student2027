/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer (CQRS Queries).
 *
 * Read-only query contracts for the Academic bounded context. Each query is a
 * plain data shape consumed by an Application Service query method.
 */

// ── AcademicYear queries ───────────────────────────────────────────────────

export interface GetAcademicYearByIdQuery {
  id: string;
}

export interface GetAcademicYearByCodeQuery {
  code: string;
}

export interface ListAcademicYearsQuery {
  status?: string;
}

// ── Curriculum queries ─────────────────────────────────────────────────────

export interface GetCurriculumByIdQuery {
  id: string;
}

export interface GetCurriculumByCodeQuery {
  code: string;
}

export interface ListCurriculumsQuery {
  gradeLevelId?: string;
  activeOnly?: boolean;
}

// ── CourseAssignment queries ───────────────────────────────────────────────

export interface GetCourseAssignmentByIdQuery {
  id: string;
}

export interface ListCourseAssignmentsQuery {
  subjectId?: string;
  teacherId?: string;
  gradeLevelId?: string;
}

// ── AcademicCalendar queries ───────────────────────────────────────────────

export interface GetAcademicCalendarByDateQuery {
  date: string;
}

export interface ListAcademicCalendarQuery {
  week?: number;
}
