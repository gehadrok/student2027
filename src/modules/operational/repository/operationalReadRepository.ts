/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Operational Academic READ repository.
 *
 * Explicit column lists only (never SELECT *), parameterized filters and
 * scope predicates only. No write statement is issued by this repository.
 */

import type { IDataSource } from '../../../core/datasource/IDataSource';
import type { OperationalListQuery, PrincipalScope } from './types';

export interface TableSpec {
  table: string;
  columns: string[];
  alias: string;
  sortAllowList: string[];
  defaultSort: string;
}

export const TABLE_SPECS: Record<string, TableSpec> = {
  student: {
    table: 'students',
    alias: 's',
    columns: [
      'id', 'user_id', 'academic_id', 'name', 'class_id', 'section_id', 'parent_id',
      'parent_name', 'parent_phone', 'birth_date', 'gender', 'photo', 'status',
      'health_notes', 'enrollment_date',
    ],
    sortAllowList: ['name', 'academic_id', 'enrollment_date'],
    defaultSort: 'name',
  },
  teacher: {
    table: 'teachers',
    alias: 't',
    columns: ['id', 'user_id', 'name', 'email', 'phone', 'specialization', 'photo', 'status'],
    sortAllowList: ['name'],
    defaultSort: 'name',
  },
  class: {
    table: 'school_classes',
    alias: 'c',
    columns: ['id', 'name', 'level'],
    sortAllowList: ['name', 'level'],
    defaultSort: 'level',
  },
  section: {
    table: 'sections',
    alias: 'sec',
    columns: ['id', 'name', 'class_id', 'room_number', 'capacity', 'supervisor_teacher_id'],
    sortAllowList: ['name', 'capacity'],
    defaultSort: 'name',
  },
  subject: {
    table: 'subjects',
    alias: 'sub',
    columns: [
      'id', 'name', 'code', 'class_id', 'teacher_id', 'weekly_hours', 'max_score',
      'pass_score', 'color', 'subject_id',
    ],
    sortAllowList: ['name', 'code'],
    defaultSort: 'name',
  },
};

export interface WhereClause {
  sql: string;
  params: any[];
}

