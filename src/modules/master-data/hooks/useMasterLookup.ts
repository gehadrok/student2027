/**
 * Master Data Lookup Hooks
 * All screens must use these hooks instead of raw table names
 * Each hook reads from SQLite via MasterDataService with caching
 * Use these instead of masterDataService.getAll() directly
 */

import { useState, useEffect, useCallback } from 'react';
import { masterDataService } from '../services/masterDataService';
import { MasterEntity, MasterEntityType } from '../constants/MasterEntity';
import { masterDataCache, lookupCacheKey, invalidateEntityCache } from '../../../lib/cache';
import { MasterDataEntity } from '../types';

/**
 * Generic lookup hook with caching
 * @param entityType - The master entity type (use MasterEntity enum)
 * @param activeOnly - Only fetch active records
 */
function useMasterLookup<T extends MasterDataEntity>(
  entityType: MasterEntityType,
  activeOnly: boolean = true
): { records: T[]; isLoading: boolean; refetch: () => void } {
  const [records, setRecords] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = useCallback(() => {
    setIsLoading(true);
    try {
      const cacheKey = lookupCacheKey(entityType, activeOnly);
      const data = masterDataCache.getOrCompute<T[]>(
        cacheKey,
        () => masterDataService.getAll<T>(entityType, activeOnly),
        60_000 // 60 second TTL for lookups
      );
      setRecords(data);
    } catch (err) {
      console.error(`Failed to fetch ${entityType}:`, err);
      setRecords([]);
    }
    setIsLoading(false);
  }, [entityType, activeOnly]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const refetch = useCallback(() => {
    invalidateEntityCache(entityType);
    fetchRecords();
  }, [entityType, fetchRecords]);

  return { records, isLoading, refetch };
}

// ============================================================================
// Academic Structure Hooks
// ============================================================================

/** Academic Years (السنوات الدراسية) */
export function useAcademicYears(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.AcademicYears, activeOnly);
}

/** Academic Terms (الفصول الدراسية) */
export function useAcademicTerms(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.AcademicTerms, activeOnly);
}

/** Education Stages (المراحل التعليمية) */
export function useEducationStages(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.EducationStages, activeOnly);
}

/** Grade Levels (الصفوف الدراسية) */
export function useGradeLevels(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.GradeLevels, activeOnly);
}

/** Sections Master (الشعب الدراسية) */
export function useSectionsMaster(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.SectionsMaster, activeOnly);
}

/** Subjects Master (المواد الدراسية) */
export function useSubjectsMaster(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.SubjectsMaster, activeOnly);
}

// ============================================================================
// Examinations Hooks
// ============================================================================

/** Exam Types (أنواع الاختبارات) */
export function useExamTypes(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.ExamTypes, activeOnly);
}

/** Certificate Types (أنواع الشهادات) */
export function useCertificateTypes(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.CertificateTypes, activeOnly);
}

// ============================================================================
// Attendance Hooks
// ============================================================================

/** Attendance Types (أنواع الحضور والغياب) */
export function useAttendanceTypes(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.AttendanceTypes, activeOnly);
}

/** Leave Types (أنواع الإجازات) */
export function useLeaveTypes(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.LeaveTypes, activeOnly);
}

/** Academic Statuses (الحالات الأكاديمية) */
export function useAcademicStatuses(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.AcademicStatuses, activeOnly);
}

// ============================================================================
// Geographic Hooks
// ============================================================================

/** Nationalities (الجنسيات) */
export function useNationalities(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Nationalities, activeOnly);
}

/** Countries (الدول) */
export function useCountries(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Countries, activeOnly);
}

/** Governorates (المحافظات) */
export function useGovernorates(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Governorates, activeOnly);
}

/** Districts (المديريات) */
export function useDistricts(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Districts, activeOnly);
}

/** Cities (المدن) */
export function useCities(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Cities, activeOnly);
}

// ============================================================================
// Identity Hooks
// ============================================================================

/** Identity Types (أنواع الهوية) */
export function useIdentityTypes(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.IdentityTypes, activeOnly);
}

/** Document Types (أنواع الوثائق) */
export function useDocumentTypes(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.DocumentTypes, activeOnly);
}

// ============================================================================
// Human Resources Hooks
// ============================================================================

/** Employee Types (أنواع الموظفين) */
export function useEmployeeTypes(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.EmployeeTypes, activeOnly);
}

/** Qualifications (المؤهلات العلمية) */
export function useQualifications(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Qualifications, activeOnly);
}

/** Specializations (التخصصات) */
export function useSpecializations(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Specializations, activeOnly);
}

/** Job Titles (الوظائف) */
export function useJobTitles(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.JobTitles, activeOnly);
}

/** Departments (الأقسام) */
export function useDepartments(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Departments, activeOnly);
}

// ============================================================================
// School Facilities Hooks
// ============================================================================

/** Buildings (المباني) */
export function useBuildings(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Buildings, activeOnly);
}

/** Rooms (القاعات) */
export function useRooms(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Rooms, activeOnly);
}

/** Laboratories (المختبرات) */
export function useLaboratories(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Laboratories, activeOnly);
}

/** Libraries (المكتبات) */
export function useLibraries(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Libraries, activeOnly);
}

// ============================================================================
// Financial Hooks
// ============================================================================

/** Fee Categories (فئات الرسوم) */
export function useFeeCategories(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.FeeCategories, activeOnly);
}

/** Payment Methods (طرق الدفع) */
export function usePaymentMethods(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.PaymentMethods, activeOnly);
}

/** Discount Types (أنواع الخصومات) */
export function useDiscountTypes(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.DiscountTypes, activeOnly);
}

/** Currencies (العملات) */
export function useCurrencies(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.Currencies, activeOnly);
}

// ============================================================================
// System Hooks
// ============================================================================

/** School Branches (فروع المدرسة) */
export function useSchoolBranches(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.SchoolBranches, activeOnly);
}

/** System Numbering (الترقيم الآلي) */
export function useSystemNumbering(activeOnly: boolean = true) {
  return useMasterLookup(MasterEntity.SystemNumbering, activeOnly);
}

