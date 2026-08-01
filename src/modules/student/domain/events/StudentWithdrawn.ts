import { createEventId, StudentDomainEvent } from './StudentDomainEvent';

export class StudentWithdrawn implements StudentDomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly studentId: string,
    public readonly reason: string,
    public readonly aggregateVersion: number,
    occurredAt = new Date()
  ) {
    this.eventId = createEventId();
    this.occurredAt = occurredAt;
    Object.freeze(this);
  }
}
