/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'import' | 'export' | 'print';
}

/**
 * Permission provider interface.
 * Future: integrate with role-based access control (RBAC) or attribute-based (ABAC).
 */
export interface IPermissionProvider {
  hasPermission(userId: string, permission: Permission): boolean;
  hasPermissions(userId: string, permissions: Permission[]): boolean;
  getUserPermissions(userId: string): Permission[];
  getUserRoles(userId: string): string[];
}
