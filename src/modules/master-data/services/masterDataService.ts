/**
 * Master Data Service - Business Logic Layer
 */
import type { IMasterDataRepository } from '../../../core/repositories/IMasterDataRepository';
import {
  getMasterDataRepository,
  isServerSidePaginated,
} from '../repository/masterDataRepositoryProvider';
import {
  MasterDataEntity,
  MasterDataFilter,
  PaginatedResult,
  ImportResult,
  ExportOptions,
  MasterDataAuditLog,
  ValidationError
} from '../types';
import { validateMasterData } from '../validators';
import { generateId, getCurrentUserName, getCurrentUserId } from '../utils';

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export class MasterDataService {

  private readonly repository: IMasterDataRepository;

  constructor(repository: IMasterDataRepository = getMasterDataRepository()) {
    this.repository = repository;
  }

  /**
   * Get paginated data for any entity type
   */
  async getPaginated<T extends MasterDataEntity>(
    entityType: string,
    filter: MasterDataFilter
  ): Promise<PaginatedResult<T>> {
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 25;

    const paginated = await this.repository.getAll(entityType, filter);

    // In Real Mode the backend already applied page/size/search/filter/sort,
    // so the result is returned as-is instead of being processed twice.
    if (isServerSidePaginated(this.repository)) {
      return paginated as PaginatedResult<T>;
    }

    let data = paginated.data as T[];

    // Search
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      data = data.filter(item =>
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.name_ar && item.name_ar.toLowerCase().includes(q)) ||
        (item.name_en && item.name_en.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // Filter by active status
    if (filter.is_active !== undefined && filter.is_active !== 'all') {
      data = data.filter(item => item.is_active === filter.is_active);
    }

    // Sort
    const sortBy = filter.sortBy || 'display_order';
    const sortOrder = filter.sortOrder || 'asc';
    data.sort((a: any, b: any) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA);
      const strB = String(valB);
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    const total = data.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = data.slice(start, start + pageSize);

    return {
      data: paged,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * Get all records for dropdown/lookup
   */
  async getAll<T extends MasterDataEntity>(
    entityType: string,
    activeOnly: boolean = true
  ): Promise<T[]> {
    return (await this.repository.getAllFlat(entityType, activeOnly)) as T[];
  }

  /**
   * Get single record by ID
   */
  async getById<T extends MasterDataEntity>(entityType: string, id: string): Promise<T | null> {
    return (await this.repository.getById(entityType, id)) as T | null;
  }

  /**
   * Create a new master data record
   */
  async create<T extends MasterDataEntity>(
    entityType: string,
    data: Partial<T>,
    existingRecords: T[]
  ): Promise<{ success: boolean; errors: ValidationError[]; record?: T }> {
    // Validate
    const validation = validateMasterData(data as any, entityType, existingRecords);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userName = getCurrentUserName();
    const userId = getCurrentUserId();

    const record = {
      ...data,
      id: data.id || generateId(),
      is_active: data.is_active ?? 1,
      display_order: data.display_order ?? 0,
      created_at: now,
      updated_at: now,
      created_by: userId,
      updated_by: userId,
    } as unknown as T;

    try {
      await this.repository.create(entityType, record as any);
    } catch (error) {
      return { success: false, errors: [{ field: '', message: errorMessage(error, 'تعذر إنشاء السجل') }] };
    }

    // Audit log
    await this.logAudit(entityType, (record as any).id, 'CREATE', null, record, userName);

    return { success: true, errors: [], record };
  }

  /**
   * Update an existing master data record
   */
  async update<T extends MasterDataEntity>(
    entityType: string,
    id: string,
    data: Partial<T>,
    existingRecords: T[]
  ): Promise<{ success: boolean; errors: ValidationError[]; record?: T }> {
    const current = await this.getById<T>(entityType, id);
    if (!current) {
      return { success: false, errors: [{ field: 'id', message: 'السجل غير موجود' }] };
    }

    // Validate (exclude current record from duplicate check)
    const validation = validateMasterData(
      { ...current, ...data } as any,
      entityType,
      existingRecords,
      id
    );
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userName = getCurrentUserName();
    const userId = getCurrentUserId();

    const updated = {
      ...current,
      ...data,
      updated_at: now,
      updated_by: userId,
    } as unknown as T;

    try {
      await this.repository.update(entityType, id, updated as any);
    } catch (error) {
      return { success: false, errors: [{ field: '', message: errorMessage(error, 'تعذر تحديث السجل') }] };
    }

    // Audit log
    await this.logAudit(entityType, id, 'UPDATE', current, updated, userName);

    return { success: true, errors: [], record: updated };
  }

  /**
   * Delete a master data record
   */
  async delete(
    entityType: string,
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    const current = await this.getById<MasterDataEntity>(entityType, id);
    if (!current) {
      return { success: false, error: 'السجل غير موجود' };
    }

    try {
      await this.repository.delete(entityType, id);
    } catch (error) {
      return { success: false, error: errorMessage(error, 'تعذر حذف السجل') };
    }

    // Audit log
    const userName = getCurrentUserName();
    await this.logAudit(entityType, id, 'DELETE', current, null, userName);

    return { success: true };
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(
    entityType: string,
    ids: string[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const result = await this.delete(entityType, id);
      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push(result.error || `فشل حذف ${id}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Import data from Excel/CSV with transaction
   */
  async importData<T extends MasterDataEntity>(
    entityType: string,
    rows: Partial<T>[]
  ): Promise<ImportResult> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const existing = await this.getAll<T>(entityType, false);

    // For bulk imports, use transaction for better performance
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      try {
        const result = await this.create(entityType, row, existing);
        if (result.success && result.record) {
          success++;
          existing.push(result.record);
        } else {
          failed++;
          errors.push(`الصف ${index + 1}: ${result.errors.map(e => e.message).join('; ')}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`الصف ${index + 1}: خطأ غير متوقع - ${err.message}`);
      }
    }

    // Audit
    const userName = getCurrentUserName();
    await this.logAudit(entityType, 'BULK', 'IMPORT',
      { count: rows.length },
      { success, failed },
      userName
    );

    return { success, failed, errors };
  }

  /**
   * Export data
   */
  async exportData<T extends MasterDataEntity>(
    options: ExportOptions
  ): Promise<{ data: T[]; fileName: string }> {
    const records = await this.getAll<T>(options.entityType, false);
    const dateStr = new Date().toISOString().split('T')[0];
    const entityMap: Record<string, string> = {
      academic_years: 'السنوات_الدراسية',
      academic_terms: 'الفصول_الدراسية',
      education_stages: 'المراحل_التعليمية',
      grade_levels: 'الصفوف_الدراسية',
      nationalities: 'الجنسيات',
      countries: 'الدول',
      governorates: 'المحافظات',
      cities: 'المدن',
    };
    const fileName = `${entityMap[options.entityType] || options.entityType}_${dateStr}`;

    // Audit
    const userName = getCurrentUserName();
    await this.logAudit(options.entityType, 'ALL', 'EXPORT',
      { format: options.format, count: records.length },
      null,
      userName
    );

    return { data: records, fileName };
  }

  /**
   * Log audit trail for master data operations
   */
  private async logAudit(
    entityType: string,
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'PRINT',
    oldValues: any,
    newValues: any,
    performedBy: string
  ): Promise<void> {
    try {
      const log: MasterDataAuditLog = {
        id: generateId(),
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        performed_by: performedBy,
        performed_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ip_address: null,
        details: null
      };
      await this.repository.logAudit(log as any);
    } catch (err) {
      console.error('Failed to log audit:', err);
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getAuditLogs(entityType?: string, limit: number = 50): Promise<MasterDataAuditLog[]> {
    return this.repository.getAuditLogs(entityType, limit);
  }
}

export const masterDataService = new MasterDataService();


