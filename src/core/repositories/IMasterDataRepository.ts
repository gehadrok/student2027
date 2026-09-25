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
  getAll(entityType: string, filter?: MasterDataFilter): Promise<PaginatedResult<any>>;
  getAllFlat(entityType: string, activeOnly?: boolean): Promise<any[]>;
  getById(entityType: string, id: string): Promise<any | null>;
  create(entityType: string, data: Record<string, any>): Promise<any | null>;
  update(entityType: string, id: string, data: Record<string, any>): Promise<any | null>;
  delete(entityType: string, id: string): Promise<boolean>;
  bulkDelete(entityType: string, ids: string[]): Promise<{ success: number; failed: number; errors: string[] }>;
  bulkCreate(entityType: string, rows: Record<string, any>[], auditUser?: string): Promise<{ success: number; failed: number; errors: string[] }>;
  isFieldUnique(entityType: string, field: string, value: string, excludeId?: string): Promise<boolean>;
  logAudit(entry: Omit<MasterDataAuditLog, 'id' | 'performed_at'>): Promise<void>;
  getAuditLogs(entityType?: string, limit?: number): Promise<MasterDataAuditLog[]>;
  getParentRecords(parentEntityType: string): Promise<any[]>;
  getFieldOptions(entityType: string, fieldName: string): Promise<{ value: string; label: string }[]>;
  generateNextNumber(code: string): Promise<string | null>;
  getPermission(entityType: string): Promise<{ can_view: number; can_create: number; can_edit: number; can_delete: number; can_import: number; can_export: number } | null>;
}

