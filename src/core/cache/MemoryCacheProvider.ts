/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICacheProvider } from '../contracts/ICacheProvider';

interface CacheEntry<T> {
  data: T;
  expiry: number;
  createdAt: number;
}

/**
 * In-memory TTL-based cache provider.
 * This is the SOURCE OF TRUTH for caching logic.
 * lib/cache.ts and referenceDataCache become compatibility wrappers around this.
 */
export class MemoryCacheProvider implements ICacheProvider {
  private store = new Map<string, CacheEntry<any>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 30_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiry <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const now = Date.now();
    this.store.set(key, {
      data: value,
      expiry: now + (ttlMs ?? this.defaultTtlMs),
      createdAt: now,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiry <= Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  getOrCompute<T>(key: string, fetcher: () => T, ttlMs?: number): T {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const data = fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    const now = Date.now();
    // Clean expired entries
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiry <= now) {
        this.store.delete(key);
      }
    }
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}
