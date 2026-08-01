import { ValueObject } from './ValueObject';

export interface DateRangeProps {
  startDate: Date;
  endDate: Date;
}

export class DateRange extends ValueObject<DateRangeProps> {
  public readonly startDate: Date;
  public readonly endDate: Date;

  constructor(props: DateRangeProps) {
    super();
    const startDate = new Date(props.startDate.getTime());
    const endDate = new Date(props.endDate.getTime());
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('DateRange requires valid start and end dates.');
    }
    if (startDate > endDate) {
      throw new Error('DateRange start date must be before or equal to end date.');
    }
    this.startDate = startDate;
    this.endDate = endDate;
    Object.freeze(this);
  }

  contains(date: Date): boolean {
    const value = new Date(date.getTime());
    return value >= this.startDate && value <= this.endDate;
  }

  overlaps(other: DateRange): boolean {
    return this.startDate <= other.endDate && other.startDate <= this.endDate;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof DateRange &&
      other.startDate.getTime() === this.startDate.getTime() &&
      other.endDate.getTime() === this.endDate.getTime()
    );
  }

  toJSON(): DateRangeProps {
    return {
      startDate: new Date(this.startDate.getTime()),
      endDate: new Date(this.endDate.getTime())
    };
  }

  toString(): string {
    return `${this.startDate.toISOString().slice(0, 10)}..${this.endDate.toISOString().slice(0, 10)}`;
  }
}

