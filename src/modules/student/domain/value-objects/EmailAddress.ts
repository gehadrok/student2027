import { ValueObject } from './ValueObject';

export class EmailAddress extends ValueObject<string> {
  private static readonly pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  public readonly value: string;

  constructor(value: string) {
    super();
    const normalized = value.trim().toLowerCase();
    if (!EmailAddress.pattern.test(normalized)) {
      throw new Error('EmailAddress must be a valid email address.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof EmailAddress && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
