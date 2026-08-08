import { AcademicYear } from '../../domain/aggregates/AcademicYear';
import { AcademicYearId } from '../../domain/value-objects/AcademicYearId';
import { AcademicYearCode } from '../../domain/value-objects/AcademicYearCode';
import { SchoolScopeId } from '../../domain/value-objects/SchoolScopeId';
import { DateRange } from '../../domain/value-objects/DateRange';
import { AcademicTerm } from '../../domain/entities/AcademicTerm';
import { AcademicTermId } from '../../domain/value-objects/AcademicTermId';
import { AcademicTermCode } from '../../domain/value-objects/AcademicTermCode';

/**
 * Row shape for the academic_years table (existing schema).
 */
export interface AcademicYearRow {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_current?: number;
  is_active?: number;
  display_order?: number;
}

/**
 * Row shape for the academic_terms table (existing schema).
 * Persists term children linked to the aggregate.
 */
export interface AcademicTermRow {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  description?: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  is_current?: number;
  is_active?: number;
  display_order?: number;
}

/**
 * Map an AcademicYear aggregate to persistence rows.
 * NOTE: the existing academic_years table has no status/version/school_scope_id
 * columns. The aggregate's lifecycle state is captured via is_active (active=1)
 * so it can be reconstructed. Full state columns require a future migration
 * (out of scope — no SQL schema changes allowed).
 */
export function academicYearToRows(year: AcademicYear): {
  year: AcademicYearRow;
  terms: AcademicTermRow[];
} {
  const yearRow: AcademicYearRow = {
    id: year.id.toString(),
    code: year.code.toString(),
    name_ar: year.code.toString(),
    name_en: year.code.toString(),
    description: year.status,
    start_date: toDateString(year.dateRange.startDate),
    end_date: toDateString(year.dateRange.endDate),
    is_current: year.status === 'active' ? 1 : 0,
    is_active: year.status === 'archived' ? 0 : 1,
    display_order: 0,
  };

  const termRows: AcademicTermRow[] = year.terms.map((term, index) => ({
    id: term.id.toString(),
    code: term.code.toString(),
    name_ar: term.code.toString(),
    name_en: term.code.toString(),
    description: term.status,
    academic_year_id: year.id.toString(),
    start_date: toDateString(term.dateRange.startDate),
    end_date: toDateString(term.dateRange.endDate),
    is_current: term.status === 'open' ? 1 : 0,
    is_active: term.status === 'closed' ? 0 : 1,
    display_order: index + 1,
  }));

  return { year: yearRow, terms: termRows };
}

/**
 * Reconstruct an AcademicYear aggregate from persistence rows via rehydrate().
 */
export function academicYearFromRows(
  year: AcademicYearRow,
  terms: AcademicTermRow[]
): AcademicYear {
  const id = new AcademicYearId(year.id);
  const code = new AcademicYearCode(year.code);
  const schoolScopeId = new SchoolScopeId(year.id);
  const dateRange = new DateRange({
    startDate: new Date(`${year.start_date}T00:00:00Z`),
    endDate: new Date(`${year.end_date}T00:00:00Z`),
  });

  const status = inferYearStatus(year);
  const version = 0;

  const termEntities = terms.map<AcademicTerm>((row) => {
    const termDateRange = new DateRange({
      startDate: new Date(`${row.start_date}T00:00:00Z`),
      endDate: new Date(`${row.end_date}T00:00:00Z`),
    });
    return new AcademicTerm({
      id: new AcademicTermId(row.id),
      code: new AcademicTermCode(row.code),
      dateRange: termDateRange,
      status: inferTermStatus(row),
    });
  });

  return AcademicYear.rehydrate({
    id,
    code,
    schoolScopeId,
    dateRange,
    status,
    version,
    lastModified: new Date(`${year.end_date}T00:00:00Z`),
    ministryReferenceCode: undefined,
    terms: termEntities,
  });
}

function inferYearStatus(year: AcademicYearRow): 'draft' | 'approved' | 'active' | 'closed' | 'archived' {
  if (year.is_active === 0) return 'archived';
  if (year.is_current === 1) return 'active';
  if ((year.description ?? '') === 'approved') return 'approved';
  if ((year.description ?? '') === 'closed') return 'closed';
  return 'draft';
}

function inferTermStatus(row: AcademicTermRow): 'planned' | 'open' | 'locked' | 'closed' {
  if (row.is_current === 1) return 'open';
  if (row.is_active === 0) return 'closed';
  if ((row.description ?? '') === 'locked') return 'locked';
  return 'planned';
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
