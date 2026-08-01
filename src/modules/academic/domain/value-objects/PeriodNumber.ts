import { ValueObject } from './ValueObject';

/**
 * Sequential number of a teaching period within a school day template.
 * Period numbers start at 1.
 */
export class PeriodNumber extends ValueObject<number> {
  public readonly value: number;

  constructor(value: number) {
    super();
    if (!Number.isInteger(value)) {
      throw new Error('PeriodNumber must be an integer.');
    }
    if (value < 1) {
      throw new Error('PeriodNumber must be a positive integer.');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof PeriodNumber && other.value === this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}

