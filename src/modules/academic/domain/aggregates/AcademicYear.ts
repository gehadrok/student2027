import { AcademicTerm, AcademicTermStatus } from '../entities/AcademicTerm';
import { AcademicYearStatusHistory, AcademicYearStatusHistoryProps } from '../entities/AcademicYearStatusHistory';
import {
  AcademicDomainEvent,
  AcademicTermAdded,
  AcademicTermClosed,
  AcademicTermLocked,
  AcademicTermOpened,
  AcademicYearActivated,
  AcademicYearApproved,
  AcademicYearArchived,
  AcademicYearClosed,
  AcademicYearCreated
} from '../events';
import {
  AcademicTermCode,
  AcademicTermId,
  AcademicYearCode,
  AcademicYearId,
  DateRange,
  SchoolScopeId
} from '../value-objects';

export type AcademicYearStatus = 'draft' | 'approved' | 'active' | 'closed' | 'archived';

export interface AcademicYearCreationProps {
  id: AcademicYearId;
  code: AcademicYearCode;
  schoolScopeId: SchoolScopeId;
  dateRange: DateRange;
  createdBy: string;
  createdAt?: Date;
  ministryReferenceCode?: string;
}

export interface AcademicYearSnapshot {
  id: AcademicYearId;
  code: AcademicYearCode;
  schoolScopeId: SchoolScopeId;
  dateRange: DateRange;
  status: AcademicYearStatus;
  version: number;
  lastModified: Date;
  ministryReferenceCode?: string;
  terms?: AcademicTerm[];
  statusHistory?: AcademicYearStatusHistory[];
}

export class AcademicYear {
  private readonly domainEvents: AcademicDomainEvent[] = [];
  private _status: AcademicYearStatus;
  private _version: number;
  private _lastModified: Date;
  private readonly termList: AcademicTerm[];
  private readonly statusHistory: AcademicYearStatusHistory[];

  private constructor(
    public readonly id: AcademicYearId,
    public readonly code: AcademicYearCode,
    public readonly schoolScopeId: SchoolScopeId,
    public readonly dateRange: DateRange,
    public readonly ministryReferenceCode: string | undefined,
    status: AcademicYearStatus,
    version: number,
    lastModified: Date,
    initialTerms: AcademicTerm[] = [],
    initialStatusHistory: AcademicYearStatusHistory[] = []
  ) {
    this._status = status;
    this._version = version;
    this._lastModified = new Date(lastModified.getTime());
    this.termList = [...initialTerms];
    this.statusHistory = [...initialStatusHistory];
    this.validateInvariants();
  }

  static create(props: AcademicYearCreationProps): AcademicYear {
    const createdAt = props.createdAt ?? new Date();
    const year = new AcademicYear(
      props.id,
      props.code,
      props.schoolScopeId,
      props.dateRange,
      props.ministryReferenceCode?.trim() || undefined,
      'draft',
      0,
      createdAt
    );

    year.recordStatus(undefined, 'draft', 'Academic year created', props.createdBy, createdAt);
    year.touch(createdAt);
    year.addEvent(new AcademicYearCreated(year.id.toString(), year.version, createdAt));
    return year;
  }

  static rehydrate(snapshot: AcademicYearSnapshot): AcademicYear {
    return new AcademicYear(
      snapshot.id,
      snapshot.code,
      snapshot.schoolScopeId,
      snapshot.dateRange,
      snapshot.ministryReferenceCode,
      snapshot.status,
      snapshot.version,
      snapshot.lastModified,
      snapshot.terms ?? [],
      snapshot.statusHistory ?? []
    );
  }

  get status(): AcademicYearStatus {
    return this._status;
  }

  get version(): number {
    return this._version;
  }

  get lastModified(): Date {
    return new Date(this._lastModified.getTime());
  }

  get terms(): readonly AcademicTerm[] {
    return this.termList;
  }

  get history(): readonly AcademicYearStatusHistory[] {
    return this.statusHistory;
  }

  addTerm(term: AcademicTerm, changedBy: string, changedAt = new Date()): void {
    this.assertNonEmpty(changedBy, 'Changed by');
    this.assertEditable();
    if (!this.dateRange.contains(term.dateRange.startDate) || !this.dateRange.contains(term.dateRange.endDate)) {
      throw new Error('AcademicTerm must be inside the academic year date range.');
    }
    if (this.termList.some((existing) => existing.code.toString() === term.code.toString())) {
      throw new Error('AcademicTerm code must be unique within the academic year.');
    }
    if (this.termList.some((existing) => existing.dateRange.overlaps(term.dateRange))) {
      throw new Error('AcademicTerms cannot overlap within the academic year.');
    }

    this.termList.push(term);
    this.touch(changedAt);
    this.addEvent(new AcademicTermAdded(this.id.toString(), term.id.toString(), this.version, changedAt));
  }

  openTerm(termId: AcademicTermId, changedBy: string, changedAt = new Date()): void {
    this.transitionTerm(termId, 'open', ['planned'], changedBy, changedAt);
  }

  lockTerm(termId: AcademicTermId, changedBy: string, changedAt = new Date()): void {
    this.transitionTerm(termId, 'locked', ['open'], changedBy, changedAt);
  }

