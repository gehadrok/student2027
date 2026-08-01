import { ValueObject } from './ValueObject';

/**
 * Base for Academic Domain normalized codes (year, term, stage, grade, section, curriculum, subject).
 * Codes are uppercase alphanumeric with hyphens, 2–32 characters, no consecutive hyphens.
 */
export abstract class CodeValue extends ValueObject<string> {
  private static readonly pattern = /^[A-Z0-9][A-Z0-9-]{1,31}$/;

  public readonly value: string;

  constructor(value: string, fieldName: string) {
    super();
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '-');
    if (!CodeValue.pattern.test(normalized)) {
      throw new Error(`${fieldName} must be 2-32 characters using letters, numbers, and hyphens.`);
    }
    if (normalized.includes('--')) {
      throw new Error(`${fieldName} cannot contain consecutive hyphens.`);
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof CodeValue && other.constructor === this.constructor && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

