/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * COMPATIBILITY WRAPPER — DEPRECATED
 * ===================================
 * All validation logic has moved to src/core/validation/.
 * This file is a backward-compatible wrapper for existing imports.
 * New code must import from src/core/validation directly.
 */

import {
  validateRequired as coreValidateRequired,
  validateRange as coreValidateRange,
  validateUnique as coreValidateUnique,
  combineValidations,
} from '../../../core/validation/validators';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate required fields
 */
export function validateRequired(value: any, fieldName: string, label: string): ValidationError | null {
  return coreValidateRequired(value, fieldName, label);
}

/**
 * Validate unique fields against existing records
 */
export function validateUnique(
  value: string,
  fieldName: string,
  label: string,
  _entityType: string,
  existingRecords: any[],
  excludeId?: string
): ValidationError | null {
  return coreValidateUnique(value, fieldName, label, existingRecords, excludeId);
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  fieldName: string,
  label: string,
  min?: number,
  max?: number
): ValidationError | null {
  return coreValidateRange(value, fieldName, label, min, max);
}

/**
 * Master validator for all master data entities
 * Validates: unique code, unique arabic name, unique english name, required fields
 */
export function validateMasterData(
  data: Record<string, any>,
  entityType: string,
  existingRecords: any[],
  excludeId?: string
): ValidationResult {
  const errors: ValidationError[] = [];

  // Always validate these three core fields
  const codeErr = validateRequired(data.code, 'code', 'الكود');
  if (codeErr) errors.push(codeErr);

  const nameArErr = validateRequired(data.name_ar, 'name_ar', 'الاسم (عربي)');
  if (nameArErr) errors.push(nameArErr);

  // Unique checks (only if values are provided)
  if (data.code) {
    const dupCode = validateUnique(data.code, 'code', 'الكود', entityType, existingRecords, excludeId);
    if (dupCode) errors.push(dupCode);
  }

  if (data.name_ar) {
    const dupNameAr = validateUnique(data.name_ar, 'name_ar', 'الاسم (عربي)', entityType, existingRecords, excludeId);
    if (dupNameAr) errors.push(dupNameAr);
  }

  if (data.name_en) {
    const dupNameEn = validateUnique(data.name_en, 'name_en', 'الاسم (إنجليزي)', entityType, existingRecords, excludeId);
    if (dupNameEn) errors.push(dupNameEn);
  }

  // Entity-specific required fields
  const entityRequiredFields: Record<string, string[]> = {
    academic_years: ['start_date', 'end_date'],
    academic_terms: ['academic_year_id', 'start_date', 'end_date'],
    grade_levels: ['level_number'],
    subjects_master: ['weekly_hours', 'max_score', 'pass_score'],
    system_numbering: ['prefix', 'next_number', 'step', 'pad_length'],
  };

  const requiredList = entityRequiredFields[entityType] || [];
  requiredList.forEach(field => {
    const err = validateRequired(data[field], field, field);
    if (err) errors.push(err);
  });

  // Range validations
  if (data.level_number !== undefined && entityType === 'grade_levels') {
    const rangeErr = validateRange(data.level_number, 'level_number', 'رقم المستوى', 1, 12);
    if (rangeErr) errors.push(rangeErr);
  }
  if (data.max_score !== undefined) {
    const rangeErr = validateRange(data.max_score, 'max_score', 'الدرجة العظمى', 1);
    if (rangeErr) errors.push(rangeErr);
  }
  if (data.weight_percent !== undefined) {
    const rangeErr = validateRange(data.weight_percent, 'weight_percent', 'نسبة الوزن', 0, 100);
    if (rangeErr) errors.push(rangeErr);
  }
  if (data.discount_percent !== undefined) {
    const rangeErr = validateRange(data.discount_percent, 'discount_percent', 'نسبة الخصم', 0, 100);
    if (rangeErr) errors.push(rangeErr);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate import row data
 */
export function validateImportRow(
  row: Record<string, any>,
  entityType: string,
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.code) {
    errors.push({ field: 'code', message: `الصف ${rowIndex + 1}: الكود مطلوب` });
  }
  if (!row.name_ar) {
    errors.push({ field: 'name_ar', message: `الصف ${rowIndex + 1}: الاسم العربي مطلوب` });
  }

  return errors;
}
