import { Enrollment } from '../entities/Enrollment';
import { GuardianLink } from '../entities/GuardianLink';
import { StatusHistory } from '../entities/StatusHistory';
import {
  GuardianAssigned,
  GuardianRemoved,
  StudentActivated,
  StudentArchived,
  StudentDomainEvent,
  StudentEnrolled,
  StudentGraduated,
  StudentReactivated,
  StudentRegistered,
  StudentSuspended,
  StudentTransferred,
  StudentWithdrawn
} from '../events';
import { BirthDate, EmailAddress, FullName, Gender, NationalId, PhoneNumber, StudentNumber } from '../value-objects';

export type StudentStatus =
  | 'registered'
  | 'enrolled'
  | 'active'
  | 'suspended'
  | 'transferred'
  | 'graduated'
  | 'withdrawn'
  | 'archived';

export interface StudentRegistrationProps {
  id: string;
  studentNumber: StudentNumber;
  fullName: FullName;
  birthDate: BirthDate;
  gender: Gender;
  nationalId?: NationalId;
  phoneNumber?: PhoneNumber;
  emailAddress?: EmailAddress;
  registeredBy: string;
  registeredAt?: Date;
}

export interface StudentSnapshot {
  id: string;
  studentNumber: StudentNumber;
  fullName: FullName;
  birthDate: BirthDate;
  gender: Gender;
  status: StudentStatus;
  version: number;
  lastModified: Date;
  nationalId?: NationalId;
  phoneNumber?: PhoneNumber;
  emailAddress?: EmailAddress;
  enrollment?: Enrollment;
  guardianLinks?: GuardianLink[];
  statusHistory?: StatusHistory[];
}

export class Student {
  private readonly domainEvents: StudentDomainEvent[] = [];
  private _status: StudentStatus;
  private _version: number;
  private _lastModified: Date;
  private _enrollment?: Enrollment;
  private readonly guardianLinks: GuardianLink[];
  private readonly statusHistory: StatusHistory[];

  private constructor(
    public readonly id: string,
    public readonly studentNumber: StudentNumber,
    public readonly fullName: FullName,
    public readonly birthDate: BirthDate,
    public readonly gender: Gender,
    public readonly nationalId: NationalId | undefined,
    public readonly phoneNumber: PhoneNumber | undefined,
    public readonly emailAddress: EmailAddress | undefined,
    status: StudentStatus,
    version: number,
    lastModified: Date,
    enrollment?: Enrollment,
    guardianLinks: GuardianLink[] = [],
    statusHistory: StatusHistory[] = []
  ) {
    this.assertNonEmpty(id, 'Student id');
    this.id = id.trim();
    this._status = status;
    this._version = version;
    this._lastModified = new Date(lastModified.getTime());
    this._enrollment = enrollment;
    this.guardianLinks = [...guardianLinks];
    this.statusHistory = [...statusHistory];
    this.validateInvariants();
  }

  static register(props: StudentRegistrationProps): Student {
    const registeredAt = props.registeredAt ?? new Date();
    const student = new Student(
      props.id,
      props.studentNumber,
      props.fullName,
      props.birthDate,
      props.gender,
      props.nationalId,
      props.phoneNumber,
      props.emailAddress,
      'registered',
      0,
      registeredAt
    );

    student.recordStatus(undefined, 'registered', 'Student registered', props.registeredBy, registeredAt);
    student.touch(registeredAt);
    student.addEvent(new StudentRegistered(student.id, student.version, registeredAt));
    return student;
  }

  static rehydrate(snapshot: StudentSnapshot): Student {
    return new Student(
      snapshot.id,
      snapshot.studentNumber,
      snapshot.fullName,
      snapshot.birthDate,
      snapshot.gender,
      snapshot.nationalId,
      snapshot.phoneNumber,
      snapshot.emailAddress,
      snapshot.status,
      snapshot.version,
      snapshot.lastModified,
      snapshot.enrollment,
      snapshot.guardianLinks ?? [],
      snapshot.statusHistory ?? []
    );
  }

