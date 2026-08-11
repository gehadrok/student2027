import { AcademicCalendarRecord } from '../../domain/repositories/IAcademicCalendarRepository';

/**
 * Row shape for the academic_calendar_days table (dedicated Academic calendar
 * persistence). Calendar days persist with (id, day = ISO date, academic_week,
 * is_instructional) and do NOT require timetable FK parents.
 */
export interface AcademicCalendarRow {
  id: string;
  day: string;
  academic_week: number;
  is_instructional?: number;
}

export function academicCalendarRecordToRow(record: AcademicCalendarRecord): AcademicCalendarRow {
  return {
    id: record.id,
    day: record.date,
    academic_week: record.academicWeek ?? 1,
    is_instructional: record.isInstructional === false ? 0 : 1,
  };
}

export function academicCalendarRowToRecord(row: AcademicCalendarRow): AcademicCalendarRecord {
  const date = row.day.split('T')[0];
  return {
    id: row.id,
    date,
    isInstructional: (row.is_instructional ?? 1) === 1,
    academicWeek: row.academic_week,
  };
}
