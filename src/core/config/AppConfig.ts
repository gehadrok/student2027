/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Strongly typed application configuration.
 * No hardcoded configuration values — everything is centralized here.
 */
export interface AppConfig {
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
  language: string;
  timeZone: string;
  dateFormat: string;
  currency: string;
  sessionTimeoutMinutes: number;
  enable2FA: boolean;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql';
  name: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  autoMigrate: boolean;
  persistenceKey: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiryMinutes: number;
  bcryptRounds: number;
  encryptionKey: string;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  passwordRequireSpecialChar: boolean;
}

export interface PrintingConfig {
  defaultPaperSize: string;
  watermarkText: string;
  enableQRCode: boolean;
  reportHeader: string;
  reportFooter: string;
}

export interface NotificationConfig {
  enableEmail: boolean;
  enableSMS: boolean;
  enablePush: boolean;
  enableWhatsApp: boolean;
  smsProvider: string;
  emailProvider: string;
  emailFromAddress: string;
}

export interface BackupConfig {
  autoBackupFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  backupRetentionDays: number;
  backupLocation: string;
}

export interface CacheConfig {
  defaultTtlMs: number;
  maxEntries: number;
  enablePersistence: boolean;
}
