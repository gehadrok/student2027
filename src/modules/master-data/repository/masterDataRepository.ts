/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDataSource } from '../../../core/datasource/IDataSource';
import { IMasterDataRepository } from '../../../core/repositories/IMasterDataRepository';
import {
  PaginatedResult,
  MasterDataFilter,
  MasterDataAuditLog,
} from '../types';
import { generateId, getCurrentUserId, getCurrentUserName } from '../utils';
import { DataSourceFactory } from '../../../core/datasource/DataSourceFactory';

/**
 * Map of entity type -> table name in DB
 */
const TABLE_MAP: Record<string, string> = {
  academic_years: 'academic_years',
  academic_terms: 'academic_terms',
  education_stages: 'education_stages',
  grade_levels: 'grade_levels',
  sections_master: 'sections_master',
  subjects_master: 'subjects_master',
  exam_types: 'exam_types',
  certificate_types: 'certificate_types',
  attendance_types: 'attendance_types',
  leave_types: 'leave_types',
  academic_statuses: 'academic_statuses',
  nationalities: 'nationalities',
  countries: 'countries',
  governorates: 'governorates',
  districts: 'districts',
  cities: 'cities',
  identity_types: 'identity_types',
  employee_types: 'employee_types',
  qualifications: 'qualifications',
  specializations: 'specializations',
  job_titles: 'job_titles',
  departments: 'departments',
  buildings: 'buildings',
  rooms: 'rooms',
  laboratories: 'laboratories',
  libraries: 'libraries',
  fee_categories: 'fee_categories',
  payment_methods: 'payment_methods',
  discount_types: 'discount_types',
  currencies: 'currencies',
  system_numbering: 'system_numbering',
  school_branches: 'school_branches',
  document_types: 'document_types',
};

/**
 * Master Data Repository implementation.
 * Uses constructor-based dependency injection for the DataSource.
 * Violation fixed: no longer imports querySqlSync/runSqlSync directly from sqlite-engine.
 */
export class MasterDataRepository implements IMasterDataRepository {
  private dataSource: IDataSource;

  constructor(dataSource?: IDataSource) {
    this.dataSource = dataSource || DataSourceFactory.getInstance();
  }

