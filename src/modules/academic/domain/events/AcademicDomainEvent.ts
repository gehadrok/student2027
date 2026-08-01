export interface AcademicDomainEvent {
  readonly eventId: string;
  readonly academicYearId: string;
  readonly occurredAt: Date;
  readonly aggregateVersion?: number;
}

export function createEventId(prefix = 'evt'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

