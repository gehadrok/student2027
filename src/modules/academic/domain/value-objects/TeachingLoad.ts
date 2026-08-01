import { ValueObject } from './ValueObject';

export interface TeachingLoadProps {
  weeklyPeriods: number;
  maxWeeklyPeriods?: number;
}

/**
 * Teaching load measured in weekly teaching periods, optionally bounded by a
 * maximum weekly load policy.
 */
export class TeachingLoad extends ValueObject<TeachingLoadProps> {
  public readonly weeklyPeriods: number;
  public readonly maxWeeklyPeriods: number | undefined;

  constructor(props: TeachingLoadProps) {
    super();
    if (!Number.isInteger(props.weeklyPeriods)) {
      throw new Error('TeachingLoad weeklyPeriods must be an integer.');
    }
    if (props.weeklyPeriods < 0) {
      throw new Error('TeachingLoad weeklyPeriods cannot be negative.');
    }
    if (props.maxWeeklyPeriods !== undefined) {
      if (!Number.isInteger(props.maxWeeklyPeriods)) {
        throw new Error('TeachingLoad maxWeeklyPeriods must be an integer.');
      }
      if (props.maxWeeklyPeriods <= 0) {
        throw new Error('TeachingLoad maxWeeklyPeriods must be a positive integer.');
      }
      if (props.weeklyPeriods > props.maxWeeklyPeriods) {
        throw new Error('TeachingLoad weeklyPeriods cannot exceed maxWeeklyPeriods.');
      }
    }
    this.weeklyPeriods = props.weeklyPeriods;
    this.maxWeeklyPeriods = props.maxWeeklyPeriods;
    Object.freeze(this);
  }

  isWithinLimit(): boolean {
    return this.maxWeeklyPeriods === undefined || this.weeklyPeriods <= this.maxWeeklyPeriods;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof TeachingLoad &&
      other.weeklyPeriods === this.weeklyPeriods &&
      other.maxWeeklyPeriods === this.maxWeeklyPeriods
    );
  }

  toJSON(): TeachingLoadProps {
    return {
      weeklyPeriods: this.weeklyPeriods,
      maxWeeklyPeriods: this.maxWeeklyPeriods
    };
  }

  toString(): string {
    return this.maxWeeklyPeriods === undefined
      ? `${this.weeklyPeriods} periods/week`
      : `${this.weeklyPeriods}/${this.maxWeeklyPeriods} periods/week`;
  }
}

