/**
 * Reference Data System - Async cached lookups for Master Data entities
 * 
 * Architecture:
 *   ReferenceDataProvider (Context Provider)
 *        ↓
 *   ReferenceDataCache (TTL-based cache layer)
 *        ↓
 *   SQLite Engine (async querySql / sync querySqlSync via MasterDataService)
 *        ↓
 *   Components via useReferenceData hooks
 *
 * All screens must use these hooks instead of hardcoded values.
 */

export { ReferenceDataProvider, useReferenceDataContext } from './ReferenceDataProvider';
export { referenceDataCache, generateCacheKey, REFERENCE_CACHE_TTL, clearAllReferenceCaches } from './referenceDataCache';
export { useReferenceData, useStatusLookup, useAcademicTerms, useExamTypes, useAttendanceTypes } from './useReferenceData';
export type { ReferenceDataValue, ReferenceDataState } from './useReferenceData';

