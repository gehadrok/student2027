/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer DTO Mappers.
 *
 * Pure mapping functions between Domain objects / persistence records and the
 * application-layer DTOs. No business rules live here — only shape translation.
 */

import { AcademicYear } from '../../domain/aggregates/AcademicYear';
import { AcademicTerm } from '../../domain/entities/AcademicTerm';
import type { CurriculumRecord } from '../../domain/repositories/ICurriculumRepository';
import type { CourseAssignmentRecord } from '../../domain/repositories/ICourseAssignmentRepository';
import type { AcademicCalendarRecord } from '../../domain/repositories/IAcademicCalendarRepository';
import {
  AcademicYearDto,
  AcademicYearSummaryDto,
  AcademicTermDto,
  CurriculumDto,
  CourseAssignmentDto,
  AcademicCalendarDto,
} from '../dtos';

function toIso(date: Date): string {
  return date.toISOString();
}

function toTermDto(term: AcademicTerm): AcademicTermDto {
  return {
    id: term.id.toString(),
    code: term.code.toString(),
    startDate: toIso(term.dateRange.startDate),
    endDate: toIso(term.dateRange.endDate),
    status: term.status,
  };
}

export function academicYearToDto(year: AcademicYear): AcademicYearDto {
  return {
    id: year.id.toString(),
    code: year.code.toString(),
    schoolScopeId: year.schoolScopeId.toString(),
    startDate: toIso(year.dateRange.startDate),
    endDate: toIso(year.dateRange.endDate),
    status: year.status,
    version: year.version,
    ministryReferenceCode: year.ministryReferenceCode,
    terms: year.terms.map(toTermDto),
  };
}

export function academicYearToSummaryDto(year: AcademicYear): AcademicYearSummaryDto {
  return {
    id: year.id.toString(),
    code: year.code.toString(),
    status: year.status,
    version: year.version,
    startDate: toIso(year.dateRange.startDate),
    endDate: toIso(year.dateRange.endDate),
    termCount: year.terms.length,
  };
}

export function curriculumRecordToDto(record: CurriculumRecord): CurriculumDto {
  return { ...record };
}

export function courseAssignmentRecordToDto(record: CourseAssignmentRecord): CourseAssignmentDto {
  return { ...record };
}

export function academicCalendarRecordToDto(record: AcademicCalendarRecord): AcademicCalendarDto {
  return { ...record };
}
