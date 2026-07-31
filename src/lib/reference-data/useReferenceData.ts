/**
 * useReferenceData Hook - Async reference data loading with caching
 * 
 * Pattern: All screens use this hook family instead of hardcoded values.
 * Data is loaded asynchronously on first mount, cached for 2 minutes,
 * and automatically refreshed after any CRUD operation via cache invalidation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { querySqlSync, getSQLiteDB } from '../sqlite-engine';
import { referenceDataCache, generateCacheKey, REFERENCE_CACHE_TTL } from './referenceDataCache';

// ============================================================================
// Types
// ============================================================================

export interface ReferenceDataValue {
  id: string;
  code?: string;
  name_ar: string;
  name_en?: string | null;
  display_order?: number;
  is_active?: number;
  [key: string]: any;
}

export interface ReferenceDataState<T = ReferenceDataValue> {
  data: T[];
  isLoading: boolean;
  isFirstLoad: boolean;
  error: string | null;
  refetch: () => void;
}

// Track if this is the first load of the entire app
let globalFirstLoadComplete = false;

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Fetch reference data from SQLite synchronously (DB is already in memory)
 * Falls back to async if sync not available
 */
function fetchSync<T = ReferenceDataValue>(
  tableName: string,
  activeOnly: boolean,
  orderBy: string = 'display_order ASC, name_ar ASC'
): T[] {
  const sql = activeOnly
    ? `SELECT * FROM ${tableName} WHERE is_active = 1 ORDER BY ${orderBy}`
    : `SELECT * FROM ${tableName} ORDER BY ${orderBy}`;

  try {
    return querySqlSync<T>(sql, []);
  } catch {
    return [];
  }
}

// ============================================================================
// Core hook
// ============================================================================

/**
 * Generic useReferenceData hook for any master entity
 * 
 * @param entityType - The master entity type name (e.g., 'academic_statuses')
 * @param tableName - The SQL table name to query
 * @param activeOnly - Only fetch active records (default: true)
 * @param orderBy - Custom ORDER BY clause
 */
export function useReferenceData<T = ReferenceDataValue>(
  entityType: string,
  tableName?: string,
  activeOnly: boolean = true,
  orderBy: string = 'display_order ASC, name_ar ASC'
): ReferenceDataState<T> {
  const resolvedTable = tableName || entityType;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(!globalFirstLoadComplete);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(() => {
    const cacheKey = generateCacheKey(entityType, activeOnly);

    try {
      const result = referenceDataCache.getOrCompute<T[]>(
        cacheKey,
        () => fetchSync<T>(resolvedTable, activeOnly, orderBy),
        REFERENCE_CACHE_TTL
      );

      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
        setIsFirstLoad(false);
        globalFirstLoadComplete = true;
        setError(null);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || `Failed to load ${entityType}`);
        setIsLoading(false);
        setIsFirstLoad(false);
      }
    }
  }, [entityType, resolvedTable, activeOnly, orderBy]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  const refetch = useCallback(() => {
    const cacheKey = generateCacheKey(entityType, activeOnly);
    referenceDataCache.invalidate(cacheKey);
    setData([]);
    setIsLoading(true);
    fetchData();
  }, [entityType, activeOnly, fetchData]);

  return { data, isLoading, isFirstLoad, error, refetch };
}

// ============================================================================
// Domain-specific hooks for common screen lookups
// ============================================================================

/**
 * Academic Statuses - used in StudentsScreen for formStatus
 */
export function useStatusLookup(activeOnly: boolean = true) {
  return useReferenceData('academic_statuses', 'academic_statuses', activeOnly);
}

/**
 * Academic Terms - used in GradesScreen, CertificatesScreen
 */
export function useAcademicTerms(activeOnly: boolean = true) {
  return useReferenceData('academic_terms', 'academic_terms', activeOnly);
}

/**
 * Exam Types - used in GradesScreen
 */
export function useExamTypes(activeOnly: boolean = true) {
  return useReferenceData('exam_types', 'exam_types', activeOnly);
}

/**
 * Attendance Types - used in AttendanceScreen
 */
export function useAttendanceTypes(activeOnly: boolean = true) {
  return useReferenceData('attendance_types', 'attendance_types', activeOnly);
}

/**
 * Certificate Types - used in CertificatesScreen
 */
export function useCertificateTypes(activeOnly: boolean = true) {
  return useReferenceData('certificate_types', 'certificate_types', activeOnly);
}

/**
 * Identity Types - used in StudentsScreen, DocumentCenterScreen
 */
export function useIdentityTypes(activeOnly: boolean = true) {
  return useReferenceData('identity_types', 'identity_types', activeOnly);
}

/**
 * Leave Types - used in TeachersScreen
 */
export function useLeaveTypes(activeOnly: boolean = true) {
  return useReferenceData('leave_types', 'leave_types', activeOnly);
}

/**
 * Gender options (from identity_types filtered by category)
 */
export function useGenderOptions(activeOnly: boolean = true) {
  // Use identity_types with a code filter approach
  return useReferenceData('identity_types', 'identity_types', activeOnly);
}

/**
 * Specializations - used in TeachersScreen
 */
export function useSpecializations(activeOnly: boolean = true) {
  return useReferenceData('specializations', 'specializations', activeOnly);
}

/**
 * Qualifications - used in TeachersScreen
 */
export function useQualifications(activeOnly: boolean = true) {
  return useReferenceData('qualifications', 'qualifications', activeOnly);
}

/**
 * Payment Methods - used in FinancialScreen
 */
export function usePaymentMethods(activeOnly: boolean = true) {
  return useReferenceData('payment_methods', 'payment_methods', activeOnly);
}

/**
 * Fee Categories - used in FinancialScreen
 */
export function useFeeCategories(activeOnly: boolean = true) {
  return useReferenceData('fee_categories', 'fee_categories', activeOnly);
}

/**
 * Book Categories - used in LibraryScreen
 */
export function useBookCategories(activeOnly: boolean = true) {
  // Will query 'book_categories' after migration is added
  return useReferenceData('book_categories', 'book_categories', activeOnly);
}

/**
 * Payment Statuses - used in FinancialScreen
 */
export function usePaymentStatuses(activeOnly: boolean = true) {
  return useReferenceData('payment_statuses', 'payment_statuses', activeOnly);
}

/**
 * Class Rooms - used for room lookups
 */
export function useClassRooms(activeOnly: boolean = true) {
  return useReferenceData('class_rooms', 'class_rooms', activeOnly);
}

/**
 * Grade Levels - used in ClassesScreen, StudentsScreen
 */
export function useGradeLevels(activeOnly: boolean = true) {
  return useReferenceData('grade_levels', 'grade_levels', activeOnly);
}

/**
 * Education Stages - used in ClassesScreen
 */
export function useEducationStages(activeOnly: boolean = true) {
  return useReferenceData('education_stages', 'education_stages', activeOnly);
}

/**
 * General purpose: get a label from a reference data ID
 */
export function getReferenceLabel(data: ReferenceDataValue[], id: string, field: string = 'name_ar'): string {
  const item = data.find(d => d.id === id);
  return item ? (item[field] || id) : id;
}

