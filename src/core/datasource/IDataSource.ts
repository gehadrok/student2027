/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generic low-level DataSource interface.
 * All database engines (SQLite, PostgreSQL, REST API, etc.) must implement this.
 * No business-specific methods allowed — only generic query primitives.
 *
 * All operations are asynchronous so the contract can be backed by any engine
 * (SQLite today, PostgreSQL later) without blocking the caller.
 */
export interface IDataSource {
  /**
   * Execute a query and return an array of results.
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * Execute a query and return a single result or null.
   */
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;

  /**
   * Execute a write statement (INSERT, UPDATE, DELETE).
   * Returns { changes, lastInsertRowid }.
   */
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }>;

  /**
   * Execute multiple queries inside a transaction.
   * Auto-commits on success, rollbacks on failure.
   */
  transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<{ success: boolean; error?: string }>;

  /**
   * Prepare a statement for repeated execution (optimization).
   */
  prepare(sql: string): Promise<{ run: (params?: any[]) => void; free: () => void }>;

  /**
   * Get a count of records matching a condition.
   */
  count(sql: string, params?: any[]): Promise<number>;

  /**
   * Check if at least one record exists matching a condition.
   */
  exists(sql: string, params?: any[]): Promise<boolean>;

  /**
   * Begin a transaction manually.
   */
  beginTransaction(): Promise<void>;

  /**
   * Commit the current transaction.
   */
  commit(): Promise<void>;

  /**
   * Rollback the current transaction.
   */
  rollback(): Promise<void>;
}

