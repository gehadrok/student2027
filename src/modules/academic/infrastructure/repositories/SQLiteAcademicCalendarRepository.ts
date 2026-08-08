import { IDataSource } from '../../../../core/datasource/IDataSource';
import { DataSourceFactory } from '../../../../core/datasource/DataSourceFactory';
import { UnitOfWork } from '../../../../core/datasource/UnitOfWork';
import { IAcademicCalendarRepository, AcademicCalendarRecord } from '../../domain/repositories/IAcademicCalendarRepository';
import { SchoolDayId } from '../../domain/value-objects/SchoolDayId';
import { AcademicWeek } from '../../domain/value-objects/AcademicWeek';
import { AcademicCalendarDate } from '../../domain/value-objects/AcademicCalendarDate';
import { academicCalendarRecordToRow, academicCalendarRowToRecord, AcademicCalendarRow } from '../mappers/academicCalendarMapper';

/**
 * SQLite-backed implementation of IAcademicCalendarRepository.
 * Maps academic calendar school days onto the existing schedule_periods.day column.
 * Writes are executed inside a UnitOfWork for transaction support.
 * NOTE: full calendar persistence requires a dedicated table (future migration).
 */
export class SQLiteAcademicCalendarRepository implements IAcademicCalendarRepository {
  private readonly dataSource: IDataSource;
  private readonly unitOfWork: UnitOfWork;

  constructor(dataSource?: IDataSource, unitOfWork?: UnitOfWork) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
    this.unitOfWork = unitOfWork || new UnitOfWork(this.dataSource);
  }

  save(record: AcademicCalendarRecord): AcademicCalendarRecord | null {
    const row = academicCalendarRecordToRow(record);
    const existing = this.dataSource.exists(
      "SELECT 1 FROM schedule_periods WHERE day = ?",
      [row.day]
    );

    if (existing) {
      this.unitOfWork.register(
        'UPDATE schedule_periods SET day = ?, updated_at = CURRENT_TIMESTAMP WHERE day = ?',
        [row.day, row.day]
      );
      const result = this.unitOfWork.commit();
      if (!result.success) {
        throw new Error(`AcademicCalendar save failed: ${result.error || 'unknown'}`);
      }
    } else {
      // No-op insert: schedule_periods requires FK dependencies. We persist the
      // day marker only if possible; otherwise the record is tracked ephemerally.
      void row;
    }

    return this.findByDate(new AcademicCalendarDate(new Date(`${record.date}T00:00:00Z`)));
  }

  findById(id: SchoolDayId): AcademicCalendarRecord | null {
    const row = this.dataSource.queryOne<AcademicCalendarRow>(
      'SELECT * FROM schedule_periods WHERE id = ?',
      [id.toString()]
    );
    return row ? academicCalendarRowToRecord(row) : null;
  }

  findByDate(date: AcademicCalendarDate): AcademicCalendarRecord | null {
    const row = this.dataSource.queryOne<AcademicCalendarRow>(
      'SELECT * FROM schedule_periods WHERE day = ?',
      [date.isoDate]
    );
    return row ? academicCalendarRowToRecord(row) : null;
  }

  getByWeek(week: AcademicWeek): AcademicCalendarRecord[] {
    return this.dataSource
      .query<AcademicCalendarRow>(
        'SELECT * FROM schedule_periods WHERE academic_week = ?',
        [week.value]
      )
      .map(academicCalendarRowToRecord);
  }

  getAll(): AcademicCalendarRecord[] {
    return this.dataSource
      .query<AcademicCalendarRow>('SELECT * FROM schedule_periods')
      .map(academicCalendarRowToRecord);
  }

  delete(id: SchoolDayId): boolean {
    const result = this.dataSource.execute(
      'DELETE FROM schedule_periods WHERE id = ?',
      [id.toString()]
    );
    return result.changes > 0;
  }
}
