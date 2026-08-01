import { AcademicYearId } from '../value-objects';

export type AcademicYearStatus =
  | 'draft'
  | 'approved'
  | 'active'
  | 'closed'
  | 'archived';

export interface AcademicYearStatusHistoryProps {
  id: string;
  academicYearId: AcademicYearId;
  fromStatus?: AcademicYearStatus;
  toStatus: AcademicYearStatus;
  reason: string;
  changedBy: string;
  changedAt: Date;
}

export class AcademicYearStatusHistory {
  public readonly id: string;
  public readonly academicYearId: AcademicYearId;
  public readonly fromStatus?: AcademicYearStatus;
  public readonly toStatus: AcademicYearStatus;
  public readonly reason: string;
  public readonly changedBy: string;
  public readonly changedAt: Date;

  constructor(props: AcademicYearStatusHistoryProps) {
    if (!props.id.trim() || props.academicYearId.toString().length === 0 || !props.toStatus || !props.reason.trim() || !props.changedBy.trim()) {
      throw new Error('AcademicYearStatusHistory requires id, academicYearId, toStatus, reason, and changedBy.');
    }
    this.id = props.id.trim();
    this.academicYearId = props.academicYearId;
    this.fromStatus = props.fromStatus;
    this.toStatus = props.toStatus;
    this.reason = props.reason.trim();
    this.changedBy = props.changedBy.trim();
    this.changedAt = new Date(props.changedAt.getTime());
    Object.freeze(this);
  }
}

