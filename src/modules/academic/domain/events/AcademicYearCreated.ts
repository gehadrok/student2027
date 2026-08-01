import { createEventId, AcademicDomainEvent } from './AcademicDomainEvent';

export class AcademicYearCreated implements AcademicDomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly academicYearId: string,
    public readonly aggregateVersion: number,
    occurredAt = new Date()
  ) {
    this.eventId = createEventId();
    this.occurredAt = occurredAt;
    Object.freeze(this);
  }
}

