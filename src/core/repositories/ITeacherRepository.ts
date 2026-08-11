/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Teacher } from '../../types';

/**
 * Repository interface for Teacher data access.
 */
export interface ITeacherRepository {
  getAll(): Promise<Teacher[]>;
  getById(id: string): Promise<Teacher | undefined>;
  save(teacher: Teacher): Promise<Teacher>;
  delete(id: string): Promise<boolean>;
}

