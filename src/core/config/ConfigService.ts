/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppConfig,
  DatabaseConfig,
  SecurityConfig,
  PrintingConfig,
  NotificationConfig,
  BackupConfig,
  CacheConfig,
} from './AppConfig';
import { ConfigurationError } from '../errors/AppError';
import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * Configuration service — central access point for all app configuration.
 * Reads from environment variables, localStorage, or defaults.
 * No module should hardcode configuration values.
 */
export class ConfigService {
  private static instance: ConfigService;
  private readonly logger = LoggerFactory.getInstance('Config');

  private _app!: AppConfig;
  private _database!: DatabaseConfig;
  private _security!: SecurityConfig;
  private _printing!: PrintingConfig;
  private _notification!: NotificationConfig;
  private _backup!: BackupConfig;
  private _cache!: CacheConfig;

  private constructor() {
    this.load();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load all configuration from defaults + overrides.
   */
  private load(): void {
    this._app = this.loadAppConfig();
    this._database = this.loadDatabaseConfig();
    this._security = this.loadSecurityConfig();
    this._printing = this.loadPrintingConfig();
    this._notification = this.loadNotificationConfig();
    this._backup = this.loadBackupConfig();
    this._cache = this.loadCacheConfig();

    this.logger.info('Configuration loaded successfully');
  }

  private loadAppConfig(): AppConfig {
    return {
      appName: this.getEnv('REACT_APP_NAME', 'Al-Salam School Management System'),
      appVersion: this.getEnv('REACT_APP_VERSION', '1.0.0'),
      environment: (this.getEnv('REACT_APP_ENV', 'development') as any) || 'development',
      language: this.getEnv('REACT_APP_LANG', 'ar'),
      timeZone: this.getEnv('REACT_APP_TZ', 'Asia/Aden'),
      dateFormat: this.getEnv('REACT_APP_DATE_FORMAT', 'DD/MM/YYYY'),
      currency: this.getEnv('REACT_APP_CURRENCY', 'YER'),
      sessionTimeoutMinutes: parseInt(this.getEnv('REACT_APP_SESSION_TIMEOUT', '30'), 10),
      enable2FA: this.getEnv('REACT_APP_2FA', 'false') === 'true',
    };
  }

  private loadDatabaseConfig(): DatabaseConfig {
    return {
      type: 'sqlite',
      name: 'al_salam_school',
      autoMigrate: true,
      persistenceKey: 'al_salam_school_sqlite_db_v1',
    };
  }

  private loadSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: this.getEnv('REACT_APP_JWT_SECRET', 'al-salam-school-secret-key-change-in-production'),
      jwtExpiryMinutes: parseInt(this.getEnv('REACT_APP_JWT_EXPIRY', '60'), 10),
      bcryptRounds: parseInt(this.getEnv('REACT_APP_BCRYPT_ROUNDS', '10'), 10),
      encryptionKey: this.getEnv('REACT_APP_ENCRYPTION_KEY', 'default-encryption-key-32chars!'),
      maxLoginAttempts: parseInt(this.getEnv('REACT_APP_MAX_LOGIN_ATTEMPTS', '5'), 10),
      lockoutDurationMinutes: parseInt(this.getEnv('REACT_APP_LOCKOUT_DURATION', '15'), 10),
      passwordMinLength: parseInt(this.getEnv('REACT_APP_PASSWORD_MIN_LENGTH', '8'), 10),
      passwordRequireSpecialChar: this.getEnv('REACT_APP_PASSWORD_SPECIAL', 'true') === 'true',
    };
  }

  private loadPrintingConfig(): PrintingConfig {
    return {
      defaultPaperSize: this.getEnv('REACT_APP_PAPER_SIZE', 'A4'),
      watermarkText: this.getEnv('REACT_APP_WATERMARK', 'مدرسة خالد بن الوليد - رسمي'),
      enableQRCode: this.getEnv('REACT_APP_QR_CODE', 'true') === 'true',
      reportHeader: this.getEnv(
        'REACT_APP_REPORT_HEADER',
        'الجمهورية اليمنية - وزارة التربية والتعليم - مدرسة خالد ابن الوليد الثانوية'
      ),
      reportFooter: this.getEnv(
        'REACT_APP_REPORT_FOOTER',
        'هذه الوثيقة صادرة إلكترونياً وتعتبر رسمية عند اقترانها بالختم والرمز الرقمي QR'
      ),
    };
  }

  private loadNotificationConfig(): NotificationConfig {
    return {
      enableEmail: this.getEnv('REACT_APP_NOTIF_EMAIL', 'true') === 'true',
      enableSMS: this.getEnv('REACT_APP_NOTIF_SMS', 'false') === 'true',
      enablePush: this.getEnv('REACT_APP_NOTIF_PUSH', 'true') === 'true',
      enableWhatsApp: this.getEnv('REACT_APP_NOTIF_WHATSAPP', 'false') === 'true',
      smsProvider: this.getEnv('REACT_APP_SMS_PROVIDER', 'twilio'),
      emailProvider: this.getEnv('REACT_APP_EMAIL_PROVIDER', 'smtp'),
      emailFromAddress: this.getEnv('REACT_APP_EMAIL_FROM', 'noreply@khaled-school.edu.ye'),
    };
  }

  private loadBackupConfig(): BackupConfig {
    return {
      autoBackupFrequency: (this.getEnv('REACT_APP_BACKUP_FREQ', 'daily') as any) || 'daily',
      backupRetentionDays: parseInt(this.getEnv('REACT_APP_BACKUP_RETENTION', '30'), 10),
      backupLocation: this.getEnv('REACT_APP_BACKUP_LOCATION', 'local'),
    };
  }

  private loadCacheConfig(): CacheConfig {
    return {
      defaultTtlMs: parseInt(this.getEnv('REACT_APP_CACHE_TTL', '30000'), 10),
      maxEntries: parseInt(this.getEnv('REACT_APP_CACHE_MAX', '1000'), 10),
      enablePersistence: this.getEnv('REACT_APP_CACHE_PERSIST', 'false') === 'true',
    };
  }

  private getEnv(key: string, defaultValue: string): string {
    // Try process.env (for Node/Vite) or fall back to default
    try {
      return (typeof process !== 'undefined' && process.env && (process.env as any)[key]) || defaultValue;
    } catch {
      return defaultValue;
    }
  }

  // Getters
  get app(): AppConfig {
    if (!this._app) throw new ConfigurationError('AppConfig not loaded');
    return this._app;
  }
  get database(): DatabaseConfig {
    if (!this._database) throw new ConfigurationError('DatabaseConfig not loaded');
    return this._database;
  }
  get security(): SecurityConfig {
    if (!this._security) throw new ConfigurationError('SecurityConfig not loaded');
    return this._security;
  }
  get printing(): PrintingConfig {
    if (!this._printing) throw new ConfigurationError('PrintingConfig not loaded');
    return this._printing;
  }
  get notification(): NotificationConfig {
    if (!this._notification) throw new ConfigurationError('NotificationConfig not loaded');
    return this._notification;
  }
  get backup(): BackupConfig {
    if (!this._backup) throw new ConfigurationError('BackupConfig not loaded');
    return this._backup;
  }
  get cache(): CacheConfig {
    if (!this._cache) throw new ConfigurationError('CacheConfig not loaded');
    return this._cache;
  }
}