  get status(): StudentStatus {
    return this._status;
  }

  get version(): number {
    return this._version;
  }

  get lastModified(): Date {
    return new Date(this._lastModified.getTime());
  }

  get enrollment(): Enrollment | undefined {
    return this._enrollment;
  }

  get guardians(): readonly GuardianLink[] {
    return this.guardianLinks;
  }

  get history(): readonly StatusHistory[] {
    return this.statusHistory;
  }

  enroll(enrollment: Enrollment, changedBy: string, changedAt = new Date()): void {
    if (enrollment.studentId !== this.id) {
      throw new Error('Enrollment must belong to the same student.');
    }
    this.transitionTo('enrolled', ['registered'], 'Student enrolled', changedBy, changedAt);
    this._enrollment = enrollment;
    this.addEvent(new StudentEnrolled(this.id, enrollment.id, this.version, changedAt));
  }

  activate(changedBy: string, changedAt = new Date()): void {
    if (!this._enrollment) {
      throw new Error('Student cannot activate before enrollment.');
    }
    this.transitionTo('active', ['enrolled', 'suspended'], 'Student activated', changedBy, changedAt);
    this.addEvent(new StudentActivated(this.id, this.version, changedAt));
  }

  transfer(transferId: string, changedBy: string, changedAt = new Date()): void {
    this.assertNonEmpty(transferId, 'Transfer id');
    this.transitionTo('transferred', ['active', 'suspended'], 'Student transferred', changedBy, changedAt);
    this.addEvent(new StudentTransferred(this.id, transferId.trim(), this.version, changedAt));
  }

  suspend(reason: string, changedBy: string, changedAt = new Date()): void {
    this.assertNonEmpty(reason, 'Suspension reason');
    this.transitionTo('suspended', ['active'], reason, changedBy, changedAt);
    this.addEvent(new StudentSuspended(this.id, reason.trim(), this.version, changedAt));
  }

  reactivate(changedBy: string, changedAt = new Date()): void {
    if (!this._enrollment) {
      throw new Error('Student cannot reactivate without enrollment.');
    }
    this.transitionTo('active', ['suspended'], 'Student reactivated', changedBy, changedAt);
    this.addEvent(new StudentReactivated(this.id, this.version, changedAt));
  }

  graduate(changedBy: string, changedAt = new Date()): void {
    this.transitionTo('graduated', ['active'], 'Student graduated', changedBy, changedAt);
    this.addEvent(new StudentGraduated(this.id, this.version, changedAt));
  }

  withdraw(reason: string, changedBy: string, changedAt = new Date()): void {
    this.assertNonEmpty(reason, 'Withdrawal reason');
    this.transitionTo('withdrawn', ['registered', 'enrolled', 'active', 'suspended'], reason, changedBy, changedAt);
    this.addEvent(new StudentWithdrawn(this.id, reason.trim(), this.version, changedAt));
  }

  archive(reason: string, changedBy: string, changedAt = new Date()): void {
    this.assertNonEmpty(reason, 'Archive reason');
    this.transitionTo('archived', ['transferred', 'graduated', 'withdrawn'], reason, changedBy, changedAt);
    this.addEvent(new StudentArchived(this.id, reason.trim(), this.version, changedAt));
  }

  assignGuardian(guardianLink: GuardianLink, changedBy: string, changedAt = new Date()): void {
    this.assertNonEmpty(changedBy, 'Changed by');
    this.assertMutable();
    if (guardianLink.studentId !== this.id) {
      throw new Error('GuardianLink must belong to the same student.');
    }
    if (this.guardianLinks.some((link) => link.guardianId === guardianLink.guardianId)) {
      throw new Error('Guardian is already assigned to this student.');
    }
    if (guardianLink.isPrimary && this.guardianLinks.some((link) => link.isPrimary)) {
      throw new Error('Student cannot have more than one primary guardian.');
    }

    this.guardianLinks.push(guardianLink);
    this.touch(changedAt);
    this.addEvent(new GuardianAssigned(this.id, guardianLink.guardianId, guardianLink.isPrimary, this.version, changedAt));
  }

