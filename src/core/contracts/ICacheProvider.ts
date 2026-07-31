/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generic cache provider interface.
 * All cache implementations (Memory, Redis, etc.) must implement this.
 */
export interface ICacheProvider {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  getOrCompute<T>(key: string, fetcher: () => T, ttlMs?: number): T;
  invalidateByPrefix(prefix: string): void;
  getStats(): { size: number; keys: string[] };
}
