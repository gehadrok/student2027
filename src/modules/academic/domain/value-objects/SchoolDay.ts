import { ValueObject } from './ValueObject';

export interface SchoolDayProps {
  date: Date;
  isInstructional?: boolean;
}

function toUtcMidnight(date: Date): Date {
  const value = new Date(date.getTime());
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

/**
 * An official school day date. Instructional by default; non-instructional
 * days (holidays, closures) are marked explicitly.
 */
export class SchoolDay extends ValueObject<SchoolDayProps> {
  public readonly date: Date;
  public readonly isInstructional: boolean;

  constructor(props: SchoolDayProps) {
    super();
    const date = toUtcMidnight(props.date);
    if (Number.isNaN(date.getTime())) {
      throw new Error('SchoolDay requires a valid date.');
    }
    this.date = date;
    this.isInstructional = props.isInstructional ?? true;
    Object.freeze(this);
  }

  get isoDate(): string {
    return this.date.toISOString().slice(0, 10);
  }

  get dayOfWeek(): number {
    return this.date.getUTCDay();
  }

  equals(other: unknown): boolean {
    return (
      other instanceof SchoolDay &&
      other.date.getTime() === this.date.getTime() &&
      other.isInstructional === this.isInstructional
    );
  }

  toJSON(): SchoolDayProps {
    return {
      date: new Date(this.date.getTime()),
      isInstructional: this.isInstructional
    };
  }

  toString(): string {
    return this.isoDate;
  }
}

