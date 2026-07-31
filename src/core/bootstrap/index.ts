/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * COMPOSITION ROOT
 * ===============
 * All infrastructure services are registered here.
 * No module may instantiate infrastructure directly.
 * This is the single source of truth for dependency wiring.
 */

import { Container } from '../di/Container';
import { LoggerFactory } from '../logging/LoggerFactory';
import { ConfigService } from '../config/ConfigService';
import { CacheService } from '../cache/CacheService';
import { MemoryCacheProvider } from '../cache/MemoryCacheProvider';
import { EventBus } from '../events/EventBus';
import { NotificationService } from '../notifications/NotificationService';
import { StorageFactory } from '../storage/StorageFactory';
import { AuditService } from '../audit/AuditService';
import { PermissionService } from '../permissions/PermissionService';
import { EncryptionService } from '../security/EncryptionService';
import { HashService } from '../security/HashService';
import { TokenService } from '../security/TokenService';
import { SessionService } from '../security/SessionService';
import { DataSourceFactory } from '../datasource/DataSourceFactory';

/**
 * Service identifiers for DI Container resolution.
 */
export const SERVICE_IDS = {
  // Core Infrastructure
  Logger: 'core.Logger',
  Config: 'core.Config',
  Cache: 'core.Cache',
  EventBus: 'core.EventBus',
  Notification: 'core.Notification',
  Storage: 'core.Storage',
  Audit: 'core.Audit',
  Permission: 'core.Permission',

  // Data
  DataSource: 'core.DataSource',

  // Security
  Encryption: 'core.Encryption',
  Hash: 'core.Hash',
  Token: 'core.Token',
  Session: 'core.Session',

  // Repositories
  StudentRepository: 'modules.StudentRepository',
  TeacherRepository: 'modules.TeacherRepository',
  FinancialRepository: 'modules.FinancialRepository',
  MasterDataRepository: 'modules.MasterDataRepository',
  DashboardRepository: 'modules.DashboardRepository',

  // Services
  DashboardService: 'modules.DashboardService',
} as const;

const logger = LoggerFactory.getInstance('Bootstrap');

/**
 * Initialize all infrastructure services.
 * Must be called once at application startup.
 */
export function initializeInfrastructure(): void {
  const container = Container.getInstance();

  logger.info('Initializing infrastructure...');

  // ── 1. Config ────────────────────────────────────────────────────────────
  const config = ConfigService.getInstance();
  container.registerInstance(SERVICE_IDS.Config, config);

  // ── 2. Logger ────────────────────────────────────────────────────────────
  const appLogger = LoggerFactory.getInstance('App');
  container.registerInstance(SERVICE_IDS.Logger, appLogger);

  // ── 3. Cache ─────────────────────────────────────────────────────────────
  const cacheProvider = new MemoryCacheProvider(config.cache.defaultTtlMs);
  const cache = new CacheService(cacheProvider);
  container.registerInstance(SERVICE_IDS.Cache, cache);

  // ── 4. Event Bus ─────────────────────────────────────────────────────────
  const eventBus = EventBus.getInstance();
  container.registerInstance(SERVICE_IDS.EventBus, eventBus);

  // ── 5. Storage ───────────────────────────────────────────────────────────
  const storage = StorageFactory.getInstance('local');
  container.registerInstance(SERVICE_IDS.Storage, storage);

  // ── 6. Notification ──────────────────────────────────────────────────────
  const notification = new NotificationService();
  container.registerInstance(SERVICE_IDS.Notification, notification);

  // ── 7. Audit ─────────────────────────────────────────────────────────────
  const audit = new AuditService();
  container.registerInstance(SERVICE_IDS.Audit, audit);

  // ── 8. Permission ────────────────────────────────────────────────────────
  const permission = new PermissionService();
  container.registerInstance(SERVICE_IDS.Permission, permission);

  // ── 9. Security ──────────────────────────────────────────────────────────
  const encryption = new EncryptionService(config.security.encryptionKey);
  const hash = new HashService();
  const token = new TokenService(config.security.jwtSecret, config.security.jwtExpiryMinutes);
  const session = new SessionService(token, config.app.sessionTimeoutMinutes);

  container.registerInstance(SERVICE_IDS.Encryption, encryption);
  container.registerInstance(SERVICE_IDS.Hash, hash);
  container.registerInstance(SERVICE_IDS.Token, token);
  container.registerInstance(SERVICE_IDS.Session, session);

  // ── 10. DataSource ───────────────────────────────────────────────────────
  const dataSource = DataSourceFactory.getInstance();
  container.registerInstance(SERVICE_IDS.DataSource, dataSource);

  logger.info(`Infrastructure initialized. Registered ${container.getRegisteredServices().length} services.`);
}

/**
 * Get a service from the DI container.
 * Convenience wrapper for Container.getInstance().resolve().
 */
export function resolve<T>(serviceId: string): T {
  return Container.getInstance().resolve<T>(serviceId);
}

export { Container };
