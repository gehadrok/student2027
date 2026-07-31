/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface IValidator<T = any> {
  validate(data: T): ValidationResult;
}
