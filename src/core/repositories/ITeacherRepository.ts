/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Teacher } from '../../types';

/**
 * Repository interface for Teacher data access.
 */
export interface ITeacherRepository {
  getAll(): Teacher[];
  getById(id: string): Teacher | undefined;
  save(teacher: Teacher): Teacher;
  delete(id: string): boolean;
}

