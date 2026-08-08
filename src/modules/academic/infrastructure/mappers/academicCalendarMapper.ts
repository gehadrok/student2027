import { AcademicCalendarRecord } from '../../domain/repositories/IAcademicCalendarRepository';

/**
 * Row shape for the schedule_periods table (existing schema from schema.sql).
 * Pragmatic mapping: academic calendar school days map onto the day column plus
 * a synthetic instructional flag. Full calendar persistence requires a dedicated
 * table (future migration — no SQL schema changes allowed in this phase).
 */
export interface AcademicCalendarRow {
  id: string;
  day: string;
  academic_week: number;
}

export function academicCalendarRecordToRow(record: AcademicCalendarRecord): AcademicCalendarRow {
  return {
    id: record.id,
    day: record.date,
    academic_week: record.academicWeek ?? 1,
  };
}

export function academicCalendarRowToRecord(row: AcademicCalendarRow): AcademicCalendarRecord {
  const date = row.day.split('T')[0];
  return {
    id: row.id,
    date,
    isInstructional: true,
    academicWeek: row.academic_week,
  };
}
