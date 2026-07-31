/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ILogger, LogLevel } from '../contracts/ILogger';

/**
 * Console logger — writes logs to the browser console.
 * The ONLY place in the application where console.log/warn/error is allowed.
 */
export class ConsoleLogger implements ILogger {
  private readonly prefix: string;

  constructor(prefix: string = 'App') {
    this.prefix = prefix;
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[${this.prefix}] [DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[${this.prefix}] [INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}] [WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] [ERROR] ${message}`, ...args);
  }

  critical(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] [CRITICAL] ${message}`, ...args);
  }

  log(level: LogLevel, message: string, ...args: any[]): void {
    switch (level) {
      case 'debug':
        this.debug(message, ...args);
        break;
      case 'info':
        this.info(message, ...args);
        break;
      case 'warning':
        this.warn(message, ...args);
        break;
      case 'error':
        this.error(message, ...args);
        break;
      case 'critical':
        this.critical(message, ...args);
        break;
    }
  }
}
