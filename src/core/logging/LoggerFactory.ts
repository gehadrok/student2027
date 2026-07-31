/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ILogger } from '../contracts/ILogger';
import { ConsoleLogger } from './ConsoleLogger';

/**
 * Logger factory — creates and manages logger instances.
 * Future: can return FileLogger, DatabaseLogger, etc.
 */
export class LoggerFactory {
  private static instance: ILogger | null = null;

  /**
   * Get the singleton logger instance.
   */
  static getInstance(prefix: string = 'App'): ILogger {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = LoggerFactory.createLogger('console', prefix);
    }
    return LoggerFactory.instance;
  }

  /**
   * Create a new logger of the specified type.
   */
  static createLogger(
    type: 'console' | 'file' | 'database' = 'console',
    prefix: string = 'App'
  ): ILogger {
    switch (type) {
      case 'console':
      default:
        return new ConsoleLogger(prefix);
      // Future:
      // case 'file':
      //   return new FileLogger(prefix);
      // case 'database':
      //   return new DatabaseLogger(prefix);
    }
  }

  /**
   * Reset the singleton (useful for testing).
   */
  static reset(): void {
    LoggerFactory.instance = null;
  }

  /**
   * Set a custom logger instance (for DI/testing).
   */
  static setInstance(instance: ILogger): void {
    LoggerFactory.instance = instance;
  }
}
