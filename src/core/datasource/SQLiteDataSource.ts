/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from './IDataSource';

/**
 * The `sqlite-engine` module pulls in `sql.js` via Vite-only `?url`/`?raw`
 * imports that are incompatible with the Node/tsx test runtime. To keep the
 * PostgreSQL live-verification harness loadable under `tsx` (which imports this
 * file transitively through `DataSourceFactory`), the engine is imported
 * lazily and only when a SQLite operation is actually invoked. The browser
 * (Vite) and the esbuild server bundle resolve the dynamic import normally;
 * the live tests run exclusively against `PostgreSQLDataSource`, so the engine
 * is never loaded in that path. This is a compatibility shim only — no
 * functionality is removed.
 */
let engineCache: typeof import('../../lib/sqlite-engine') | null = null;
async function getEngine(): Promise<typeof import('../../lib/sqlite-engine')> {
  if (!engineCache) {
    engineCache = await import('../../lib/sqlite-engine');
  }
  return engineCache;
}

/**
 * SQLite implementation of IDataSource.
 * Wraps the async sqlite-engine primitives into the generic interface.
 */
export class SQLiteDataSource implements IDataSource {
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const { querySql } = await getEngine();
    return querySql<T>(sql, params || []);
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const { queryOneSql } = await getEngine();
    return queryOneSql<T>(sql, params || []);
  }

  async execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const { runSql } = await getEngine();
    return runSql(sql, params || []);
  }

  async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<{ success: boolean; error?: string }> {
    const { runTransaction } = await getEngine();
    return runTransaction(queries);
  }

  async prepare(sql: string): Promise<{ run: (params?: any[]) => void; free: () => void }> {
    // Delegate to sql.js prepare via the engine's getSQLiteDB
    // For simplicity, we use execute as a fallback
    return {
      run: (params?: any[]) => {
        void this.execute(sql, params);
      },
      free: () => {
        // No-op for async mode
      },
    };
  }

  async count(sql: string, params?: any[]): Promise<number> {
    const result = await this.queryOne<{ cnt: number }>(sql, params);
    return result?.cnt ?? 0;
  }

  async exists(sql: string, params?: any[]): Promise<boolean> {
    // Callers pass bare predicate queries such as `SELECT 1 FROM t WHERE id = ?`.
    // Wrap them so we always read a `cnt` column instead of relying on the
    // column name of the predicate itself.
    try {
      const result = await this.queryOne<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM (${sql}) AS _sub`,
        params
      );
      return (result?.cnt ?? 0) > 0;
    } catch (err) {
      console.error('exists() query failed:', sql, err);
      return false;
    }
  }

  async beginTransaction(): Promise<void> {
    const { getSQLiteDB } = await getEngine();
    const db = await getSQLiteDB();
    db.run('BEGIN TRANSACTION;');
  }

  async commit(): Promise<void> {
    const { getSQLiteDB } = await getEngine();
    const db = await getSQLiteDB();
    db.run('COMMIT;');
  }

  async rollback(): Promise<void> {
    const { getSQLiteDB } = await getEngine();
    const db = await getSQLiteDB();
    db.run('ROLLBACK;');
  }
}
