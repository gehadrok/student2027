/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer.
 *
 * CourseAssignmentService provides CRUD + query orchestration over the
 * ICourseAssignmentRepository. Orchestration-only; no business rules.
 */

import { ICourseAssignmentRepository, CourseAssignmentRecord } from '../../domain/repositories/ICourseAssignmentRepository';
import { CourseAssignmentId } from '../../domain/value-objects/CourseAssignmentId';
import { SubjectId } from '../../domain/value-objects/SubjectId';
import { TeacherId } from '../../domain/value-objects/TeacherId';
import { GradeLevelId } from '../../domain/value-objects/GradeLevelId';
import { CurriculumId } from '../../domain/value-objects/CurriculumId';
import { SaveCourseAssignmentCommand, DeleteCourseAssignmentCommand } from '../commands';
import { GetCourseAssignmentByIdQuery, ListCourseAssignmentsQuery } from '../queries';
import { CourseAssignmentDto } from '../dtos';
import { courseAssignmentRecordToDto } from '../mappers';

function toRecord(command: SaveCourseAssignmentCommand): CourseAssignmentRecord {
  return {
    id: command.id,
    curriculumId: command.curriculumId,
    subjectId: command.subjectId,
    gradeLevelId: command.gradeLevelId,
    teacherId: command.teacherId,
    creditHours: command.creditHours,
    weeklyPeriods: command.weeklyPeriods,
    isActive: command.isActive,
  };
}

export class CourseAssignmentService {
  constructor(private readonly repo: ICourseAssignmentRepository) {}

  save(command: SaveCourseAssignmentCommand): CourseAssignmentDto {
    const saved = this.repo.save(toRecord(command));
    if (!saved) {
      throw new Error(`CourseAssignment save failed: ${command.id}`);
    }
    return courseAssignmentRecordToDto(saved);
  }

  delete(command: DeleteCourseAssignmentCommand): boolean {
    return this.repo.delete(new CourseAssignmentId(command.id));
  }

  getById(query: GetCourseAssignmentByIdQuery): CourseAssignmentDto {
    const record = this.repo.findById(new CourseAssignmentId(query.id));
    if (!record) {
      throw new Error(`CourseAssignment not found: ${query.id}`);
    }
    return courseAssignmentRecordToDto(record);
  }

  list(query: ListCourseAssignmentsQuery): CourseAssignmentDto[] {
    if (query.subjectId) {
      return this.repo.getBySubject(new SubjectId(query.subjectId)).map(courseAssignmentRecordToDto);
    }
    if (query.teacherId) {
      return this.repo.getByTeacher(new TeacherId(query.teacherId)).map(courseAssignmentRecordToDto);
    }
    if (query.gradeLevelId) {
      return this.repo.getByGradeLevel(new GradeLevelId(query.gradeLevelId)).map(courseAssignmentRecordToDto);
    }
    return this.repo.getAll().map(courseAssignmentRecordToDto);
  }

  listByCurriculum(curriculumId: string): CourseAssignmentDto[] {
    return this.repo.getByCurriculum(new CurriculumId(curriculumId)).map(courseAssignmentRecordToDto);
  }
}
