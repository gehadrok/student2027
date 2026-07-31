/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * COMPATIBILITY WRAPPER — DEPRECATED
 * ===================================
 * All cache implementation has moved to src/core/cache/.
 * This file is a backward-compatible wrapper for existing imports.
 * New code must import from src/core/cache directly.
 */

import { CacheService } from '../core/cache/CacheService';
import { MemoryCacheProvider } from '../core/cache/MemoryCacheProvider';

// Backward-compatible singleton instance
const cacheService = new CacheService(new MemoryCacheProvider(30_000));

class MasterDataCache {
  getOrCompute<T>(key: string, fetcher: () => T, ttl?: number): T {
    return cacheService.getOrCompute(key, fetcher, ttl);
  }

  invalidate(key: string): void {
    cacheService.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    cacheService.invalidateByPrefix(prefix);
  }

  clear(): void {
    cacheService.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return cacheService.getStats();
  }
}

export const masterDataCache = new MasterDataCache();

/**
 * Cache key generator for entity lookups
 */
export function lookupCacheKey(entityType: string, activeOnly: boolean): string {
  return `lookup_${entityType}_${activeOnly}`;
}

/**
 * Invalidate all caches related to a specific entity after CRUD
 */
export function invalidateEntityCache(entityType: string): void {
  masterDataCache.invalidate(lookupCacheKey(entityType, true));
  masterDataCache.invalidate(lookupCacheKey(entityType, false));
  masterDataCache.invalidateByPrefix(`paginated_${entityType}`);
}
