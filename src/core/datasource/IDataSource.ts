/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generic low-level DataSource interface.
 * All database engines (SQLite, PostgreSQL, REST API, etc.) must implement this.
 * No business-specific methods allowed — only generic query primitives.
 */
export interface IDataSource {
  /**
   * Execute a query and return an array of results.
   */
  query<T = any>(sql: string, params?: any[]): T[];

  /**
   * Execute a query and return a single result or null.
   */
  queryOne<T = any>(sql: string, params?: any[]): T | null;

  /**
   * Execute a write statement (INSERT, UPDATE, DELETE).
   * Returns { changes, lastInsertRowid }.
   */
  execute(sql: string, params?: any[]): { changes: number; lastInsertRowid: number };

  /**
   * Execute multiple queries inside a transaction.
   * Auto-commits on success, rollbacks on failure.
   */
  transaction(queries: Array<{ sql: string; params?: any[] }>): { success: boolean; error?: string };

  /**
   * Prepare a statement for repeated execution (optimization).
   */
  prepare(sql: string): { run: (params?: any[]) => void; free: () => void };

  /**
   * Get a count of records matching a condition.
   */
  count(sql: string, params?: any[]): number;

  /**
   * Check if at least one record exists matching a condition.
   */
  exists(sql: string, params?: any[]): boolean;

  /**
   * Begin a transaction manually.
   */
  beginTransaction(): void;

  /**
   * Commit the current transaction.
   */
  commit(): void;

  /**
   * Rollback the current transaction.
   */
  rollback(): void;
}

