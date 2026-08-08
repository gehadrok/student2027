import { IDataSource } from '../src/core/datasource/IDataSource';
import { UnitOfWork } from '../src/core/datasource/UnitOfWork';
import { EventBus } from '../src/core/events/EventBus';
import { SQLiteAcademicYearRepository } from '../src/modules/academic/infrastructure/repositories/SQLiteAcademicYearRepository';
import { AcademicYearService } from '../src/modules/academic/application/services/AcademicYearService';

class InMemoryDataSource implements IDataSource {
  private tables: Map<string, Map<string, Record<string, any>>> = new Map();
  failNextTransaction = false;
  private txnActive = false;
  private txnSnapshot: Map<string, Map<string, Record<string, any>>> = new Map();

  tableName(sql: string): string {
    const m = sql.toLowerCase();
    if (m.includes('academic_years')) return 'academic_years';
    if (m.includes('academic_terms')) return 'academic_terms';
    if (m.includes('subjects_master')) return 'subjects_master';
    if (m.includes('schedule_periods')) return 'schedule_periods';
    if (m.includes('subjects')) return 'subjects';
    return 'misc';
  }

  store(): Map<string, Map<string, Record<string, any>>> {
    for (const t of ['academic_years', 'academic_terms', 'subjects_master', 'subjects', 'schedule_periods']) {
      if (!this.tables.has(t)) this.tables.set(t, new Map());
    }
    return this.tables;
  }

  query<T = any>(sql: string, params?: any[]): T[] {
    const t = this.tableName(sql);
    const table = this.store().get(t)!;
    let rows = Array.from(table.values());
    if (params && params.length > 0) {
      const key = String(params[params.length - 1]);
      rows = rows.filter((r) => Object.values(r).some((v) => String(v) === key));
    }
    return rows as unknown as T[];
  }

  queryOne<T = any>(sql: string, params?: any[]): T | null {
    const rows = this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  execute(sql: string, params?: any[]): { changes: number; lastInsertRowid: number } {
    const t = this.tableName(sql);
    const table = this.store().get(t)!;
    const lower = sql.toLowerCase();
    const id = params ? String(params[0]) : `id_${Math.random()}`;

    if (lower.startsWith('insert')) {
      const obj: Record<string, any> = {};
      const cols = (sql.match(/\(([^)]+)\)/) || [])[1]?.split(',').map((c) => c.trim()) || [];
      cols.forEach((c, i) => {
        obj[c] = params?.[i];
      });
      table.set(id, obj);
      return { changes: 1, lastInsertRowid: 1 };
    }
    if (lower.startsWith('update')) {
      const key = String(params?.[params!.length - 1]);
      const existing = table.get(key);
      const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
      if (existing && setMatch) {
        const assign = setMatch[1].split(',').map((a) => a.trim());
        const clone = { ...existing };
        assign.forEach((a) => {
          const eq = a.indexOf('=');
          const col = a.slice(0, eq).trim();
          const valPart = a.slice(eq + 1).trim();
          if (!/CURRENT_TIMESTAMP/.test(valPart.toUpperCase())) {
            const idx = -1;
            clone[col] = params?.[params!.length + idx] ?? clone[col];
          }
        });
        table.set(key, clone);
      }
      return { changes: existing ? 1 : 0, lastInsertRowid: 0 };
    }
    if (lower.startsWith('delete')) {
      const key = String(params?.[params!.length - 1]);
      const had = table.has(key);
      table.delete(key);
      return { changes: had ? 1 : 0, lastInsertRowid: 0 };
    }
    return { changes: 0, lastInsertRowid: 0 };
  }

  transaction(queries: Array<{ sql: string; params?: any[] }>): { success: boolean; error?: string } {
    if (this.failNextTransaction) {
      this.failNextTransaction = false;
      return { success: false, error: 'Simulated transaction failure' };
    }
    try {
      this.beginTransaction();
      for (const q of queries) this.execute(q.sql, q.params);
      this.commit();
      return { success: true };
    } catch (err: any) {
      this.rollback();
      return { success: false, error: err?.message || 'Transaction failed' };
    }
  }

  prepare(): { run: (params?: any[]) => void; free: () => void } {
    return { run: () => undefined, free: () => undefined };
  }
  count(sql: string, params?: any[]): number { return this.query(sql, params).length; }
  exists(sql: string, params?: any[]): boolean { return this.count(sql, params) > 0; }
  beginTransaction(): void {
    this.txnActive = true;
    this.txnSnapshot = new Map();
    for (const [name, table] of this.store()) this.txnSnapshot.set(name, new Map(table));
  }
  commit(): void { this.txnActive = false; }
  rollback(): void {
    if (this.txnActive && this.txnSnapshot.size > 0) {
      this.tables = this.txnSnapshot;
      this.txnActive = false;
    }
  }
}

const ds = new InMemoryDataSource();
const eventBus = EventBus.getInstance();
eventBus.clear();
const yearService = new AcademicYearService(new SQLiteAcademicYearRepository(ds, new UnitOfWork(ds), eventBus));

const dto = yearService.create({
  id: 'app-ay-2',
  code: '2025-2026',
  schoolScopeId: 'scope-1',
  startDate: '2025-09-01',
  endDate: '2026-06-30',
  createdBy: 'smoke-runner',
});
console.log('CREATE OK, dto.id =', dto.id, 'status =', dto.status);

const yrTable = ds.store().get('academic_years')!;
console.log('academic_years table rows:');
for (const [k, v] of yrTable.entries()) {
  console.log('  key=', JSON.stringify(k), 'row=', JSON.stringify(v));
}

// Direct findById reconstruction check
import { AcademicYearId } from '../src/modules/academic/domain/value-objects/AcademicYearId';
const yearRepo = new SQLiteAcademicYearRepository(ds, new UnitOfWork(ds), eventBus);
try {
  const y = yearRepo.findById(new AcademicYearId('app-ay-2'));
  console.log('DIRECT findById OK, status =', y?.status, 'startDate =', y?.dateRange.startDate.toISOString());
} catch (err: any) {
  console.log('DIRECT findById FAILED:', err.message);
}

try {
  const dto2 = yearService.addTerm({
    academicYearId: 'app-ay-2',
    id: 'app-term-1',
    code: 'F1',
    startDate: '2025-09-01',
    endDate: '2026-01-31',
    changedBy: 'smoke-runner',
  });
  console.log('ADDTERM OK, terms =', dto2.terms.length);
} catch (err: any) {
  console.log('ADDTERM FAILED:', err.message);
}

console.log('DONE');
