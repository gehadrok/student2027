import { CourseAssignmentRecord } from '../../domain/repositories/ICourseAssignmentRepository';

/**
 * Row shape for the subjects table (existing schema from schema.sql).
 * Pragmatic mapping: course assignments map onto subjects columns
 * (id, subject_id, teacher_id, class_id=gradeLevelId, weekly_hours, max_score).
 */
export interface CourseAssignmentRow {
  id: string;
  subject_id?: string;
  teacher_id?: string;
  class_id?: string;
  weekly_hours: number;
  is_active: number;
}

export function courseAssignmentRecordToRow(record: CourseAssignmentRecord): CourseAssignmentRow {
  return {
    id: record.id,
    subject_id: record.subjectId,
    teacher_id: record.teacherId,
    class_id: record.gradeLevelId,
    weekly_hours: record.weeklyPeriods ?? record.creditHours ?? 0,
    is_active: record.isActive === false ? 0 : 1,
  };
}

export function courseAssignmentRowToRecord(row: CourseAssignmentRow): CourseAssignmentRecord {
  return {
    id: row.id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    gradeLevelId: row.class_id,
    weeklyPeriods: row.weekly_hours,
    isActive: row.is_active === 1,
  };
}
