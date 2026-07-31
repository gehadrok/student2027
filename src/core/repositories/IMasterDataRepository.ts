/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PaginatedResult,
  MasterDataFilter,
  MasterDataAuditLog,
} from '../../modules/master-data/types';

/**
 * Repository interface for Master Data access.
 */
export interface IMasterDataRepository {
  getAll(entityType: string, filter?: MasterDataFilter): PaginatedResult<any>;
  getAllFlat(entityType: string, activeOnly?: boolean): any[];
  getById(entityType: string, id: string): any | null;
  create(entityType: string, data: Record<string, any>): any | null;
  update(entityType: string, id: string, data: Record<string, any>): any | null;
  delete(entityType: string, id: string): boolean;
  bulkDelete(entityType: string, ids: string[]): { success: number; failed: number; errors: string[] };
  isFieldUnique(entityType: string, field: string, value: string, excludeId?: string): boolean;
  logAudit(entry: Omit<MasterDataAuditLog, 'id' | 'performed_at'>): void;
  getAuditLogs(entityType?: string, limit?: number): MasterDataAuditLog[];
  getParentRecords(parentEntityType: string): any[];
  getFieldOptions(entityType: string, fieldName: string): { value: string; label: string }[];
  generateNextNumber(code: string): string | null;
  getPermission(entityType: string): { can_view: number; can_create: number; can_edit: number; can_delete: number; can_import: number; can_export: number } | null;
}

