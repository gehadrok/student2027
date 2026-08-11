/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from '../../../core/datasource/IDataSource';
import { IStudentRepository } from '../../../core/repositories/IStudentRepository';
import { Student } from '../../../types';
import { DataSourceFactory } from '../../../core/datasource/DataSourceFactory';

/**
 * Student repository implementation.
 * Uses constructor-based dependency injection for the DataSource.
 * Violation fixed: no longer imports getRealmDB() from lib/db.
 */
export class StudentRepository implements IStudentRepository {
  private dataSource: IDataSource;

  constructor(dataSource?: IDataSource) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
  }

  async getAll(): Promise<Student[]> {
    const rows = await this.dataSource.query<any>(
      `SELECT id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name,
              parent_phone, birth_date, gender, photo, status, health_notes, enrollment_date
       FROM students ORDER BY name ASC`
    );

    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      academicId: r.academic_id,
      name: r.name,
      classId: r.class_id,
      sectionId: r.section_id,
      parentId: r.parent_id,
      parentName: r.parent_name,
      parentPhone: r.parent_phone,
      birthDate: r.birth_date,
      gender: r.gender,
      photo: r.photo || undefined,
      status: r.status,
      healthNotes: r.health_notes || undefined,
      enrollmentDate: r.enrollment_date,
    }));
  }

  async getById(id: string): Promise<Student | undefined> {
    const row = await this.dataSource.queryOne<any>(
      `SELECT id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name,
              parent_phone, birth_date, gender, photo, status, health_notes, enrollment_date
       FROM students WHERE id = ?`,
      [id]
    );
    if (!row) return undefined;

    return {
      id: row.id,
      userId: row.user_id,
      academicId: row.academic_id,
      name: row.name,
      classId: row.class_id,
      sectionId: row.section_id,
      parentId: row.parent_id,
      parentName: row.parent_name,
      parentPhone: row.parent_phone,
      birthDate: row.birth_date,
      gender: row.gender,
      photo: row.photo || undefined,
      status: row.status,
      healthNotes: row.health_notes || undefined,
      enrollmentDate: row.enrollment_date,
    };
  }

  async getByClass(classId: string): Promise<Student[]> {
    const rows = await this.dataSource.query<any>(
      `SELECT id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name,
              parent_phone, birth_date, gender, photo, status, health_notes, enrollment_date
       FROM students WHERE class_id = ? ORDER BY name ASC`,
      [classId]
    );

    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      academicId: r.academic_id,
      name: r.name,
      classId: r.class_id,
      sectionId: r.section_id,
      parentId: r.parent_id,
      parentName: r.parent_name,
      parentPhone: r.parent_phone,
      birthDate: r.birth_date,
      gender: r.gender,
      photo: r.photo || undefined,
      status: r.status,
      healthNotes: r.health_notes || undefined,
      enrollmentDate: r.enrollment_date,
    }));
  }

  async save(student: Student): Promise<Student> {
    await this.dataSource.execute(
      `INSERT OR REPLACE INTO students (
        id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name,
        parent_phone, birth_date, gender, photo, status, health_notes, enrollment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.id,
        student.userId,
        student.academicId,
        student.name,
        student.classId,
        student.sectionId,
        student.parentId,
        student.parentName,
        student.parentPhone,
        student.birthDate,
        student.gender,
        student.photo || null,
        student.status,
        student.healthNotes || null,
        student.enrollmentDate,
      ]
    );

    // Also pair in parent_students
    if (student.parentId && student.id) {
      await this.dataSource.execute(
        'INSERT OR IGNORE INTO parent_students (parent_id, student_id) VALUES (?, ?)',
        [student.parentId, student.id]
      );
    }

    return student;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dataSource.execute('DELETE FROM students WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

// Singleton instance with default DataSource
export const studentRepository = new StudentRepository();

