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
 * Persists academic calendar school days onto the dedicated
 * `academic_calendar_days` table (day = ISO calendar date, academic_week,
 * is_instructional). New records are INSERTed; existing records (by id) are
 * UPDATEed, both inside a UnitOfWork transaction.
 */
export class SQLiteAcademicCalendarRepository implements IAcademicCalendarRepository {
  private readonly dataSource: IDataSource;
  private readonly unitOfWork: UnitOfWork;

  constructor(dataSource?: IDataSource, unitOfWork?: UnitOfWork) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
    this.unitOfWork = unitOfWork || new UnitOfWork(this.dataSource);
  }

  async save(record: AcademicCalendarRecord): Promise<AcademicCalendarRecord | null> {
    const row = academicCalendarRecordToRow(record);
    const existing = await this.dataSource.exists(
      'SELECT 1 FROM academic_calendar_days WHERE id = ?',
      [row.id]
    );

    if (existing) {
      this.unitOfWork.register(
        `UPDATE academic_calendar_days
         SET day = ?, academic_week = ?, is_instructional = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [row.day, row.academic_week, row.is_instructional ?? 1, row.id]
      );
    } else {
      this.unitOfWork.register(
        `INSERT INTO academic_calendar_days
         (id, day, academic_week, is_instructional, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [row.id, row.day, row.academic_week, row.is_instructional ?? 1]
      );
    }

    const result = await this.unitOfWork.commit();
    if (!result.success) {
      throw new Error(`AcademicCalendar save failed: ${result.error || 'unknown'}`);
    }

    return this.findById(new SchoolDayId(record.id));
  }

  async findById(id: SchoolDayId): Promise<AcademicCalendarRecord | null> {
    const row = await this.dataSource.queryOne<AcademicCalendarRow>(
      'SELECT * FROM academic_calendar_days WHERE id = ?',
      [id.toString()]
    );
    return row ? academicCalendarRowToRecord(row) : null;
  }

  async findByDate(date: AcademicCalendarDate): Promise<AcademicCalendarRecord | null> {
    const row = await this.dataSource.queryOne<AcademicCalendarRow>(
      'SELECT * FROM academic_calendar_days WHERE day = ?',
      [date.isoDate]
    );
    return row ? academicCalendarRowToRecord(row) : null;
  }

  async getByWeek(week: AcademicWeek): Promise<AcademicCalendarRecord[]> {
    const rows = await this.dataSource.query<AcademicCalendarRow>(
      'SELECT * FROM academic_calendar_days WHERE academic_week = ?',
      [week.value]
    );
    return rows.map(academicCalendarRowToRecord);
  }

  async getAll(): Promise<AcademicCalendarRecord[]> {
    const rows = await this.dataSource.query<AcademicCalendarRow>(
      'SELECT * FROM academic_calendar_days ORDER BY day ASC'
    );
    return rows.map(academicCalendarRowToRecord);
  }

  async delete(id: SchoolDayId): Promise<boolean> {
    const result = await this.dataSource.execute(
      'DELETE FROM academic_calendar_days WHERE id = ?',
      [id.toString()]
    );
    return result.changes > 0;
  }
}
