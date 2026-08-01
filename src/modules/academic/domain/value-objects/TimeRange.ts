import { ValueObject } from './ValueObject';

export interface TimeRangeProps {
  startTime: string;
  endTime: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class TimeRange extends ValueObject<TimeRangeProps> {
  public readonly startTime: string;
  public readonly endTime: string;

  constructor(props: TimeRangeProps) {
    super();
    const startTime = props.startTime.trim();
    const endTime = props.endTime.trim();
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      throw new Error('TimeRange requires start and end times in HH:mm format.');
    }
    if (startTime >= endTime) {
      throw new Error('TimeRange start time must be before end time.');
    }
    this.startTime = startTime;
    this.endTime = endTime;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof TimeRange && other.startTime === this.startTime && other.endTime === this.endTime;
  }

  toJSON(): TimeRangeProps {
    return {
      startTime: this.startTime,
      endTime: this.endTime
    };
  }

  toString(): string {
    return `${this.startTime}..${this.endTime}`;
  }
}

