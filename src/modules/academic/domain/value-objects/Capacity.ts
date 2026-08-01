import { ValueObject } from './ValueObject';

export class Capacity extends ValueObject<number> {
  public readonly value: number;

  constructor(value: number) {
    super();
    if (!Number.isInteger(value)) {
      throw new Error('Capacity must be an integer.');
    }
    if (value < 0) {
      throw new Error('Capacity cannot be negative.');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof Capacity && other.value === this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}