  removeGuardian(guardianId: string, changedBy: string, changedAt = new Date()): void {
    this.assertNonEmpty(guardianId, 'Guardian id');
    this.assertNonEmpty(changedBy, 'Changed by');
    this.assertMutable();
    const index = this.guardianLinks.findIndex((link) => link.guardianId === guardianId.trim());
    if (index === -1) {
      throw new Error('Guardian is not assigned to this student.');
    }
    if (this.guardianLinks[index].isPrimary && this.guardianLinks.length > 1) {
      throw new Error('Cannot remove primary guardian while other guardian links remain.');
    }
    const [removed] = this.guardianLinks.splice(index, 1);

    this.touch(changedAt);
    this.addEvent(new GuardianRemoved(this.id, removed.guardianId, this.version, changedAt));
  }

  pullDomainEvents(): StudentDomainEvent[] {
    const events = [...this.domainEvents];
    this.clearDomainEvents();
    return events;
  }

  clearDomainEvents(): void {
    this.domainEvents.length = 0;
  }

  private transitionTo(toStatus: StudentStatus, allowedFrom: StudentStatus[], reason: string, changedBy: string, changedAt: Date): void {
    this.assertNonEmpty(reason, 'Transition reason');
    this.assertNonEmpty(changedBy, 'Changed by');
    this.rejectTerminalMutation(toStatus);
    if (!allowedFrom.includes(this._status)) {
      throw new Error(`Invalid student status transition from ${this._status} to ${toStatus}.`);
    }
    const fromStatus = this._status;
    this._status = toStatus;
    this.recordStatus(fromStatus, toStatus, reason, changedBy, changedAt);
    this.touch(changedAt);
  }

  private recordStatus(fromStatus: StudentStatus | undefined, toStatus: StudentStatus, reason: string, changedBy: string, changedAt: Date): void {
    this.statusHistory.push(
      new StatusHistory({
        id: `sh_${this.id}_${this.statusHistory.length + 1}`,
        studentId: this.id,
        fromStatus,
        toStatus,
        reason,
        changedBy,
        changedAt
      })
    );
  }

  private touch(changedAt: Date): void {
    this._version += 1;
    this._lastModified = new Date(changedAt.getTime());
    this.validateInvariants();
  }

  private addEvent(event: StudentDomainEvent): void {
    this.domainEvents.push(event);
  }

  private rejectTerminalMutation(toStatus: StudentStatus): void {
    if (toStatus === 'archived') {
      return;
    }
    if (this._status === 'archived') {
      throw new Error('Archived student cannot be changed.');
    }
    if (this._status === 'graduated') {
      throw new Error('Graduated student cannot transition except to archived.');
    }
    if (this._status === 'transferred') {
      throw new Error('Transferred student cannot transition except to archived.');
    }
    if (this._status === 'withdrawn') {
      throw new Error('Withdrawn student cannot transition except to archived.');
    }
  }

  private assertMutable(): void {
    if (this._status === 'archived') {
      throw new Error('Archived student cannot be changed.');
    }
    if (this._status === 'graduated') {
      throw new Error('Graduated student cannot be changed.');
    }
    if (this._status === 'transferred') {
      throw new Error('Transferred student cannot be changed.');
    }
    if (this._status === 'withdrawn') {
      throw new Error('Withdrawn student cannot be changed.');
    }
  }

  private validateInvariants(): void {
    if ((this._status === 'active' || this._status === 'suspended' || this._status === 'graduated') && !this._enrollment) {
      throw new Error('Current status requires enrollment.');
    }
    if (this.guardianLinks.filter((link) => link.isPrimary).length > 1) {
      throw new Error('Student cannot have more than one primary guardian.');
    }
    if (this._version < 0) {
      throw new Error('Student version cannot be negative.');
    }
  }

  private assertNonEmpty(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`${fieldName} is required.`);
    }
  }
}
