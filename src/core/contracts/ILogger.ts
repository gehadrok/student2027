/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

/**
 * Logger interface — all logging in the application must use this.
 * No direct console.log() calls outside of Logger.
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  critical(message: string, ...args: any[]): void;
  log(level: LogLevel, message: string, ...args: any[]): void;
}
