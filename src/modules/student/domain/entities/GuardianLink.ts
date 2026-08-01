export interface GuardianLinkProps {
  id: string;
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimary: boolean;
}

export class GuardianLink {
  public readonly id: string;
  public readonly studentId: string;
  public readonly guardianId: string;
  public readonly relationship: string;
  public readonly isPrimary: boolean;

  constructor(props: GuardianLinkProps) {
    if (!props.id.trim() || !props.studentId.trim() || !props.guardianId.trim() || !props.relationship.trim()) {
      throw new Error('GuardianLink requires id, studentId, guardianId, and relationship.');
    }
    this.id = props.id.trim();
    this.studentId = props.studentId.trim();
    this.guardianId = props.guardianId.trim();
    this.relationship = props.relationship.trim();
    this.isPrimary = props.isPrimary;
    Object.freeze(this);
  }
}
