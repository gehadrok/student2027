/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from './IDataSource';

/**
 * Unit of Work pattern.
 * Groups multiple database operations into a single transaction.
 * Auto-commits on success, rollbacks on failure.
 */
export class UnitOfWork {
  private queries: Array<{ sql: string; params?: any[] }> = [];
  private dataSource: IDataSource;

  constructor(dataSource: IDataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Register a query to be executed in the unit of work.
   */
  register(sql: string, params?: any[]): void {
    this.queries.push({ sql, params });
  }

  /**
   * Execute all registered queries in a single transaction.
   */
  async commit(): Promise<{ success: boolean; error?: string }> {
    if (this.queries.length === 0) {
      return { success: true };
    }
    const result = await this.dataSource.transaction(this.queries);
    this.queries = [];
    return result;
  }

  /**
   * Clear all registered queries without executing.
   */
  clear(): void {
    this.queries = [];
  }

  /**
   * Get the number of registered queries.
   */
  get pendingCount(): number {
    return this.queries.length;
  }
}

