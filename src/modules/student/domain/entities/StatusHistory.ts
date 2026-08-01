export interface StatusHistoryProps {
  id: string;
  studentId: string;
  fromStatus?: string;
  toStatus: string;
  reason: string;
  changedBy: string;
  changedAt: Date;
}

export class StatusHistory {
  public readonly id: string;
  public readonly studentId: string;
  public readonly fromStatus?: string;
  public readonly toStatus: string;
  public readonly reason: string;
  public readonly changedBy: string;
  public readonly changedAt: Date;

  constructor(props: StatusHistoryProps) {
    if (!props.id.trim() || !props.studentId.trim() || !props.toStatus.trim() || !props.reason.trim() || !props.changedBy.trim()) {
      throw new Error('StatusHistory requires id, studentId, toStatus, reason, and changedBy.');
    }
    this.id = props.id.trim();
    this.studentId = props.studentId.trim();
    this.fromStatus = props.fromStatus?.trim();
    this.toStatus = props.toStatus.trim();
    this.reason = props.reason.trim();
    this.changedBy = props.changedBy.trim();
    this.changedAt = new Date(props.changedAt.getTime());
    Object.freeze(this);
  }
}
