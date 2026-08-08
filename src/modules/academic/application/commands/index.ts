/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer (CQRS Commands).
 *
 * Command contracts (request intents) for the Academic bounded context.
 * Each command is a plain data shape consumed by an Application Service.
 * No business logic lives in these contracts.
 */

// ── AcademicYear lifecycle commands ────────────────────────────────────────

export interface CreateAcademicYearCommand {
  id: string;
  code: string;
  schoolScopeId: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  ministryReferenceCode?: string;
}

export interface AddAcademicTermCommand {
  academicYearId: string;
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  changedBy: string;
}

export interface ApproveAcademicYearCommand {
  academicYearId: string;
  changedBy: string;
}

export interface ActivateAcademicYearCommand {
  academicYearId: string;
  changedBy: string;
}

export interface CloseAcademicYearCommand {
  academicYearId: string;
  changedBy: string;
}

export interface ArchiveAcademicYearCommand {
  academicYearId: string;
  reason: string;
  changedBy: string;
}

export interface OpenTermCommand {
  academicYearId: string;
  termId: string;
  changedBy: string;
}

export interface LockTermCommand {
  academicYearId: string;
  termId: string;
  changedBy: string;
}

export interface CloseTermCommand {
  academicYearId: string;
  termId: string;
  changedBy: string;
}

export interface DeleteAcademicYearCommand {
  academicYearId: string;
}

// ── Curriculum commands ────────────────────────────────────────────────────

export interface SaveCurriculumCommand {
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

export interface DeleteCurriculumCommand {
  id: string;
}

// ── CourseAssignment commands ──────────────────────────────────────────────

export interface SaveCourseAssignmentCommand {
  id: string;
  curriculumId?: string;
  subjectId?: string;
  gradeLevelId?: string;
  teacherId?: string;
  creditHours?: number;
  weeklyPeriods?: number;
  isActive?: boolean;
}

export interface DeleteCourseAssignmentCommand {
  id: string;
}

// ── AcademicCalendar commands ──────────────────────────────────────────────

export interface SaveAcademicCalendarCommand {
  id: string;
  date: string;
  isInstructional: boolean;
  academicWeek?: number;
}

export interface DeleteAcademicCalendarCommand {
  id: string;
}
