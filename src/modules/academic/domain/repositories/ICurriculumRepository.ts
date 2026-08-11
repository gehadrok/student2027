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
  save(record: CurriculumRecord): Promise<CurriculumRecord | null>;
  findById(id: CurriculumId): Promise<CurriculumRecord | null>;
  findByCode(code: CurriculumCode): Promise<CurriculumRecord | null>;
  getByStage(stageId: EducationStageId): Promise<CurriculumRecord[]>;
  getByGradeLevel(gradeLevelId: GradeLevelId): Promise<CurriculumRecord[]>;
  getAll(activeOnly?: boolean): Promise<CurriculumRecord[]>;
  delete(id: CurriculumId): Promise<boolean>;
}
