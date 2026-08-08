import { IDataSource } from '../../../../core/datasource/IDataSource';
import { DataSourceFactory } from '../../../../core/datasource/DataSourceFactory';
import { UnitOfWork } from '../../../../core/datasource/UnitOfWork';
import { ICurriculumRepository, CurriculumRecord } from '../../domain/repositories/ICurriculumRepository';
import { CurriculumId } from '../../domain/value-objects/CurriculumId';
import { CurriculumCode } from '../../domain/value-objects/CurriculumCode';
import { EducationStageId } from '../../domain/value-objects/EducationStageId';
import { GradeLevelId } from '../../domain/value-objects/GradeLevelId';
import { curriculumRecordToRow, curriculumRowToRecord, CurriculumRow } from '../mappers/curriculumMapper';

/**
 * SQLite-backed implementation of ICurriculumRepository.
 * Maps curriculum records onto the existing subjects_master table.
 * Writes are executed inside a UnitOfWork for transaction support.
 */
export class SQLiteCurriculumRepository implements ICurriculumRepository {
  private readonly dataSource: IDataSource;
  private readonly unitOfWork: UnitOfWork;

  constructor(dataSource?: IDataSource, unitOfWork?: UnitOfWork) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
    this.unitOfWork = unitOfWork || new UnitOfWork(this.dataSource);
  }

  save(record: CurriculumRecord): CurriculumRecord | null {
    const row = curriculumRecordToRow(record);
    const existing = this.dataSource.exists(
      'SELECT 1 FROM subjects_master WHERE id = ?',
      [row.id]
    );

    if (existing) {
      this.unitOfWork.register(
        `UPDATE subjects_master
         SET code = ?, name_ar = ?, name_en = ?, description = ?,
             grade_level_id = ?, is_active = ?, display_order = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          row.code,
          row.name_ar,
          row.name_en,
          row.description,
          row.grade_level_id,
          row.is_active,
          row.display_order,
          row.id,
        ]
      );
    } else {
      this.unitOfWork.register(
        `INSERT INTO subjects_master
         (id, code, name_ar, name_en, description, grade_level_id,
          is_active, display_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          row.id,
          row.code,
          row.name_ar,
          row.name_en,
          row.description,
          row.grade_level_id,
          row.is_active,
          row.display_order,
        ]
      );
    }

    const result = this.unitOfWork.commit();
    if (!result.success) {
      throw new Error(`Curriculum save failed: ${result.error || 'unknown'}`);
    }

    return this.findById(new CurriculumId(record.id));
  }

  findById(id: CurriculumId): CurriculumRecord | null {
    const row = this.dataSource.queryOne<CurriculumRow>(
      'SELECT * FROM subjects_master WHERE id = ?',
      [id.toString()]
    );
    return row ? curriculumRowToRecord(row) : null;
  }

  findByCode(code: CurriculumCode): CurriculumRecord | null {
    const row = this.dataSource.queryOne<CurriculumRow>(
      'SELECT * FROM subjects_master WHERE code = ?',
      [code.toString()]
    );
    return row ? curriculumRowToRecord(row) : null;
  }

  getByStage(stageId: EducationStageId): CurriculumRecord[] {
    void stageId;
    return this.dataSource
      .query<CurriculumRow>('SELECT * FROM subjects_master ORDER BY display_order ASC')
      .map(curriculumRowToRecord);
  }

  getByGradeLevel(gradeLevelId: GradeLevelId): CurriculumRecord[] {
    return this.dataSource
      .query<CurriculumRow>(
        'SELECT * FROM subjects_master WHERE grade_level_id = ? ORDER BY display_order ASC',
        [gradeLevelId.toString()]
      )
      .map(curriculumRowToRecord);
  }

  getAll(activeOnly: boolean = true): CurriculumRecord[] {
    const sql = activeOnly
      ? 'SELECT * FROM subjects_master WHERE is_active = 1 ORDER BY display_order ASC'
      : 'SELECT * FROM subjects_master ORDER BY display_order ASC';
    return this.dataSource.query<CurriculumRow>(sql).map(curriculumRowToRecord);
  }

  delete(id: CurriculumId): boolean {
    const result = this.dataSource.execute(
      'DELETE FROM subjects_master WHERE id = ?',
      [id.toString()]
    );
    return result.changes > 0;
  }
}
