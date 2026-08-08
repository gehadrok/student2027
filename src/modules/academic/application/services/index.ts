/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer.
 *
 * Application Service exports. This module wires the concrete SQLite
 * repositories into the Application Services. The composition root
 * (bootstrap) is the source of truth for DI wiring; these singletons provide
 * a convenient default binding for the same repositories.
 */

import { SQLiteAcademicYearRepository } from '../../infrastructure/repositories/SQLiteAcademicYearRepository';
import { SQLiteCurriculumRepository } from '../../infrastructure/repositories/SQLiteCurriculumRepository';
import { SQLiteCourseAssignmentRepository } from '../../infrastructure/repositories/SQLiteCourseAssignmentRepository';
import { SQLiteAcademicCalendarRepository } from '../../infrastructure/repositories/SQLiteAcademicCalendarRepository';
import { AcademicYearService } from './AcademicYearService';
import { CurriculumService } from './CurriculumService';
import { CourseAssignmentService } from './CourseAssignmentService';
import { AcademicCalendarService } from './AcademicCalendarService';

export { AcademicYearService } from './AcademicYearService';
export { CurriculumService } from './CurriculumService';
export { CourseAssignmentService } from './CourseAssignmentService';
export { AcademicCalendarService } from './AcademicCalendarService';

export const academicYearService = new AcademicYearService(new SQLiteAcademicYearRepository());
export const curriculumService = new CurriculumService(new SQLiteCurriculumRepository());
export const courseAssignmentService = new CourseAssignmentService(new SQLiteCourseAssignmentRepository());
export const academicCalendarService = new AcademicCalendarService(new SQLiteAcademicCalendarRepository());
