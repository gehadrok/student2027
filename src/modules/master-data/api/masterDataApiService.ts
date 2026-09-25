/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-5 — Master Data REST API: application service.
 *
 * Thin orchestration layer between the HTTP controller and the
 * `MasterDataRepository`. Owns:
 *   - entity-type validation (against TABLE_MAP)
 *   - input validation (reuses existing validateMasterData)
 *   - HTTP-oriented error mapping (throws ApiError with status)
 *   - PostgreSQL repository path (via the injected repository)
 *
 * It deliberately does NOT touch getRealmDB / saveRealmDB / querySqlSync /
 * localStorage — the only browser-global reference in the write path is
 * avoided by passing an explicit `auditUser` ('api') to the repository.
 */
import { MasterDataRepository } from '../repository/masterDataRepository';
import { TABLE_MAP } from '../repository/masterDataRepository';
import { MasterDataFilter } from '../types';
import { ApiError } from './errors';
import { validateMasterData } from '../validators';

const API_AUDIT_USER = 'api';

export class MasterDataApiService {
  constructor(
    private readonly repo: MasterDataRepository,
    private readonly defaultAuditUser: string = API_AUDIT_USER
  ) {}

  private assertEntity(entityType: string): void {
    if (!TABLE_MAP[entityType]) {
      throw new ApiError(400, `نوع كيان غير معروف: ${entityType}`);
    }
  }

  /**
   * Map a validation result to the correct HTTP status. Uniqueness-only
   * failures are conflicts (409); other validation failures are 400.
   */
  private rejectIfInvalid(validation: { valid: boolean; errors: { field: string; message: string }[] }): void {
    if (validation.valid) return;
    const onlyUnique = validation.errors.every((e) => /موجود مسبقاً/.test(e.message));
    if (onlyUnique) throw new ApiError(409, 'الكود أو الاسم موجود مسبقاً');
    throw new ApiError(400, 'فشل التحقق من البيانات', validation.errors);
  }

  async list(entityType: string, query: Record<string, any>): Promise<any> {
    this.assertEntity(entityType);
    const sortOrder: 'asc' | 'desc' =
      typeof query.sortOrder === 'string' && (query.sortOrder === 'asc' || query.sortOrder === 'desc')
        ? query.sortOrder
        : 'asc';
    const filter: MasterDataFilter = {
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 25,
      searchQuery: typeof query.searchQuery === 'string' ? query.searchQuery : undefined,
      is_active: query.is_active === undefined ? 'all' : (query.is_active as any),
      sortBy: typeof query.sortBy === 'string' ? query.sortBy : 'display_order',
      sortOrder,
    };
    return this.repo.getAll(entityType, filter);
  }

  async get(entityType: string, id: string): Promise<any> {
    this.assertEntity(entityType);
    const row = await this.repo.getById(entityType, id);
    if (!row) throw new ApiError(404, 'السجل غير موجود');
    return row;
  }

  async create(entityType: string, body: Record<string, any>): Promise<any> {
    this.assertEntity(entityType);
    const existing = await this.repo.getAllFlat(entityType, false);
    const validation = validateMasterData(body, entityType, existing);
    this.rejectIfInvalid(validation);
    try {
      const created = await this.repo.create(entityType, body, this.defaultAuditUser);
      if (!created) throw new ApiError(409, 'تعذر إنشاء السجل (قد يكون الكود مكرراً)');
      return created;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      const msg = err?.message || '';
      if (/unique|duplicate/i.test(msg)) throw new ApiError(409, 'الكود أو الاسم موجود مسبقاً');
      throw err;
    }
  }

  async update(entityType: string, id: string, body: Record<string, any>): Promise<any> {
    this.assertEntity(entityType);
    const existing = await this.repo.getById(entityType, id);
    if (!existing) throw new ApiError(404, 'السجل غير موجود');
    const all = await this.repo.getAllFlat(entityType, false);
    const validation = validateMasterData({ ...existing, ...body }, entityType, all, id);
    this.rejectIfInvalid(validation);
    const updated = await this.repo.update(entityType, id, body, this.defaultAuditUser);
    if (!updated) throw new ApiError(404, 'السجل غير موجود');
    return updated;
  }

  async remove(entityType: string, id: string): Promise<void> {
    this.assertEntity(entityType);
    const existing = await this.repo.getById(entityType, id);
    if (!existing) throw new ApiError(404, 'السجل غير موجود');
    const ok = await this.repo.delete(entityType, id);
    if (!ok) throw new ApiError(409, 'لا يمكن حذف السجل لوجود سجلات مرتبطة به');
  }

  async bulkDelete(entityType: string, ids: string[]): Promise<{ success: number; failed: number; errors: string[] }> {
    this.assertEntity(entityType);
    if (!Array.isArray(ids) || ids.length === 0) throw new ApiError(400, 'قائمة المعرفات فارغة');
    return this.repo.bulkDelete(entityType, ids);
  }

  async bulkCreate(entityType: string, rows: Record<string, any>[]): Promise<{ success: number; failed: number; errors: string[] }> {
    this.assertEntity(entityType);
    if (!Array.isArray(rows) || rows.length === 0) throw new ApiError(400, 'قائمة السجلات فارغة');
    const all = await this.repo.getAllFlat(entityType, false);
    const errors: any[] = [];
    rows.forEach((row, i) => {
      const v = validateMasterData(row, entityType, all);
      if (!v.valid) errors.push(...v.errors.map((e) => ({ row: i + 1, ...e })));
    });
    if (errors.length > 0) {
      const onlyUnique = errors.every((e) => /موجود مسبقاً/.test(e.message));
      if (onlyUnique) throw new ApiError(409, 'الكود أو الاسم موجود مسبقاً');
      throw new ApiError(400, 'فشل التحقق من البيانات', errors);
    }
    const result = await this.repo.bulkCreate(entityType, rows, this.defaultAuditUser);
    if (!result.success) throw new ApiError(409, 'فشل الإدراج الجماعي (تم التراجع عن العملية)', result.errors);
    return result;
  }
}
