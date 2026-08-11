import { IDataSource } from '../../../../core/datasource/IDataSource';
import { DataSourceFactory } from '../../../../core/datasource/DataSourceFactory';
import { UnitOfWork } from '../../../../core/datasource/UnitOfWork';
import { ICourseAssignmentRepository, CourseAssignmentRecord } from '../../domain/repositories/ICourseAssignmentRepository';
import { CourseAssignmentId } from '../../domain/value-objects/CourseAssignmentId';
import { CurriculumId } from '../../domain/value-objects/CurriculumId';
import { SubjectId } from '../../domain/value-objects/SubjectId';
import { TeacherId } from '../../domain/value-objects/TeacherId';
import { GradeLevelId } from '../../domain/value-objects/GradeLevelId';
import { courseAssignmentRecordToRow, courseAssignmentRowToRecord, CourseAssignmentRow } from '../mappers/courseAssignmentMapper';

/**
 * SQLite-backed implementation of ICourseAssignmentRepository.
 * Maps course assignment records onto the existing subjects table.
 * Writes are executed inside a UnitOfWork for transaction support.
 */
export class SQLiteCourseAssignmentRepository implements ICourseAssignmentRepository {
  private readonly dataSource: IDataSource;
  private readonly unitOfWork: UnitOfWork;

  constructor(dataSource?: IDataSource, unitOfWork?: UnitOfWork) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
    this.unitOfWork = unitOfWork || new UnitOfWork(this.dataSource);
  }

  async save(record: CourseAssignmentRecord): Promise<CourseAssignmentRecord | null> {
    const row = courseAssignmentRecordToRow(record);
    const existing = await this.dataSource.exists(
      'SELECT 1 FROM subjects WHERE id = ?',
      [row.id]
    );

    if (existing) {
      this.unitOfWork.register(
        `UPDATE subjects
         SET subject_id = ?, teacher_id = ?, class_id = ?, weekly_hours = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [row.subject_id, row.teacher_id, row.class_id, row.weekly_hours, row.id]
      );
    } else {
      this.unitOfWork.register(
        `INSERT INTO subjects
         (id, subject_id, teacher_id, class_id, weekly_hours, max_score, pass_score,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 100.0, 50.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [row.id, row.subject_id, row.teacher_id, row.class_id, row.weekly_hours]
      );
    }

    const result = await this.unitOfWork.commit();
    if (!result.success) {
      throw new Error(`CourseAssignment save failed: ${result.error || 'unknown'}`);
    }

    return this.findById(new CourseAssignmentId(record.id));
  }

  async findById(id: CourseAssignmentId): Promise<CourseAssignmentRecord | null> {
    const row = await this.dataSource.queryOne<CourseAssignmentRow>(
      'SELECT * FROM subjects WHERE id = ?',
      [id.toString()]
    );
    return row ? courseAssignmentRowToRecord(row) : null;
  }

  async getBySubject(subjectId: SubjectId): Promise<CourseAssignmentRecord[]> {
    const rows = await this.dataSource.query<CourseAssignmentRow>(
      'SELECT * FROM subjects WHERE subject_id = ?',
      [subjectId.toString()]
    );
    return rows.map(courseAssignmentRowToRecord);
  }

  async getByTeacher(teacherId: TeacherId): Promise<CourseAssignmentRecord[]> {
    const rows = await this.dataSource.query<CourseAssignmentRow>(
      'SELECT * FROM subjects WHERE teacher_id = ?',
      [teacherId.toString()]
    );
    return rows.map(courseAssignmentRowToRecord);
  }

  async getByGradeLevel(gradeLevelId: GradeLevelId): Promise<CourseAssignmentRecord[]> {
    const rows = await this.dataSource.query<CourseAssignmentRow>(
      'SELECT * FROM subjects WHERE class_id = ?',
      [gradeLevelId.toString()]
    );
    return rows.map(courseAssignmentRowToRecord);
  }

  async getByCurriculum(curriculumId: CurriculumId): Promise<CourseAssignmentRecord[]> {
    void curriculumId;
    const rows = await this.dataSource.query<CourseAssignmentRow>('SELECT * FROM subjects');
    return rows.map(courseAssignmentRowToRecord);
  }

  async getAll(): Promise<CourseAssignmentRecord[]> {
    const rows = await this.dataSource.query<CourseAssignmentRow>('SELECT * FROM subjects');
    return rows.map(courseAssignmentRowToRecord);
  }

  async delete(id: CourseAssignmentId): Promise<boolean> {
    const result = await this.dataSource.execute('DELETE FROM subjects WHERE id = ?', [
      id.toString(),
    ]);
    return result.changes > 0;
  }
}
