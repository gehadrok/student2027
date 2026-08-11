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

  async save(command: SaveCourseAssignmentCommand): Promise<CourseAssignmentDto> {
    const saved = await this.repo.save(toRecord(command));
    if (!saved) {
      throw new Error(`CourseAssignment save failed: ${command.id}`);
    }
    return courseAssignmentRecordToDto(saved);
  }

  async delete(command: DeleteCourseAssignmentCommand): Promise<boolean> {
    return this.repo.delete(new CourseAssignmentId(command.id));
  }

  async getById(query: GetCourseAssignmentByIdQuery): Promise<CourseAssignmentDto> {
    const record = await this.repo.findById(new CourseAssignmentId(query.id));
    if (!record) {
      throw new Error(`CourseAssignment not found: ${query.id}`);
    }
    return courseAssignmentRecordToDto(record);
  }

  async list(query: ListCourseAssignmentsQuery): Promise<CourseAssignmentDto[]> {
    if (query.subjectId) {
      const records = await this.repo.getBySubject(new SubjectId(query.subjectId));
      return records.map(courseAssignmentRecordToDto);
    }
    if (query.teacherId) {
      const records = await this.repo.getByTeacher(new TeacherId(query.teacherId));
      return records.map(courseAssignmentRecordToDto);
    }
    if (query.gradeLevelId) {
      const records = await this.repo.getByGradeLevel(new GradeLevelId(query.gradeLevelId));
      return records.map(courseAssignmentRecordToDto);
    }
    const records = await this.repo.getAll();
    return records.map(courseAssignmentRecordToDto);
  }

  async listByCurriculum(curriculumId: string): Promise<CourseAssignmentDto[]> {
    const records = await this.repo.getByCurriculum(new CurriculumId(curriculumId));
    return records.map(courseAssignmentRecordToDto);
  }
}
