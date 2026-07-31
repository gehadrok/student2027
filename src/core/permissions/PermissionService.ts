/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IPermissionProvider, Permission } from './IPermissionProvider';
import { PermissionError } from '../errors/AppError';
import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * Default permission provider — uses role-based rules.
 * Maps roles to allowed resource+action combinations.
 */
class DefaultPermissionProvider implements IPermissionProvider {
  // Role-based permission matrix
  private readonly rolePermissions: Record<string, Permission[]> = {
    admin: [
      { resource: '*', action: 'create' },
      { resource: '*', action: 'read' },
      { resource: '*', action: 'update' },
      { resource: '*', action: 'delete' },
      { resource: '*', action: 'import' },
      { resource: '*', action: 'export' },
      { resource: '*', action: 'print' },
    ],
    teacher: [
      { resource: 'student', action: 'read' },
      { resource: 'attendance', action: 'create' },
      { resource: 'attendance', action: 'read' },
      { resource: 'attendance', action: 'update' },
      { resource: 'grade', action: 'create' },
      { resource: 'grade', action: 'read' },
      { resource: 'grade', action: 'update' },
      { resource: 'schedule', action: 'read' },
      { resource: 'report', action: 'read' },
      { resource: 'report', action: 'print' },
    ],
    student: [
      { resource: 'grade', action: 'read' },
      { resource: 'attendance', action: 'read' },
      { resource: 'schedule', action: 'read' },
      { resource: 'report', action: 'read' },
    ],
    parent: [
      { resource: 'student', action: 'read' },
      { resource: 'grade', action: 'read' },
      { resource: 'attendance', action: 'read' },
      { resource: 'payment', action: 'read' },
      { resource: 'report', action: 'read' },
    ],
  };

  // User-to-role mapping (simplified — in production, this comes from the database)
  private readonly userRoles: Record<string, string[]> = {};

  constructor() {
    // Default admin
    this.userRoles['admin'] = ['admin'];
  }

  setUserRole(userId: string, role: string): void {
    this.userRoles[userId] = [role];
  }

  hasPermission(userId: string, permission: Permission): boolean {
    const roles = this.getUserRoles(userId);
    for (const role of roles) {
      const permissions = this.rolePermissions[role];
      if (!permissions) continue;

      for (const p of permissions) {
        const resourceMatch = p.resource === '*' || p.resource === permission.resource;
        const actionMatch = p.action === permission.action;
        if (resourceMatch && actionMatch) {
          return true;
        }
      }
    }
    return false;
  }

  hasPermissions(userId: string, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(userId, p));
  }

  getUserPermissions(userId: string): Permission[] {
    const roles = this.getUserRoles(userId);
    const permissions: Permission[] = [];
    for (const role of roles) {
      const rolePerms = this.rolePermissions[role];
      if (rolePerms) {
        permissions.push(...rolePerms);
      }
    }
    return permissions;
  }

  getUserRoles(userId: string): string[] {
    return this.userRoles[userId] || ['student'];
  }
}

/**
 * Permission service — application-level permission checking.
 */
export class PermissionService {
  private provider: IPermissionProvider;
  private readonly logger = LoggerFactory.getInstance('Permission');

  constructor(provider?: IPermissionProvider) {
    this.provider = provider || new DefaultPermissionProvider();
  }

  /**
   * Check if a user has a specific permission.
   * Throws PermissionError if not granted.
   */
  checkPermission(userId: string, permission: Permission): void {
    if (!this.provider.hasPermission(userId, permission)) {
      this.logger.warn(`Permission denied for user ${userId}: ${permission.action} ${permission.resource}`);
      throw new PermissionError(`Permission denied: ${permission.action} on ${permission.resource}`);
    }
  }

  hasPermission(userId: string, permission: Permission): boolean {
    return this.provider.hasPermission(userId, permission);
  }

  hasPermissions(userId: string, permissions: Permission[]): boolean {
    return this.provider.hasPermissions(userId, permissions);
  }

  getUserPermissions(userId: string): Permission[] {
    return this.provider.getUserPermissions(userId);
  }

  getUserRoles(userId: string): string[] {
    return this.provider.getUserRoles(userId);
  }
}
