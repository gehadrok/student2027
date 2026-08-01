import { ValueObject } from './ValueObject';

/**
 * Student capacity of a section.
 *
 * Business rule: a section must have capacity of at least 1. A section with
 * capacity 0 is not a valid business state; unavailability is represented by
 * section status, not by capacity.
 */
export class SectionCapacity extends ValueObject<number> {
  public readonly value: number;

  constructor(value: number) {
    super();
    if (!Number.isInteger(value)) {
      throw new Error('SectionCapacity must be an integer.');
    }
    if (value < 1) {
      throw new Error('SectionCapacity must be at least 1.');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof SectionCapacity && other.value === this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}

