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
  save(record: CourseAssignmentRecord): Promise<CourseAssignmentRecord | null>;
  findById(id: CourseAssignmentId): Promise<CourseAssignmentRecord | null>;
  getBySubject(subjectId: SubjectId): Promise<CourseAssignmentRecord[]>;
  getByTeacher(teacherId: TeacherId): Promise<CourseAssignmentRecord[]>;
  getByGradeLevel(gradeLevelId: GradeLevelId): Promise<CourseAssignmentRecord[]>;
  getByCurriculum(curriculumId: CurriculumId): Promise<CourseAssignmentRecord[]>;
  getAll(): Promise<CourseAssignmentRecord[]>;
  delete(id: CourseAssignmentId): Promise<boolean>;
}
