/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from '../../../core/datasource/IDataSource';
import { ITeacherRepository } from '../../../core/repositories/ITeacherRepository';
import { Teacher } from '../../../types';
import { DataSourceFactory } from '../../../core/datasource/DataSourceFactory';

/**
 * Teacher repository implementation.
 * Uses constructor-based dependency injection for the DataSource.
 * Violation fixed: no longer imports getRealmDB() from lib/db.
 */
export class TeacherRepository implements ITeacherRepository {
  private dataSource: IDataSource;

  constructor(dataSource?: IDataSource) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
  }

  getAll(): Teacher[] {
    const rows = this.dataSource.query<any>(
      `SELECT id, user_id, name, email, phone, specialization, qualification, experience_years, photo, status
       FROM teachers ORDER BY name ASC`
    );

    return rows.map((r: any) => {
      const subRows = this.dataSource.query<any>(
        'SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?',
        [r.id]
      );
      const clsRows = this.dataSource.query<any>(
        'SELECT class_id FROM teacher_classes WHERE teacher_id = ?',
        [r.id]
      );
      return {
        id: r.id,
        userId: r.user_id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        specialization: r.specialization,
        qualification: r.qualification,
        experienceYears: r.experience_years,
        subjectIds: subRows.map((s: any) => s.subject_id),
        classIds: clsRows.map((c: any) => c.class_id),
        photo: r.photo || undefined,
        status: r.status,
      };
    });
  }

  getById(id: string): Teacher | undefined {
    const row = this.dataSource.queryOne<any>(
      `SELECT id, user_id, name, email, phone, specialization, qualification, experience_years, photo, status
       FROM teachers WHERE id = ?`,
      [id]
    );
    if (!row) return undefined;

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      specialization: row.specialization,
      qualification: row.qualification,
      experienceYears: row.experience_years,
      subjectIds: [],
      classIds: [],
      photo: row.photo || undefined,
      status: row.status,
    };
  }

  save(teacher: Teacher): Teacher {
    this.dataSource.execute(
      `INSERT OR REPLACE INTO teachers (
        id, user_id, name, email, phone, specialization, qualification, experience_years, photo, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        teacher.id,
        teacher.userId,
        teacher.name,
        teacher.email,
        teacher.phone,
        teacher.specialization,
        teacher.qualification,
        teacher.experienceYears,
        teacher.photo || null,
        teacher.status,
      ]
    );

    if (teacher.subjectIds) {
      this.dataSource.execute('DELETE FROM teacher_subjects WHERE teacher_id = ?', [teacher.id]);
      teacher.subjectIds.forEach((subId) => {
        this.dataSource.execute(
          'INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)',
          [teacher.id, subId]
        );
      });
    }

    if (teacher.classIds) {
      this.dataSource.execute('DELETE FROM teacher_classes WHERE teacher_id = ?', [teacher.id]);
      teacher.classIds.forEach((clsId) => {
        this.dataSource.execute(
          'INSERT OR IGNORE INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)',
          [teacher.id, clsId]
        );
      });
    }

    return teacher;
  }

  delete(id: string): boolean {
    const result = this.dataSource.execute('DELETE FROM teachers WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

// Singleton instance with default DataSource
export const teacherRepository = new TeacherRepository();

