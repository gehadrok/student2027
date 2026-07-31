/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../../types';

/**
 * Repository interface for Student data access.
 */
export interface IStudentRepository {
  getAll(): Student[];
  getById(id: string): Student | undefined;
  getByClass(classId: string): Student[];
  save(student: Student): Student;
  delete(id: string): boolean;
}

