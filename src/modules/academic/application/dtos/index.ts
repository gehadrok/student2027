/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer.
 *
 * Plain JSON-serializable Data Transfer Objects (DTOs) shared between the
 * Application Services and the Controllers. These are pure data shapes with
 * no business rules; all invariants live in the Domain layer.
 */

// ── AcademicYear ───────────────────────────────────────────────────────────

export interface AcademicTermDto {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface AcademicYearDto {
  id: string;
  code: string;
  schoolScopeId: string;
  startDate: string;
  endDate: string;
  status: string;
  version: number;
  ministryReferenceCode?: string;
  terms: AcademicTermDto[];
}

export interface AcademicYearSummaryDto {
  id: string;
  code: string;
  status: string;
  version: number;
  startDate: string;
  endDate: string;
  termCount: number;
}

// ── Curriculum ─────────────────────────────────────────────────────────────

export interface CurriculumDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  educationStageId?: string;
  gradeLevelId?: string;
  isActive?: boolean;
  displayOrder?: number;
}

// ── CourseAssignment ───────────────────────────────────────────────────────

export interface CourseAssignmentDto {
  id: string;
  curriculumId?: string;
  subjectId?: string;
  gradeLevelId?: string;
  teacherId?: string;
  creditHours?: number;
  weeklyPeriods?: number;
  isActive?: boolean;
}

// ── AcademicCalendar ───────────────────────────────────────────────────────

export interface AcademicCalendarDto {
  id: string;
  date: string;
  isInstructional: boolean;
  academicWeek?: number;
}
