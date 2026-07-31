/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

/**
 * Audit provider interface.
 * All audit logging in the application must use this.
 */
export interface IAuditProvider {
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void;
  getRecent(limit?: number): AuditEntry[];
  getByUser(userId: string, limit?: number): AuditEntry[];
  getByAction(action: string, limit?: number): AuditEntry[];
  getByDateRange(from: string, to: string, limit?: number): AuditEntry[];
}
