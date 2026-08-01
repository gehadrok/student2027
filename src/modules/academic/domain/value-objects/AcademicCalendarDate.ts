import { ValueObject } from './ValueObject';

function toUtcMidnight(date: Date): Date {
  const value = new Date(date.getTime());
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

/**
 * A single calendar date inside the academic calendar, normalized to UTC
 * midnight so equality and serialization are timezone-stable.
 */
export class AcademicCalendarDate extends ValueObject<string> {
  public readonly date: Date;

  constructor(value: Date) {
    super();
    const date = toUtcMidnight(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('AcademicCalendarDate requires a valid date.');
    }
    this.date = date;
    Object.freeze(this);
  }

  get isoDate(): string {
    return this.date.toISOString().slice(0, 10);
  }

  get dayOfWeek(): number {
    return this.date.getUTCDay();
  }

  equals(other: unknown): boolean {
    return other instanceof AcademicCalendarDate && other.date.getTime() === this.date.getTime();
  }

  toJSON(): string {
    return this.isoDate;
  }

  toString(): string {
    return this.isoDate;
  }
}

