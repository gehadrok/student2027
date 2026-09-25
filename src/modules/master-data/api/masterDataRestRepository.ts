/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase C2 — Master Data REST client repository.
 *
 * Implements the existing `IMasterDataRepository` contract on top of the
 * Phase-C1 `ApiClient`, so the shared bearer token, 401 handling and 403
 * handling are reused unchanged.
 *
 * The endpoints are the EXISTING Kayan Master Data REST contract
 * (`/api/master-data`, verified by `api/pg5.masterData.api.live.test.ts`):
 *
 *   GET    /api/master-data/:entityType            -> { data, total, page, pageSize, totalPages }
 *   GET    /api/master-data/:entityType/:id        -> record | 404
 *   POST   /api/master-data/:entityType            -> 201 record
 *   PUT    /api/master-data/:entityType/:id        -> record
 *   DELETE /api/master-data/:entityType/:id        -> 204
 *   POST   /api/master-data/:entityType/bulk       -> { success, failed, errors }
 *   POST   /api/master-data/:entityType/bulk-delete-> { success, failed, errors }
 *
 * No endpoint, field, permission or validation rule is invented here.
 * Repository methods that have NO backend endpoint throw
 * `MasterDataRestUnsupportedError` instead of being faked client-side.
 */

import { apiClient } from '../../../lib/api';
import type { ApiClient } from '../../../lib/api/ApiClient';
import { ApiError } from '../../../lib/api/errors';
import type { IMasterDataRepository } from '../../../core/repositories/IMasterDataRepository';
import type {
  MasterDataAuditLog,
  MasterDataFilter,
  PaginatedResult,
} from '../types';

/**
 * INTEGRATION REQUIREMENT: must match the deployed Kayan Master Data mount.
 * Change here only if the deployment uses a different prefix.
 */
export const KAYAN_MASTER_DATA_PATH = '/api/master-data';

/** Client-chosen page size for multi-page reads (an existing API parameter). */
const FLAT_PAGE_SIZE = 100;

export type MasterDataRestClient = Pick<ApiClient, 'get' | 'post' | 'put' | 'delete'>;

export class MasterDataRestUnsupportedError extends Error {
  readonly operation: string;

  constructor(operation: string) {
    super(`العملية غير مدعومة من واجهة Kayan الحالية: ${operation}`);
    this.name = 'MasterDataRestUnsupportedError';
    this.operation = operation;
  }
}

export class MasterDataContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MasterDataContractError';
  }
}

function isRecordPayload(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertPaginated(value: unknown): PaginatedResult<any> {
  if (!isRecordPayload(value) || !Array.isArray(value.data) || typeof value.total !== 'number') {
    throw new MasterDataContractError('استجابة قائمة Kayan لا تطابق العقد المتوقع { data, total, ... }');
  }
  return {
    data: value.data,
    total: value.total,
    page: typeof value.page === 'number' ? value.page : 1,
    pageSize: typeof value.pageSize === 'number' ? value.pageSize : FLAT_PAGE_SIZE,
    totalPages: typeof value.totalPages === 'number' ? value.totalPages : 1,
  };
}

function assertRecord(value: unknown): any {
  if (!isRecordPayload(value)) {
    throw new MasterDataContractError('استجابة سجل Kayan لا تطابق العقد المتوقع');
  }
  return value;
}

function assertBulkResult(value: unknown): { success: number; failed: number; errors: string[] } {
  if (!isRecordPayload(value) || typeof value.success !== 'number' || typeof value.failed !== 'number') {
    throw new MasterDataContractError('استجابة العملية الجماعية لا تطابق العقد المتوقع { success, failed, errors }');
  }
  const errors = Array.isArray(value.errors) ? value.errors.map((item) => String(item)) : [];
  return { success: value.success, failed: value.failed, errors };
}

export class MasterDataRestRepository implements IMasterDataRepository {
  /** The backend already applies page/size/search/filter/sort. */
  readonly paginatesServerSide = true;

  constructor(private readonly client: MasterDataRestClient = apiClient) {}

  private collection(entityType: string): string {
    return `${KAYAN_MASTER_DATA_PATH}/${encodeURIComponent(entityType)}`;
  }

  private item(entityType: string, id: string): string {
    return `${this.collection(entityType)}/${encodeURIComponent(id)}`;
  }

  async getAll(entityType: string, filter: MasterDataFilter = {}): Promise<PaginatedResult<any>> {
    const payload = await this.client.get<unknown>(this.collection(entityType), {
      query: {
        page: filter.page ?? 1,
        pageSize: filter.pageSize ?? 25,
        searchQuery: filter.searchQuery,
        is_active: filter.is_active,
        sortBy: filter.sortBy ?? 'display_order',
        sortOrder: filter.sortOrder ?? 'asc',
      },
    });
    return assertPaginated(payload);
  }

  async getAllFlat(entityType: string, activeOnly = true): Promise<any[]> {
    const rows: any[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (rows.length < total) {
      const result = await this.getAll(entityType, {
        page,
        pageSize: FLAT_PAGE_SIZE,
        is_active: activeOnly ? 1 : 'all',
      });
      rows.push(...result.data);
      total = result.total;
      if (result.data.length === 0) break;
      page += 1;
    }

    return rows;
  }

  async getById(entityType: string, id: string): Promise<any | null> {
    try {
      return assertRecord(await this.client.get<unknown>(this.item(entityType, id)));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async create(entityType: string, data: Record<string, any>): Promise<any | null> {
    return assertRecord(await this.client.post<unknown>(this.collection(entityType), data));
  }

  async update(entityType: string, id: string, data: Record<string, any>): Promise<any | null> {
    try {
      return assertRecord(await this.client.put<unknown>(this.item(entityType, id), data));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async delete(entityType: string, id: string): Promise<boolean> {
    try {
      await this.client.delete<unknown>(this.item(entityType, id));
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return false;
      throw error;
    }
  }

  async bulkCreate(
    entityType: string,
    rows: Record<string, any>[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const payload = await this.client.post<unknown>(`${this.collection(entityType)}/bulk`, { rows });
    return assertBulkResult(payload);
  }

  async bulkDelete(
    entityType: string,
    ids: string[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const payload = await this.client.post<unknown>(`${this.collection(entityType)}/bulk-delete`, { ids });
    return assertBulkResult(payload);
  }

  async isFieldUnique(): Promise<boolean> {
    throw new MasterDataRestUnsupportedError('isFieldUnique');
  }

  async logAudit(): Promise<void> {
    throw new MasterDataRestUnsupportedError('logAudit');
  }

  async getAuditLogs(): Promise<MasterDataAuditLog[]> {
    throw new MasterDataRestUnsupportedError('getAuditLogs');
  }

  async getParentRecords(): Promise<any[]> {
    throw new MasterDataRestUnsupportedError('getParentRecords');
  }

  async getFieldOptions(): Promise<{ value: string; label: string }[]> {
    throw new MasterDataRestUnsupportedError('getFieldOptions');
  }

  async generateNextNumber(): Promise<string | null> {
    throw new MasterDataRestUnsupportedError('generateNextNumber');
  }

  async getPermission(): Promise<{
    can_view: number;
    can_create: number;
    can_edit: number;
    can_delete: number;
    can_import: number;
    can_export: number;
  } | null> {
    throw new MasterDataRestUnsupportedError('getPermission');
  }
}
