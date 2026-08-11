import { SchoolDayId } from '../value-objects/SchoolDayId';
import { AcademicWeek } from '../value-objects/AcademicWeek';
import { AcademicCalendarDate } from '../value-objects/AcademicCalendarDate';
import { SchoolDay } from '../value-objects/SchoolDay';

/**
 * Persistence record for a school day in the academic calendar.
 */
export interface AcademicCalendarRecord {
  id: string;
  date: string;
  isInstructional: boolean;
  academicWeek?: number;
}

/**
 * Repository contract for the Academic Calendar (school days).
 */
export interface IAcademicCalendarRepository {
  save(record: AcademicCalendarRecord): Promise<AcademicCalendarRecord | null>;
  findById(id: SchoolDayId): Promise<AcademicCalendarRecord | null>;
  findByDate(date: AcademicCalendarDate): Promise<AcademicCalendarRecord | null>;
  getByWeek(week: AcademicWeek): Promise<AcademicCalendarRecord[]>;
  getAll(): Promise<AcademicCalendarRecord[]>;
  delete(id: SchoolDayId): Promise<boolean>;
}
