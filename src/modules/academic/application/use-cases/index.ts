/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer — Use Cases.
 */

import { academicYearService } from '../services';
import { AcademicYearUseCases } from './AcademicYearUseCases';

export { AcademicYearUseCases } from './AcademicYearUseCases';

export const academicYearUseCases = new AcademicYearUseCases(academicYearService);
