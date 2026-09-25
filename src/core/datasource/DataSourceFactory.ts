/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from './IDataSource';
import { SQLiteDataSource } from './SQLiteDataSource';
import { getPostgresConfig } from './postgresConfig';

export type DataSourceType = 'sqlite' | 'postgresql' | 'restapi';

/**
 * Singleton factory for DataSource instances.
 *
 * - `getInstance()` is synchronous and defaults to SQLite (the browser /
 *   transitional path). It is intentionally NOT changed to async so existing
 *   synchronous callers (repositories, bootstrap) keep working unchanged.
 * - PostgreSQL is activated behind `DATA_SOURCE_TYPE=postgresql` via the
 *   async `createDataSource` / `initialize` methods. `PostgreSQLDataSource`
 *   is loaded with a dynamic import so that the `pg` dependency is never
 *   pulled into the browser SPA bundle.
 */
export class DataSourceFactory {
  private static instance: IDataSource | null = null;

  /**
   * Get the singleton DataSource instance.
   * Defaults to SQLiteDataSource.
   */
  static getInstance(): IDataSource {
    if (!DataSourceFactory.instance) {
      DataSourceFactory.instance = DataSourceFactory.createDataSourceSync('sqlite');
    }
    return DataSourceFactory.instance;
  }

  /**
   * Synchronous, SQLite-only creation for the default/browser path.
   * PostgreSQL requires async initialization, so it is intentionally not
   * handled here (use `createDataSource` / `initialize`).
   */
  static createDataSourceSync(type: DataSourceType = 'sqlite'): IDataSource {
    switch (type) {
      case 'sqlite':
      default:
        return new SQLiteDataSource();
    }
  }

  /**
   * Async creation. Supports `postgresql` via a dynamic import so `pg` is only
   * loaded in a Node/server context (never in the browser SPA).
   */
  static async createDataSource(type: DataSourceType = 'sqlite'): Promise<IDataSource> {
    switch (type) {
      case 'postgresql': {
        const { PostgreSQLDataSource } = await import('./PostgreSQLDataSource');
        return new PostgreSQLDataSource(getPostgresConfig());
      }
      case 'sqlite':
      default:
        return new SQLiteDataSource();
    }
  }

  /**
   * Initialize the singleton from `DATA_SOURCE_TYPE` (server bootstrap).
   * Defaults to SQLite; selects PostgreSQL when `DATA_SOURCE_TYPE=postgresql`.
   */
  static async initialize(type?: DataSourceType): Promise<IDataSource> {
    const resolved = type ?? (process.env.DATA_SOURCE_TYPE as DataSourceType) ?? 'sqlite';
    const ds = await DataSourceFactory.createDataSource(resolved);
    DataSourceFactory.instance = ds;
    return ds;
  }

  /**
   * Reset the singleton instance (useful for testing or re-initialization).
   */
  static reset(): void {
    DataSourceFactory.instance = null;
  }

  /**
   * Replace the singleton instance with a custom one (useful for testing/mocking).
   */
  static setInstance(instance: IDataSource): void {
    DataSourceFactory.instance = instance;
  }
}

