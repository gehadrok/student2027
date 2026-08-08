/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * Typed models for the Academic REST API consumed by the presentation layer.
 * These mirror the backend application-layer DTOs (src/modules/academic/application/dtos)
 * and command payloads. They are plain data shapes only — no business logic.
 */

// ── Shared API envelope ─────────────────────────────────────────────────────
export interface ApiErrorEnvelope {
  error?: string;
  details?: unknown;
}

// ── AcademicYear / AcademicTerm ─────────────────────────────────────────────

export interface AcademicTermApi {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface AcademicYearApi {
  id: string;
  code: string;
  schoolScopeId: string;
  startDate: string;
  endDate: string;
  status: string;
  version: number;
  ministryReferenceCode?: string;
  terms: AcademicTermApi[];
}

export interface AcademicYearSummaryApi {
  id: string;
  code: string;
  status: string;
  version: number;
  startDate: string;
  endDate: string;
  termCount: number;
}

export interface CreateAcademicYearPayload {
  id: string;
  code: string;
  schoolScopeId: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  ministryReferenceCode?: string;
}

export interface AddAcademicTermPayload {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  changedBy: string;
}

export interface YearLifecyclePayload {
  changedBy: string;
  reason?: string;
}

export interface CreateYearWithTermsPayload {
  year: CreateAcademicYearPayload;
  terms: AddAcademicTermPayload[];
}

// ── Curriculum ─────────────────────────────────────────────────────────────

export interface CurriculumApi {
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

export interface SaveCurriculumPayload {
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

export interface CourseAssignmentApi {
  id: string;
  curriculumId?: string;
  subjectId?: string;
  gradeLevelId?: string;
  teacherId?: string;
  creditHours?: number;
  weeklyPeriods?: number;
  isActive?: boolean;
}

export interface SaveCourseAssignmentPayload {
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

export interface AcademicCalendarApi {
  id: string;
  date: string;
  isInstructional: boolean;
  academicWeek?: number;
}

export interface SaveAcademicCalendarPayload {
  id: string;
  date: string;
  isInstructional: boolean;
  academicWeek?: number;
}
