/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from '../datasource/IDataSource';

export interface Permission {
  code: string;
  resource: string;
  action: string;
}

/**
 * RBAC service (PG-6) — central, deny-by-default authorization.
 *
 * Model:  User -> (user_roles) -> Role -> (role_permissions) -> Permission
 *                                                       -> Resource + Action
 *
 * Permissions are evaluated centrally here; no scattered `role ===` checks.
 * Unknown users / missing links => empty permission set => denied (deny by default).
 */
export class RbacService {
  constructor(private readonly ds: IDataSource) {}

  /**
   * Load the effective permission set for a user from the RBAC tables.
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      return await this.ds.query<Permission>(
        `SELECT p.code AS code, p.resource AS resource, p.action AS action
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = ? AND p.is_active = 1`,
        [userId]
      );
    } catch (err) {
      return [];
    }
  }

  /**
   * Evaluate whether the given permission set grants (resource, action).
   * Supports exact match, action wildcard (`*`), and resource wildcard (`*`).
   */
  hasPermission(permissions: Permission[], resource: string, action: string): boolean {
    return permissions.some((p) => {
      if (p.resource === '*') return true;
      if (p.resource === resource && (p.action === action || p.action === '*')) return true;
      return false;
    });
  }
}
