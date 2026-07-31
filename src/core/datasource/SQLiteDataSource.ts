/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from './IDataSource';
import {
  querySqlSync,
  queryOneSql,
  runSqlSync,
  runTransactionSync,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from '../../lib/sqlite-engine';

/**
 * SQLite implementation of IDataSource.
 * Wraps the existing sqlite-engine primitives into the generic interface.
 */
export class SQLiteDataSource implements IDataSource {
  query<T = any>(sql: string, params?: any[]): T[] {
    return querySqlSync<T>(sql, params || []);
  }

  queryOne<T = any>(sql: string, params?: any[]): T | null {
    const results = this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  execute(sql: string, params?: any[]): { changes: number; lastInsertRowid: number } {
    runSqlSync(sql, params || []);
    // runSqlSync doesn't return changes info, so we query it
    const result = this.queryOne<{ cnt: number; id: number }>(
      'SELECT changes() as cnt, last_insert_rowid() as id'
    );
    return {
      changes: result?.cnt ?? 0,
      lastInsertRowid: result?.id ?? 0,
    };
  }

  transaction(queries: Array<{ sql: string; params?: any[] }>): { success: boolean; error?: string } {
    return runTransactionSync(queries);
  }

  prepare(sql: string): { run: (params?: any[]) => void; free: () => void } {
    // Delegate to sql.js prepare via the engine's getSQLiteDB
    // For simplicity, we use execute as a fallback
    return {
      run: (params?: any[]) => {
        this.execute(sql, params);
      },
      free: () => {
        // No-op for sync mode
      },
    };
  }

  count(sql: string, params?: any[]): number {
    const result = this.queryOne<{ cnt: number }>(sql, params);
    return result?.cnt ?? 0;
  }

  exists(sql: string, params?: any[]): boolean {
    return this.count(sql, params) > 0;
  }

  beginTransaction(): void {
    beginTransaction();
  }

  commit(): void {
    commitTransaction();
  }

  rollback(): void {
    rollbackTransaction();
  }
}

