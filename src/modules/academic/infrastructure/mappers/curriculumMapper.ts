import { CurriculumRecord } from '../../domain/repositories/ICurriculumRepository';

/**
 * Row shape for the subjects_master table (existing schema).
 * Pragmatic mapping: curriculum records map onto subjects_master columns
 * (code, name_ar, name_en, description, grade_level_id, is_active, display_order).
 */
export interface CurriculumRow {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string | null;
  description?: string | null;
  grade_level_id?: string | null;
  is_active: number;
  display_order: number;
}

export function curriculumRecordToRow(record: CurriculumRecord): CurriculumRow {
  return {
    id: record.id,
    code: record.code,
    name_ar: record.nameAr,
    name_en: record.nameEn ?? null,
    description: record.description ?? null,
    grade_level_id: record.gradeLevelId ?? null,
    is_active: record.isActive === false ? 0 : 1,
    display_order: record.displayOrder ?? 0,
  };
}

export function curriculumRowToRecord(row: CurriculumRow): CurriculumRecord {
  return {
    id: row.id,
    code: row.code,
    nameAr: row.name_ar,
    nameEn: row.name_en ?? undefined,
    description: row.description ?? undefined,
    educationStageId: undefined,
    gradeLevelId: row.grade_level_id ?? undefined,
    isActive: row.is_active === 1,
    displayOrder: row.display_order,
  };
}
