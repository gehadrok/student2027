/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICacheProvider } from '../contracts/ICacheProvider';
import { MemoryCacheProvider } from './MemoryCacheProvider';
import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * Cache service — application-level cache management.
 * Wraps ICacheProvider with convenience methods.
 * Used by all modules that need caching.
 */
export class CacheService {
  private provider: ICacheProvider;
  private readonly logger = LoggerFactory.getInstance('Cache');

  constructor(provider?: ICacheProvider) {
    this.provider = provider ?? new MemoryCacheProvider();
  }

  get<T>(key: string): T | undefined {
    return this.provider.get<T>(key);
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.provider.set(key, value, ttlMs);
  }

  delete(key: string): void {
    this.provider.delete(key);
  }

  clear(): void {
    this.provider.clear();
    this.logger.info('Cache cleared');
  }

  has(key: string): boolean {
    return this.provider.has(key);
  }

  getOrCompute<T>(key: string, fetcher: () => T, ttlMs?: number): T {
    return this.provider.getOrCompute(key, fetcher, ttlMs);
  }

  invalidateByPrefix(prefix: string): void {
    this.provider.invalidateByPrefix(prefix);
  }

  getStats(): { size: number; keys: string[] } {
    return this.provider.getStats();
  }
}
