import { ValueObject } from './ValueObject';

export class VersionNumber extends ValueObject<number> {
  public readonly value: number;

  constructor(value: number) {
    super();
    if (!Number.isInteger(value)) {
      throw new Error('VersionNumber must be an integer.');
    }
    if (value < 0) {
      throw new Error('VersionNumber cannot be negative.');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof VersionNumber && other.value === this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}

