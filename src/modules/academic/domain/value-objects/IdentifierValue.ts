import { ValueObject } from './ValueObject';

/**
 * Abstract base for Academic Domain identifier value objects.
 * Provides canonical normalization, immutability, and equality.
 */
export abstract class IdentifierValue extends ValueObject<string> {
  public readonly value: string;

  constructor(value: string, fieldName: string) {
    super();
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new Error(`${fieldName} is required.`);
    }
    if (normalized.length > 64) {
      throw new Error(`${fieldName} cannot exceed 64 characters.`);
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof IdentifierValue && other.constructor === this.constructor && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

