/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../../types';

/**
 * Repository interface for Student data access.
 */
export interface IStudentRepository {
  getAll(): Promise<Student[]>;
  getById(id: string): Promise<Student | undefined>;
  getByClass(classId: string): Promise<Student[]>;
  save(student: Student): Promise<Student>;
  delete(id: string): Promise<boolean>;
}

