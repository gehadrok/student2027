import { CurriculumId } from '../value-objects/CurriculumId';
import { CurriculumCode } from '../value-objects/CurriculumCode';
import { EducationStageId } from '../value-objects/EducationStageId';
import { GradeLevelId } from '../value-objects/GradeLevelId';

/**
 * Persistence record for a curriculum.
 * Maps the domain Curriculum concept onto available persistence columns.
 */
export interface CurriculumRecord {
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

/**
 * Repository contract for Curriculum data.
 */
export interface ICurriculumRepository {
  save(record: CurriculumRecord): CurriculumRecord | null;
  findById(id: CurriculumId): CurriculumRecord | null;
  findByCode(code: CurriculumCode): CurriculumRecord | null;
  getByStage(stageId: EducationStageId): CurriculumRecord[];
  getByGradeLevel(gradeLevelId: GradeLevelId): CurriculumRecord[];
  getAll(activeOnly?: boolean): CurriculumRecord[];
  delete(id: CurriculumId): boolean;
}
