/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * COMPATIBILITY WRAPPER — DEPRECATED
 * ===================================
 * All cache implementation has moved to src/core/cache/.
 * This file now consumes core/cache internally.
 * New code must import from src/core/cache directly.
 */

import { CacheService } from '../../core/cache/CacheService';
import { MemoryCacheProvider } from '../../core/cache/MemoryCacheProvider';

const cacheService = new CacheService(new MemoryCacheProvider(120_000));

export const REFERENCE_CACHE_TTL = 120_000;

/**
 * Generate a standardized cache key
 */
export function generateCacheKey(entityType: string, activeOnly: boolean = true): string {
  return `ref_${entityType}_${activeOnly}`;
}

/**
 * Get a cached value or compute it
 */
export function getOrCompute<T>(
  key: string,
  fetcher: () => T,
  ttl: number = REFERENCE_CACHE_TTL
): T {
  return cacheService.getOrCompute(key, fetcher, ttl);
}

/**
 * Invalidate specific cache key
 */
export function invalidate(key: string): void {
  cacheService.delete(key);
}

/**
 * Invalidate all cache entries by prefix
 */
export function invalidateByPrefix(prefix: string): void {
  cacheService.invalidateByPrefix(prefix);
}

/**
 * Invalidate all reference caches for a given entity
 */
export function invalidateEntityCaches(entityType: string): void {
  invalidate(generateCacheKey(entityType, true));
  invalidate(generateCacheKey(entityType, false));
  invalidateByPrefix(`ref_${entityType}`);
}

/**
 * Clear all reference caches
 */
export function clearAllReferenceCaches(): void {
  cacheService.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getReferenceCacheStats(): {
  size: number;
  keys: string[];
  entries: { key: string; age: number; ttl: number; }[];
} {
  const stats = cacheService.getStats();
  const now = Date.now();
  return {
    size: stats.size,
    keys: stats.keys,
    entries: stats.keys.map(key => ({
      key,
      age: 0,
      ttl: 0
    }))
  };
}

/**
 * Reference data cache API object
 */
export const referenceDataCache = {
  getOrCompute,
  invalidate,
  invalidateByPrefix,
  clear: clearAllReferenceCaches
};