export interface ParsedPaging {
  page: number;
  pageSize: number;
  offset: number;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function parsePaging(query: OperationalListQuery): ParsedPaging {
  const rawPage = query.page === undefined ? 1 : Number(query.page);
  const rawPageSize = query.pageSize === undefined ? DEFAULT_PAGE_SIZE : Number(query.pageSize);

  if (!Number.isInteger(rawPage) || rawPage < 1) {
    throw new RangeError('page must be an integer >= 1');
  }
  if (!Number.isInteger(rawPageSize) || rawPageSize < 1 || rawPageSize > MAX_PAGE_SIZE) {
    throw new RangeError(`pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }

  return { page: rawPage, pageSize: rawPageSize, offset: (rawPage - 1) * rawPageSize };
}

export function placeholders(count: number): string {
  return new Array(count).fill('?').join(', ');
}

/**
 * Scope predicate derived ONLY from the authenticated identity.
 * Client-supplied identifiers are never used for authorization.
 */
export function buildScopeClause(resource: string, scope: PrincipalScope): WhereClause {
  if (scope.role === 'admin') return { sql: '', params: [] };

  if (resource === 'student') {
    if (scope.role === 'teacher') {
      if (!scope.teacherId) return { sql: '1 = 0', params: [] };
      return {
        sql: `${TABLE_SPECS.student.alias}.class_id IN (SELECT class_id FROM teacher_classes WHERE teacher_id = ?)`,
        params: [scope.teacherId],
      };
    }
    if (scope.role === 'student') {
      if (!scope.ownStudentId) return { sql: '1 = 0', params: [] };
      return { sql: `${TABLE_SPECS.student.alias}.id = ?`, params: [scope.ownStudentId] };
    }
    if (scope.role === 'parent') {
      if (scope.childStudentIds.length === 0) return { sql: '1 = 0', params: [] };
      return {
        sql: `${TABLE_SPECS.student.alias}.id IN (${placeholders(scope.childStudentIds.length)})`,
        params: [...scope.childStudentIds],
      };
    }
    return { sql: '1 = 0', params: [] };
  }

  if (resource === 'class' || resource === 'section' || resource === 'subject') {
    const classAlias = TABLE_SPECS[resource].alias;
    if (scope.role === 'teacher') {
      if (!scope.teacherId) return { sql: '1 = 0', params: [] };
      return {
        sql: `${classAlias}.class_id IN (SELECT class_id FROM teacher_classes WHERE teacher_id = ?)`,
        params: [scope.teacherId],
      };
    }
    if (scope.role === 'student') {
      if (!scope.ownClassId) return { sql: '1 = 0', params: [] };
      return { sql: `${classAlias}.class_id = ?`, params: [scope.ownClassId] };
    }
    if (scope.role === 'parent') {
      if (scope.childClassIds.length === 0) return { sql: '1 = 0', params: [] };
      return {
        sql: `${classAlias}.class_id IN (${placeholders(scope.childClassIds.length)})`,
        params: [...scope.childClassIds],
      };
    }
    return { sql: '1 = 0', params: [] };
  }

  return { sql: '1 = 0', params: [] };
}

function buildFilterClause(resource: string, query: OperationalListQuery): WhereClause {
  const spec = TABLE_SPECS[resource];
  const clauses: string[] = [];
  const params: any[] = [];

  const search = typeof query.searchQuery === 'string' ? query.searchQuery.trim() : '';
  if (search && resource === 'student') {
    clauses.push(`(${spec.alias}.name LIKE ? OR ${spec.alias}.academic_id LIKE ? OR ${spec.alias}.parent_name LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (search && resource === 'teacher') {
    clauses.push(`(${spec.alias}.name LIKE ? OR ${spec.alias}.specialization LIKE ? OR ${spec.alias}.qualification LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (resource === 'student') {
    if (query.classId) {
      clauses.push(`${spec.alias}.class_id = ?`);
      params.push(query.classId);
    }
    if (query.sectionId) {
      clauses.push(`${spec.alias}.section_id = ?`);
      params.push(query.sectionId);
    }
    if (query.status) {
      clauses.push(`${spec.alias}.status = ?`);
      params.push(query.status);
    }
  }

  if (resource === 'section' || resource === 'subject') {
    if (query.classId) {
      clauses.push(`${spec.alias}.class_id = ?`);
      params.push(query.classId);
    }
  }
  if (resource === 'subject' && query.teacherId) {
    clauses.push(`${spec.alias}.teacher_id = ?`);
    params.push(query.teacherId);
  }

  return { sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', params };
}

export function resolveSort(resource: string, query: OperationalListQuery): { column: string; direction: 'ASC' | 'DESC' } {
  const spec = TABLE_SPECS[resource];
  const requested = typeof query.sortBy === 'string' ? query.sortBy.trim() : '';
  const column = requested && spec.sortAllowList.includes(requested) ? requested : spec.defaultSort;
  const direction = String(query.sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return { column, direction };
}

export class OperationalReadRepository {
  constructor(private readonly ds: IDataSource) {}

  private columnList(resource: string): string {
    const spec = TABLE_SPECS[resource];
    return spec.columns.map((column) => `${spec.alias}.${column}`).join(', ');
  }

  private whereClause(resource: string, scope: PrincipalScope, query: OperationalListQuery): WhereClause {
    const scopeClause = buildScopeClause(resource, scope);
    const filterClause = buildFilterClause(resource, query);
    const sql = `${scopeClause.sql}${filterClause.sql}`;
    return { sql, params: [...scopeClause.params, ...filterClause.params] };
  }

  async list(
    resource: string,
    scope: PrincipalScope,
    query: OperationalListQuery,
  ): Promise<{ rows: Record<string, any>[]; total: number; page: number; pageSize: number }> {
    const spec = TABLE_SPECS[resource];
    const paging = parsePaging(query);
    const where = this.whereClause(resource, scope, query);
    const sort = resolveSort(resource, query);

    const countSql = `SELECT COUNT(*) AS total FROM ${spec.table} ${spec.alias}${where.sql ? ` WHERE ${where.sql}` : ''}`;
    const totalRaw = await this.ds.count(countSql, where.params);
    const total = Number(totalRaw) || 0;

    const listSql =
      `SELECT ${this.columnList(resource)} FROM ${spec.table} ${spec.alias}` +
      `${where.sql ? ` WHERE ${where.sql}` : ''}` +
      ` ORDER BY ${spec.alias}.${sort.column} ${sort.direction} LIMIT ? OFFSET ?`;
    const rows = await this.ds.query<Record<string, any>>(listSql, [...where.params, paging.pageSize, paging.offset]);

    return { rows, total, page: paging.page, pageSize: paging.pageSize };
  }

  async getById(resource: string, scope: PrincipalScope, id: string): Promise<Record<string, any> | null> {
    const spec = TABLE_SPECS[resource];
    const where = this.whereClause(resource, scope, {});
    const conditions = where.sql ? `${where.sql} AND ${spec.alias}.id = ?` : `${spec.alias}.id = ?`;
    const sql =
      `SELECT ${this.columnList(resource)} FROM ${spec.table} ${spec.alias}` +
      ` WHERE ${conditions} LIMIT 1`;
    const rows = await this.ds.query<Record<string, any>>(sql, [...where.params, id]);
    return rows.length > 0 ? rows[0] : null;
  }
}
