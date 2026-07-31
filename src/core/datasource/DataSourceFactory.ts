/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from './IDataSource';
import { SQLiteDataSource } from './SQLiteDataSource';

/**
 * Singleton factory for DataSource instances.
 *
 * Currently returns SQLiteDataSource.
 * Future: can return PostgreSQLDataSource, RestApiDataSource, etc.
 * based on environment configuration.
 */
export class DataSourceFactory {
  private static instance: IDataSource | null = null;

  /**
   * Get the singleton DataSource instance.
   * Defaults to SQLiteDataSource.
   */
  static getInstance(): IDataSource {
    if (!DataSourceFactory.instance) {
      DataSourceFactory.instance = DataSourceFactory.createDataSource('sqlite');
    }
    return DataSourceFactory.instance;
  }

  /**
   * Create a new DataSource instance of the specified type.
   * Used for testing or when you need a fresh instance.
   */
  static createDataSource(type: 'sqlite' | 'postgresql' | 'restapi' = 'sqlite'): IDataSource {
    switch (type) {
      case 'sqlite':
      default:
        return new SQLiteDataSource();
      // Future:
      // case 'postgresql':
      //   return new PostgreSQLDataSource(config);
      // case 'restapi':
      //   return new RestApiDataSource(config);
    }
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

