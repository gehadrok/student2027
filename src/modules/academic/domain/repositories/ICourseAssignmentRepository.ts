import { CourseAssignmentId } from '../value-objects/CourseAssignmentId';
import { CurriculumId } from '../value-objects/CurriculumId';
import { SubjectId } from '../value-objects/SubjectId';
import { TeacherId } from '../value-objects/TeacherId';
import { GradeLevelId } from '../value-objects/GradeLevelId';

/**
 * Persistence record for a course assignment.
 * Maps the domain CourseAssignment concept onto available persistence columns.
 */
export interface CourseAssignmentRecord {
  id: string;
  curriculumId?: string;
  subjectId?: string;
  gradeLevelId?: string;
  teacherId?: string;
  creditHours?: number;
  weeklyPeriods?: number;
  isActive?: boolean;
}

/**
 * Repository contract for CourseAssignment data.
 */
export interface ICourseAssignmentRepository {
  save(record: CourseAssignmentRecord): CourseAssignmentRecord | null;
  findById(id: CourseAssignmentId): CourseAssignmentRecord | null;
  getBySubject(subjectId: SubjectId): CourseAssignmentRecord[];
  getByTeacher(teacherId: TeacherId): CourseAssignmentRecord[];
  getByGradeLevel(gradeLevelId: GradeLevelId): CourseAssignmentRecord[];
  getByCurriculum(curriculumId: CurriculumId): CourseAssignmentRecord[];
  getAll(): CourseAssignmentRecord[];
  delete(id: CourseAssignmentId): boolean;
}