  closeTerm(termId: AcademicTermId, changedBy: string, changedAt = new Date()): void {
    this.transitionTerm(termId, 'closed', ['open', 'locked'], changedBy, changedAt);
  }

  approve(changedBy: string, changedAt = new Date()): void {
    this.transitionTo('approved', ['draft'], 'Academic year approved', changedBy, changedAt);
    this.addEvent(new AcademicYearApproved(this.id.toString(), this.version, changedAt));
  }

  activate(changedBy: string, changedAt = new Date()): void {
    if (this.termList.length === 0) {
      throw new Error('Academic year cannot activate without terms.');
    }
    this.transitionTo('active', ['approved'], 'Academic year activated', changedBy, changedAt);
    this.addEvent(new AcademicYearActivated(this.id.toString(), this.version, changedAt));
  }

  close(changedBy: string, changedAt = new Date()): void {
    this.transitionTo('closed', ['active'], 'Academic year closed', changedBy, changedAt);
    this.addEvent(new AcademicYearClosed(this.id.toString(), this.version, changedAt));
  }

  archive(reason: string, changedBy: string, changedAt = new Date()): void {
    this.assertNonEmpty(reason, 'Archive reason');
    this.transitionTo('archived', ['closed'], reason, changedBy, changedAt);
    this.addEvent(new AcademicYearArchived(this.id.toString(), this.version, changedAt));
  }

  pullDomainEvents(): AcademicDomainEvent[] {
    const events = [...this.domainEvents];
    this.clearDomainEvents();
    return events;
  }

  clearDomainEvents(): void {
    this.domainEvents.length = 0;
  }

  private transitionTerm(termId: AcademicTermId, toStatus: AcademicTermStatus, allowedFrom: AcademicTermStatus[], changedBy: string, changedAt: Date): void {
    this.assertNonEmpty(changedBy, 'Changed by');
    this.assertEditable();
    const term = this.termList.find((candidate) => candidate.id.toString() === termId.toString());
    if (!term) {
      throw new Error('AcademicTerm not found in this academic year.');
    }
    if (!allowedFrom.includes(term.status)) {
      throw new Error(`Invalid academic term status transition from ${term.status} to ${toStatus}.`);
    }

    const index = this.termList.findIndex((candidate) => candidate.id.toString() === termId.toString());
    this.termList[index] = new AcademicTerm({
      id: term.id,
      code: term.code,
      dateRange: term.dateRange,
      status: toStatus
    });
    this.touch(changedAt);

    if (toStatus === 'open') {
      this.addEvent(new AcademicTermOpened(this.id.toString(), termId.toString(), this.version, changedAt));
    } else if (toStatus === 'locked') {
      this.addEvent(new AcademicTermLocked(this.id.toString(), termId.toString(), this.version, changedAt));
    } else if (toStatus === 'closed') {
      this.addEvent(new AcademicTermClosed(this.id.toString(), termId.toString(), this.version, changedAt));
    }
  }

  private transitionTo(toStatus: AcademicYearStatus, allowedFrom: AcademicYearStatus[], reason: string, changedBy: string, changedAt: Date): void {
    this.assertNonEmpty(reason, 'Transition reason');
    this.assertNonEmpty(changedBy, 'Changed by');
    this.rejectTerminalMutation();
    if (!allowedFrom.includes(this._status)) {
      throw new Error(`Invalid academic year status transition from ${this._status} to ${toStatus}.`);
    }
    const fromStatus = this._status;
    this._status = toStatus;
    this.recordStatus(fromStatus, toStatus, reason, changedBy, changedAt);
    this.touch(changedAt);
  }

  private recordStatus(fromStatus: AcademicYearStatus | undefined, toStatus: AcademicYearStatus, reason: string, changedBy: string, changedAt: Date): void {
    this.statusHistory.push(
      new AcademicYearStatusHistory({
        id: `sh_${this.id.toString()}_${this.statusHistory.length + 1}`,
        academicYearId: this.id,
        fromStatus,
        toStatus,
        reason,
        changedBy,
        changedAt
      } as AcademicYearStatusHistoryProps)
    );
  }

  private touch(changedAt: Date): void {
    this._version += 1;
    this._lastModified = new Date(changedAt.getTime());
    this.validateInvariants();
  }

  private addEvent(event: AcademicDomainEvent): void {
    this.domainEvents.push(event);
  }

  private rejectTerminalMutation(): void {
    if (this._status === 'archived') {
      throw new Error('Archived academic year cannot be changed.');
    }
  }

  private assertEditable(): void {
    if (this._status !== 'draft') {
      throw new Error('Academic year is only editable in draft status.');
    }
  }

  private validateInvariants(): void {
    if (this._version < 0) {
      throw new Error('Academic year version cannot be negative.');
    }
    for (const term of this.termList) {
      if (!this.dateRange.contains(term.dateRange.startDate) || !this.dateRange.contains(term.dateRange.endDate)) {
        throw new Error('AcademicTerm must be inside the academic year date range.');
      }
    }
    for (let i = 0; i < this.termList.length; i += 1) {
      for (let j = i + 1; j < this.termList.length; j += 1) {
        if (this.termList[i].dateRange.overlaps(this.termList[j].dateRange)) {
          throw new Error('AcademicTerms cannot overlap within the academic year.');
        }
      }
    }
  }

  private assertNonEmpty(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`${fieldName} is required.`);
    }
  }
}

