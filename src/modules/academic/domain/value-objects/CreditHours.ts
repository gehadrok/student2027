import { ValueObject } from './ValueObject';

export class CreditHours extends ValueObject<number> {
  public readonly value: number;

  constructor(value: number) {
    super();
    if (Number.isNaN(value)) {
      throw new Error('CreditHours must be a number.');
    }
    if (value < 0) {
      throw new Error('CreditHours cannot be negative.');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof CreditHours && other.value === this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}

