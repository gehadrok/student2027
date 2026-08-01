import { ValueObject } from './ValueObject';

export class StudentNumber extends ValueObject<string> {
  private static readonly pattern = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

  public readonly value: string;

  constructor(value: string) {
    super();
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '-');
    if (!StudentNumber.pattern.test(normalized)) {
      throw new Error('StudentNumber must be 3-32 characters using letters, numbers, and hyphens.');
    }
    if (normalized.includes('--')) {
      throw new Error('StudentNumber cannot contain consecutive hyphens.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof StudentNumber && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
