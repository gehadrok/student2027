import { IDataSource } from '../../../../core/datasource/IDataSource';
import { UnitOfWork } from '../../../../core/datasource/UnitOfWork';
import { DataSourceFactory } from '../../../../core/datasource/DataSourceFactory';
import { IEventBus } from '../../../../core/contracts/IEventBus';
import { EventBus } from '../../../../core/events/EventBus';
import { IAcademicYearRepository } from '../../domain/repositories/IAcademicYearRepository';
import { AcademicYear } from '../../domain/aggregates/AcademicYear';
import { AcademicYearId } from '../../domain/value-objects/AcademicYearId';
import { AcademicYearCode } from '../../domain/value-objects/AcademicYearCode';
import {
  academicYearToRows,
  academicYearFromRows,
  AcademicYearRow,
  AcademicTermRow,
} from '../mappers/academicYearMapper';

/**
 * SQLite-backed implementation of IAcademicYearRepository.
 * - Wires to IDataSource (constructor-injected, defaults to the app DataSource).
 * - Persists the aggregate + its term children inside a single UnitOfWork.
 * - Dispatches collected domain events to the EventBus after a successful commit.
 * - Reconstructs aggregates from rows via academicYearFromRows().
 */
export class SQLiteAcademicYearRepository implements IAcademicYearRepository {
  private readonly dataSource: IDataSource;
  private readonly unitOfWork: UnitOfWork;
  private readonly eventBus: IEventBus;

  constructor(
    dataSource?: IDataSource,
    unitOfWork?: UnitOfWork,
    eventBus?: IEventBus
  ) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
    this.unitOfWork = unitOfWork || new UnitOfWork(this.dataSource);
    this.eventBus = eventBus || EventBus.getInstance();
  }

  async save(year: AcademicYear): Promise<void> {
    const { year: yearRow, terms: termRows } = academicYearToRows(year);

    const existing = await this.dataSource.exists(
      'SELECT 1 FROM academic_years WHERE id = ?',
      [yearRow.id]
    );

    const queries: Array<{ sql: string; params?: any[] }> = [];

    if (existing) {
      queries.push({
        sql: `UPDATE academic_years
              SET code = ?, name_ar = ?, name_en = ?, description = ?,
                  start_date = ?, end_date = ?, is_current = ?, is_active = ?,
                  display_order = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        params: [
          yearRow.code,
          yearRow.name_ar,
          yearRow.name_en,
          yearRow.description,
          yearRow.start_date,
          yearRow.end_date,
          yearRow.is_current,
          yearRow.is_active,
          yearRow.display_order,
          yearRow.id,
        ],
      });
    } else {
      queries.push({
        sql: `INSERT INTO academic_years
              (id, code, name_ar, name_en, description, start_date, end_date,
               is_current, is_active, display_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        params: [
          yearRow.id,
          yearRow.code,
          yearRow.name_ar,
          yearRow.name_en,
          yearRow.description,
          yearRow.start_date,
          yearRow.end_date,
          yearRow.is_current,
          yearRow.is_active,
          yearRow.display_order,
        ],
      });
    }

    // Persist term children (delete + re-insert to keep in sync with the aggregate)
    for (const term of year.terms) {
      queries.push({
        sql: 'DELETE FROM academic_terms WHERE id = ?',
        params: [term.id.toString()],
      });
    }
    for (const termRow of termRows) {
      queries.push({
        sql: `INSERT INTO academic_terms
              (id, code, name_ar, name_en, description, academic_year_id,
               start_date, end_date, is_current, is_active, display_order,
               created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        params: [
          termRow.id,
          termRow.code,
          termRow.name_ar,
          termRow.name_en,
          termRow.description,
          termRow.academic_year_id,
          termRow.start_date,
          termRow.end_date,
          termRow.is_current,
          termRow.is_active,
          termRow.display_order,
        ],
      });
    }

for (const query of queries) {
      this.unitOfWork.register(query.sql, query.params);
    }
    const result = await this.unitOfWork.commit();

    if (!result.success) {
      throw new Error(`AcademicYear save failed: ${result.error || 'unknown'}`);
    }

    // Dispatch domain events after successful persistence
    const events = year.pullDomainEvents();
    for (const event of events) {
      this.eventBus.publish(event.constructor.name, event);
    }
  }

  async findById(id: AcademicYearId): Promise<AcademicYear | null> {
    const yearRow = await this.dataSource.queryOne<AcademicYearRow>(
      'SELECT * FROM academic_years WHERE id = ?',
      [id.toString()]
    );
    if (!yearRow) return null;

    const termRows = await this.dataSource.query<AcademicTermRow>(
      'SELECT * FROM academic_terms WHERE academic_year_id = ?',
      [id.toString()]
    );

    return academicYearFromRows(yearRow, termRows);
  }

  async findByCode(code: AcademicYearCode): Promise<AcademicYear | null> {
    const yearRow = await this.dataSource.queryOne<AcademicYearRow>(
      'SELECT * FROM academic_years WHERE code = ?',
      [code.toString()]
    );
    if (!yearRow) return null;

    const termRows = await this.dataSource.query<AcademicTermRow>(
      'SELECT * FROM academic_terms WHERE academic_year_id = ?',
      [yearRow.id]
    );

    return academicYearFromRows(yearRow, termRows);
  }

  async getAll(): Promise<AcademicYear[]> {
    const yearRows = await this.dataSource.query<AcademicYearRow>(
      'SELECT * FROM academic_years ORDER BY start_date ASC'
    );
    const years: AcademicYear[] = [];
    for (const yearRow of yearRows) {
      const termRows = await this.dataSource.query<AcademicTermRow>(
        'SELECT * FROM academic_terms WHERE academic_year_id = ?',
        [yearRow.id]
      );
      years.push(academicYearFromRows(yearRow, termRows));
    }
    return years;
  }

  async delete(id: AcademicYearId): Promise<boolean> {
    const result = await this.dataSource.execute(
      'DELETE FROM academic_years WHERE id = ?',
      [id.toString()]
    );
    return result.changes > 0;
  }
}
