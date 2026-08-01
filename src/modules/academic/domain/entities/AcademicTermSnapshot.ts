import { AcademicTermProps } from './AcademicTerm';

export interface AcademicTermSnapshot {
  id: string;
  code: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export function toAcademicTermSnapshot(term: AcademicTermProps): AcademicTermSnapshot {
  return {
    id: term.id.toString(),
    code: term.code.toString(),
    startDate: new Date(term.dateRange.startDate.getTime()),
    endDate: new Date(term.dateRange.endDate.getTime()),
    status: term.status ?? 'planned'
  };
}

