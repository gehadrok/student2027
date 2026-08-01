import { ValueObject } from './ValueObject';

export class WeeklyPeriodCount extends ValueObject<number> {
  public readonly value: number;

  constructor(value: number) {
    super();
    if (!Number.isInteger(value)) {
      throw new Error('WeeklyPeriodCount must be an integer.');
    }
    if (value < 0) {
      throw new Error('WeeklyPeriodCount cannot be negative.');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof WeeklyPeriodCount && other.value === this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}

