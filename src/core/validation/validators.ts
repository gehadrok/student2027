/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ValidationError, ValidationResult } from './IValidator';

/**
 * Validate that a value is present (not null/undefined/empty).
 */
export function validateRequired(
  value: any,
  fieldName: string,
  label: string
): ValidationError | null {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return { field: fieldName, message: `حقل "${label}" مطلوب` };
  }
  return null;
}

/**
 * Validate string length is within range.
 */
export function validateLength(
  value: string,
  fieldName: string,
  label: string,
  minLength: number = 0,
  maxLength: number = Number.MAX_SAFE_INTEGER
): ValidationError | null {
  if (!value) return null;
  if (value.length < minLength) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون ${minLength} حروف على الأقل`,
    };
  }
  if (value.length > maxLength) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون ${maxLength} حروف كحد أقصى`,
    };
  }
  return null;
}

/**
 * Validate numeric range.
 */
export function validateRange(
  value: number,
  fieldName: string,
  label: string,
  min?: number,
  max?: number
): ValidationError | null {
  if (value === undefined || value === null) return null;
  if (min !== undefined && value < min) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون ${min} على الأقل`,
    };
  }
  if (max !== undefined && value > max) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون ${max} كحد أقصى`,
    };
  }
  return null;
}

/**
 * Validate email format.
 */
export function validateEmail(
  value: string,
  fieldName: string,
  label: string
): ValidationError | null {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون بريداً إلكترونياً صالحاً`,
    };
  }
  return null;
}

/**
 * Validate phone number format.
 */
export function validatePhone(
  value: string,
  fieldName: string,
  label: string
): ValidationError | null {
  if (!value) return null;
  // Allow +, digits, and common separators
  const phoneRegex = /^[\+\d\s\-\(\)]{7,20}$/;
  if (!phoneRegex.test(value)) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون رقم هاتف صالحاً`,
    };
  }
  return null;
}

/**
 * Validate code format (alphanumeric + hyphens/underscores).
 */
export function validateCode(
  value: string,
  fieldName: string,
  label: string
): ValidationError | null {
  if (!value) return null;
  const codeRegex = /^[a-zA-Z0-9_\-\/]+$/;
  if (!codeRegex.test(value)) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يحتوي على أحرف وأرقام فقط`,
    };
  }
  return null;
}

/**
 * Validate password strength.
 */
export function validatePassword(
  value: string,
  fieldName: string,
  label: string,
  minLength: number = 8,
  requireSpecialChar: boolean = true
): ValidationError | null {
  if (!value) return null;
  if (value.length < minLength) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون ${minLength} أحرف على الأقل`,
    };
  }
  if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يحتوي على رمز خاص واحد على الأقل`,
    };
  }
  return null;
}

/**
 * Validate uniqueness against an array of records.
 */
export function validateUnique(
  value: string,
  fieldName: string,
  label: string,
  existingRecords: any[],
  excludeId?: string
): ValidationError | null {
  if (!value) return null;
  const duplicate = existingRecords.find(
    (r) =>
      r[fieldName]?.toLowerCase() === value?.toLowerCase() &&
      r.id !== excludeId
  );
  if (duplicate) {
    return {
      field: fieldName,
      message: `${label} "${value}" موجود مسبقاً. يجب أن يكون القيم فريداً.`,
    };
  }
  return null;
}

/**
 * Validate national ID format.
 */
export function validateNationalId(
  value: string,
  fieldName: string,
  label: string
): ValidationError | null {
  if (!value) return null;
  // Common national ID patterns (adjust per country)
  const nationalIdRegex = /^\d{6,20}$/;
  if (!nationalIdRegex.test(value)) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون رقماً وطنياً صالحاً`,
    };
  }
  return null;
}

/**
 * Validate date string format (YYYY-MM-DD).
 */
export function validateDate(
  value: string,
  fieldName: string,
  label: string
): ValidationError | null {
  if (!value) return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون تاريخاً صالحاً (YYYY-MM-DD)`,
    };
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return {
      field: fieldName,
      message: `حقل "${label}" يجب أن يكون تاريخاً صالحاً`,
    };
  }
  return null;
}

/**
 * Combine multiple validation errors into a single ValidationResult.
 */
export function combineValidations(
  ...results: (ValidationError | null)[]
): ValidationResult {
  const errors = results.filter((r): r is ValidationError => r !== null);
  return {
    valid: errors.length === 0,
    errors,
  };
}
