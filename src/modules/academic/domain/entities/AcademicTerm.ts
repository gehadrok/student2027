import { AcademicTermCode, AcademicTermId, DateRange } from '../value-objects';

export type AcademicTermStatus = 'planned' | 'open' | 'locked' | 'closed';

export interface AcademicTermProps {
  id: AcademicTermId;
  code: AcademicTermCode;
  dateRange: DateRange;
  status?: AcademicTermStatus;
}

export class AcademicTerm {
  public readonly id: AcademicTermId;
  public readonly code: AcademicTermCode;
  public readonly dateRange: DateRange;
  public readonly status: AcademicTermStatus;

  constructor(props: AcademicTermProps) {
    this.id = props.id;
    this.code = props.code;
    this.dateRange = props.dateRange;
    this.status = props.status ?? 'planned';
    Object.freeze(this);
  }
}

