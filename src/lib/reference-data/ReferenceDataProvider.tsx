/**
 * ReferenceDataProvider — React context provider for reference data
 *
 * Wraps the app to provide cached reference data lookups to all screens.
 * On mount, initializes the reference cache with commonly used entities
 * so that first-load screens don't show loading spinners.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { querySqlSync } from '../sqlite-engine';
import { referenceDataCache, generateCacheKey, REFERENCE_CACHE_TTL, invalidateEntityCaches } from './referenceDataCache';
import { ReferenceDataValue } from './useReferenceData';

// ============================================================================
// Context
// ============================================================================

interface ReferenceDataContextValue {
  /** Pre-warm all common reference data on first load */
  isReady: boolean;
  /** Manually invalidate & refetch a specific entity */
  invalidate: (entityType: string) => void;
  /** Get cached reference data for an entity (synchronous after warm-up) */
  getCached: <T = ReferenceDataValue>(entityType: string, activeOnly?: boolean) => T[];
  /** Force clear all caches */
  clearAll: () => void;
}

const ReferenceDataContext = createContext<ReferenceDataContextValue | null>(null);

// ============================================================================
// Entities to pre-warm on first load
// ============================================================================

const PREWARM_ENTITIES = [
  'academic_statuses',
  'academic_terms',
  'exam_types',
  'attendance_types',
  'certificate_types',
  'identity_types',
  'leave_types',
  'specializations',
  'qualifications',
  'payment_methods',
  'fee_categories',
  'grade_levels',
  'education_stages',
  'class_rooms',
  'employee_types',
  'job_titles',
  'departments',
  'nationalities',
  'countries',
  'governorates',
  'cities',
  'districts',
];

/**
 * Helper: fetch and cache a single entity synchronously
 */
function prewarmEntity(entityType: string): void {
  const cacheKeyActive = generateCacheKey(entityType, true);
  const cacheKeyAll = generateCacheKey(entityType, false);

  try {
    // Cache active records
    referenceDataCache.getOrCompute(
      cacheKeyActive,
      () => {
        try {
          return querySqlSync(`SELECT * FROM ${entityType} WHERE is_active = 1 ORDER BY display_order ASC, name_ar ASC`);
        } catch {
          return [];
        }
      },
      REFERENCE_CACHE_TTL
    );

    // Cache all records
    referenceDataCache.getOrCompute(
      cacheKeyAll,
      () => {
        try {
          return querySqlSync(`SELECT * FROM ${entityType} ORDER BY display_order ASC, name_ar ASC`);
        } catch {
          return [];
        }
      },
      REFERENCE_CACHE_TTL
    );
  } catch {
    // Silently fail — individual screens will handle missing data
  }
}

// ============================================================================
// Provider Component
// ============================================================================

export const ReferenceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const warmupDone = useRef(false);

  useEffect(() => {
    if (warmupDone.current) return;
    warmupDone.current = true;

    // Warm up cache synchronously (DB is already in memory)
    try {
      PREWARM_ENTITIES.forEach(prewarmEntity);
    } catch {
      // Non-critical — app works without pre-warming
    }

    setIsReady(true);
  }, []);

  const invalidate = useCallback((entityType: string) => {
    invalidateEntityCaches(entityType);
  }, []);

  const getCached = useCallback(<T = ReferenceDataValue>(entityType: string, activeOnly: boolean = true): T[] => {
    const cacheKey = generateCacheKey(entityType, activeOnly);
    try {
      return referenceDataCache.getOrCompute<T[]>(
        cacheKey,
        () => {
          try {
            const sql = activeOnly
              ? `SELECT * FROM ${entityType} WHERE is_active = 1 ORDER BY display_order ASC, name_ar ASC`
              : `SELECT * FROM ${entityType} ORDER BY display_order ASC, name_ar ASC`;
            return querySqlSync<T>(sql, []);
          } catch {
            return [];
          }
        },
        REFERENCE_CACHE_TTL
      );
    } catch {
      return [];
    }
  }, []);

  const clearAll = useCallback(() => {
    referenceDataCache.clear();
  }, []);

  return (
    <ReferenceDataContext.Provider value={{ isReady, invalidate, getCached, clearAll }}>
      {children}
    </ReferenceDataContext.Provider>
  );
};

/**
 * Hook to access the reference data context
 */
export function useReferenceDataContext(): ReferenceDataContextValue {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) {
    throw new Error('useReferenceDataContext must be used within a ReferenceDataProvider');
  }
  return ctx;
}