  getAll(entityType: string, filter: MasterDataFilter = {}): PaginatedResult<any> {
    const table = TABLE_MAP[entityType];
    if (!table) {
      return { data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    // Active filter
    if (filter.is_active !== undefined && filter.is_active !== 'all') {
      conditions.push('is_active = ?');
      params.push(filter.is_active);
    }

    // Search
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = `%${filter.searchQuery.trim()}%`;
      conditions.push(
        '(code LIKE ? OR name_ar LIKE ? OR name_en LIKE ? OR COALESCE(description,\'\') LIKE ?)'
      );
      params.push(q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const total = this.dataSource.count(
      `SELECT COUNT(*) as cnt FROM ${table} ${whereClause}`,
      params
    );

    // Sort
    const sortBy = filter.sortBy || 'display_order';
    const sortOrder = filter.sortOrder || 'asc';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;

    // Pagination
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const data = this.dataSource.query(
      `SELECT * FROM ${table} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  getAllFlat(entityType: string, activeOnly: boolean = true): any[] {
    const table = TABLE_MAP[entityType];
    if (!table) return [];

    if (activeOnly) {
      return this.dataSource.query(
        `SELECT * FROM ${table} WHERE is_active = 1 ORDER BY display_order ASC, name_ar ASC`
      );
    }
    return this.dataSource.query(
      `SELECT * FROM ${table} ORDER BY display_order ASC, name_ar ASC`
    );
  }

  getById(entityType: string, id: string): any | null {
    const table = TABLE_MAP[entityType];
    if (!table) return null;

    return this.dataSource.queryOne(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  }

  isFieldUnique(entityType: string, field: string, value: string, excludeId?: string): boolean {
    const table = TABLE_MAP[entityType];
    if (!table) return true;

    let sql = `SELECT COUNT(*) as cnt FROM ${table} WHERE ${field} = ?`;
    const params: any[] = [value];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    return !this.dataSource.exists(sql, params);
  }

  create(entityType: string, data: Record<string, any>): any | null {
    const table = TABLE_MAP[entityType];
    if (!table) return null;

    const id = data.id || generateId();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userId = getCurrentUserId();
    const userName = getCurrentUserName();

    const fields: string[] = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'];
    const values: any[] = [id, now, now, userName, userId];
    const placeholders: string[] = ['?', '?', '?', '?', '?'];

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;
      fields.push(key);
      values.push(value === undefined ? null : value);
      placeholders.push('?');
    }

    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
    this.dataSource.execute(sql, values);

    return this.getById(entityType, id);
  }

  update(entityType: string, id: string, data: Record<string, any>): any | null {
    const table = TABLE_MAP[entityType];
    if (!table) return null;

    const existing = this.getById(entityType, id);
    if (!existing) return null;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userName = getCurrentUserName();

    const setClauses: string[] = ['updated_at = ?', 'updated_by = ?'];
    const values: any[] = [now, userName];

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;
      setClauses.push(`${key} = ?`);
      values.push(value === undefined ? null : value);
    }

    values.push(id);
    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`;
    this.dataSource.execute(sql, values);

    return this.getById(entityType, id);
  }

  delete(entityType: string, id: string): boolean {
    const table = TABLE_MAP[entityType];
    if (!table) return false;

    try {
      // Check for child records before deleting
      const childRelations = this.getChildRelations(entityType, id);
      if (childRelations.length > 0) {
        console.warn(`Cannot delete ${entityType} ${id}: has child records`, childRelations);
        return false;
      }

      const result = this.dataSource.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return result.changes > 0;
    } catch (err) {
      console.error(`Failed to delete from ${table}:`, err);
      return false;
    }
  }

  bulkDelete(entityType: string, ids: string[]): { success: number; failed: number; errors: string[] } {
    const table = TABLE_MAP[entityType];
    if (!table) return { success: 0, failed: ids.length, errors: ['Invalid entity type'] };

    const errors: string[] = [];
    const queries: Array<{ sql: string; params?: any[] }> = [];

    for (const id of ids) {
      const childRelations = this.getChildRelations(entityType, id);
      if (childRelations.length > 0) {
        errors.push(`Cannot delete ${id}: has ${childRelations.length} child record(s)`);
        continue;
      }
      queries.push({ sql: `DELETE FROM ${table} WHERE id = ?`, params: [id] });
    }

    if (queries.length === 0) {
      return { success: 0, failed: ids.length, errors };
    }

    const result = this.dataSource.transaction(queries);
    if (!result.success) {
      errors.push(result.error || 'Transaction failed');
      return { success: 0, failed: ids.length, errors };
    }

    return { success: queries.length, failed: ids.length - queries.length, errors };
  }

  getParentRecords(parentEntityType: string): any[] {
    return this.getAllFlat(parentEntityType);
  }

  getFieldOptions(entityType: string, fieldName: string): { value: string; label: string }[] {
    const optionMap: Record<string, Record<string, string>> = {
      room_type: {
        classroom: 'فصل دراسي',
        lab: 'مختبر',
        library: 'مكتبة',
        hall: 'قاعة',
        office: 'مكتب إداري',
        storage: 'مستودع',
        other: 'أخرى',
      },
      lab_type: {
        physics: 'فيزياء',
        chemistry: 'كيمياء',
        biology: 'أحياء',
        computer: 'حاسوب',
        language: 'لغة',
        science: 'علوم عامة',
        other: 'أخرى',
      },
    };

    const opts = optionMap[fieldName] || {};
    return Object.entries(opts).map(([value, label]) => ({ value, label }));
  }

  logAudit(entry: Omit<MasterDataAuditLog, 'id' | 'performed_at'>): void {
    const id = `md_audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    this.dataSource.execute(
      `INSERT INTO master_data_audit_log (id, entity_type, entity_id, action, old_values, new_values, performed_by, performed_at, ip_address, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.old_values || null,
        entry.new_values || null,
        entry.performed_by,
        now,
        entry.ip_address || null,
        entry.details || null,
      ]
    );
  }

  getAuditLogs(entityType?: string, limit: number = 50): MasterDataAuditLog[] {
    let sql = 'SELECT * FROM master_data_audit_log';
    const params: any[] = [];

    if (entityType) {
      sql += ' WHERE entity_type = ?';
      params.push(entityType);
    }

    sql += ' ORDER BY performed_at DESC LIMIT ?';
    params.push(limit);

    return this.dataSource.query(sql, params).map((r: any) => ({
      id: r.id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      action: r.action,
      old_values: r.old_values,
      new_values: r.new_values,
      performed_by: r.performed_by,
      performed_at: r.performed_at,
      ip_address: r.ip_address,
      details: r.details,
    }));
  }

  generateNextNumber(code: string): string | null {
    const configs = this.dataSource.query<any>(
      'SELECT * FROM system_numbering WHERE code = ? AND is_active = 1',
      [code]
    );
    if (configs.length === 0) return null;

    const config = configs[0];
    const nextNum = config.next_number;
    const padded = String(nextNum).padStart(config.pad_length, '0');
    const result = `${config.prefix}${padded}`;

    this.dataSource.execute(
      'UPDATE system_numbering SET next_number = next_number + ? WHERE code = ? AND is_active = 1',
      [config.step, code]
    );

    return result;
  }

  getPermission(
    entityType: string
  ): {
    can_view: number;
    can_create: number;
    can_edit: number;
    can_delete: number;
    can_import: number;
    can_export: number;
  } | null {
    const result = this.dataSource.queryOne<any>(
      'SELECT can_view, can_create, can_edit, can_delete, can_import, can_export FROM master_data_permissions WHERE entity_type = ?',
      [entityType]
    );
    return result || null;
  }

  /**
   * Check for child records that reference this parent record.
   * Used to prevent orphan deletion.
   */
  private getChildRelations(entityType: string, id: string): { table: string; count: number }[] {
    const relationMap: Record<string, Array<{ table: string; fk: string }>> = {
      education_stages: [{ table: 'grade_levels', fk: 'education_stage_id' }],
      grade_levels: [{ table: 'sections_master', fk: 'grade_level_id' }],
      academic_years: [{ table: 'academic_terms', fk: 'academic_year_id' }],
      countries: [{ table: 'governorates', fk: 'country_id' }],
      governorates: [
        { table: 'districts', fk: 'governorate_id' },
        { table: 'cities', fk: 'governorate_id' },
      ],
      nationalities: [{ table: 'countries', fk: 'nationality_id' }],
      employee_types: [{ table: 'job_titles', fk: 'employee_type_id' }],
      departments: [{ table: 'departments', fk: 'parent_department_id' }],
      buildings: [
        { table: 'rooms', fk: 'building_id' },
        { table: 'laboratories', fk: 'building_id' },
        { table: 'libraries', fk: 'building_id' },
      ],
      fee_categories: [{ table: 'fee_categories', fk: 'parent_category_id' }],
    };

    const relations = relationMap[entityType] || [];
    const results: { table: string; count: number }[] = [];

    for (const rel of relations) {
      try {
        const count = this.dataSource.count(
          `SELECT COUNT(*) as cnt FROM ${rel.table} WHERE ${rel.fk} = ?`,
          [id]
        );
        if (count > 0) {
          results.push({ table: rel.table, count });
        }
      } catch (e) {
        console.warn(`Could not check relation ${rel.table}.${rel.fk}:`, e);
      }
    }

    return results;
  }
}

// Singleton instance with default DataSource
export const masterDataRepository = new MasterDataRepository();

