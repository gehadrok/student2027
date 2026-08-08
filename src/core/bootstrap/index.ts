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
import { AuthService } from '../auth/AuthService';
import { ConfigurationError } from '../errors/AppError';
import { studentRepository } from '../../modules/students/repository/studentRepository';
import { teacherRepository } from '../../modules/teachers/repository/teacherRepository';
import { financialRepository } from '../../modules/financial/repository/financialRepository';
import { masterDataRepository } from '../../modules/master-data/repository/masterDataRepository';
import { dashboardRepository } from '../../modules/dashboard/repository/dashboardRepository';
import { dashboardService } from '../../modules/dashboard/services/dashboardService';
import { SQLiteAcademicYearRepository } from '../../modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository';
import { SQLiteCurriculumRepository } from '../../modules/academic/infrastructure/repositories/SQLiteCurriculumRepository';
import { SQLiteCourseAssignmentRepository } from '../../modules/academic/infrastructure/repositories/SQLiteCourseAssignmentRepository';
import { SQLiteAcademicCalendarRepository } from '../../modules/academic/infrastructure/repositories/SQLiteAcademicCalendarRepository';
import { AcademicYearService } from '../../modules/academic/application/services/AcademicYearService';
import { CurriculumService } from '../../modules/academic/application/services/CurriculumService';
import { CourseAssignmentService } from '../../modules/academic/application/services/CourseAssignmentService';
import { AcademicCalendarService } from '../../modules/academic/application/services/AcademicCalendarService';

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

  // Security & Auth
  Encryption: 'core.Encryption',
  Hash: 'core.Hash',
  Token: 'core.Token',
  Session: 'core.Session',
  Auth: 'core.Auth',

  // Repositories
  StudentRepository: 'modules.StudentRepository',
  TeacherRepository: 'modules.TeacherRepository',
FinancialRepository: 'modules.FinancialRepository',
  MasterDataRepository: 'modules.MasterDataRepository',
  DashboardRepository: 'modules.DashboardRepository',

  // Academic Repositories
  AcademicYearRepository: 'modules.AcademicYearRepository',
  CurriculumRepository: 'modules.CurriculumRepository',
  CourseAssignmentRepository: 'modules.CourseAssignmentRepository',
  AcademicCalendarRepository: 'modules.AcademicCalendarRepository',

// Services
  DashboardService: 'modules.DashboardService',

  // Academic Application Services
  AcademicYearService: 'modules.academic.AcademicYearService',
  CurriculumService: 'modules.academic.CurriculumService',
  CourseAssignmentService: 'modules.academic.CourseAssignmentService',
  AcademicCalendarService: 'modules.academic.AcademicCalendarService',
} as const;

const logger = LoggerFactory.getInstance('Bootstrap');

let initialized = false;

/**
 * Initialize all infrastructure services.
 * Must be called once at application startup before the App renders.
 * Fails fast if any mandatory registration is missing after wiring.
 */
export function initializeInfrastructure(): void {
  if (initialized) {
    logger.warn('initializeInfrastructure() called more than once. Skipping duplicate initialization.');
    return;
  }

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

  // ── 11. Auth ─────────────────────────────────────────────────────────────
  const auth = new AuthService(dataSource, hash, token);
  container.registerInstance(SERVICE_IDS.Auth, auth);

  // ── 12. Repositories ─────────────────────────────────────────────────────
  container.registerInstance(SERVICE_IDS.StudentRepository, studentRepository);
  container.registerInstance(SERVICE_IDS.TeacherRepository, teacherRepository);
  container.registerInstance(SERVICE_IDS.FinancialRepository, financialRepository);
  container.registerInstance(SERVICE_IDS.MasterDataRepository, masterDataRepository);
container.registerInstance(SERVICE_IDS.DashboardRepository, dashboardRepository);

  // ── 12b. Academic Repositories ───────────────────────────────────────────
  container.registerInstance(
    SERVICE_IDS.AcademicYearRepository,
    new SQLiteAcademicYearRepository(dataSource)
  );
  container.registerInstance(
    SERVICE_IDS.CurriculumRepository,
    new SQLiteCurriculumRepository(dataSource)
  );
  container.registerInstance(
    SERVICE_IDS.CourseAssignmentRepository,
    new SQLiteCourseAssignmentRepository(dataSource)
  );
  container.registerInstance(
    SERVICE_IDS.AcademicCalendarRepository,
    new SQLiteAcademicCalendarRepository(dataSource)
  );

// ── 13. Dashboard Service ────────────────────────────────────────────────
  container.registerInstance(SERVICE_IDS.DashboardService, dashboardService);

  // ── 14. Academic Application Services ────────────────────────────────────
  container.registerInstance(
    SERVICE_IDS.AcademicYearService,
    new AcademicYearService(new SQLiteAcademicYearRepository(dataSource))
  );
  container.registerInstance(
    SERVICE_IDS.CurriculumService,
    new CurriculumService(new SQLiteCurriculumRepository(dataSource))
  );
  container.registerInstance(
    SERVICE_IDS.CourseAssignmentService,
    new CourseAssignmentService(new SQLiteCourseAssignmentRepository(dataSource))
  );
  container.registerInstance(
    SERVICE_IDS.AcademicCalendarService,
    new AcademicCalendarService(new SQLiteAcademicCalendarRepository(dataSource))
  );

  // ── Mandatory registration audit (fail fast) ─────────────────────────────
  const mandatoryServiceIds = Object.values(SERVICE_IDS);
  const missing = mandatoryServiceIds.filter((id) => !container.has(id));
  if (missing.length > 0) {
    throw new ConfigurationError(
      `Mandatory service registrations are missing: ${missing.join(', ')}`
    );
  }

  initialized = true;
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
