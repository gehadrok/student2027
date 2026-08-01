import { createEventId, StudentDomainEvent } from './StudentDomainEvent';

export class StudentRegistered implements StudentDomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly studentId: string,
    public readonly aggregateVersion: number,
    occurredAt = new Date()
  ) {
    this.eventId = createEventId();
    this.occurredAt = occurredAt;
    Object.freeze(this);
  }
}
