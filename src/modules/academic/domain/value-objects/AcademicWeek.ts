import { ValueObject } from './ValueObject';

/**
 * Week number within the academic year, from 1 to 52.
 */
export class AcademicWeek extends ValueObject<number> {
  public readonly value: number;

  constructor(value: number) {
    super();
    if (!Number.isInteger(value)) {
      throw new Error('AcademicWeek must be an integer.');
    }
    if (value < 1 || value > 52) {
      throw new Error('AcademicWeek must be between 1 and 52.');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof AcademicWeek && other.value === this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    return `W${String(this.value).padStart(2, '0')}`;
  }
}

