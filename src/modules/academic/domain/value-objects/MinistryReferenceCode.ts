import { ValueObject } from './ValueObject';

export class MinistryReferenceCode extends ValueObject<string> {
  public readonly value: string;

  constructor(value: string) {
    super();
    const normalized = value.trim().toUpperCase();
    if (normalized.length === 0) {
      throw new Error('MinistryReferenceCode is required.');
    }
    if (normalized.length > 64) {
      throw new Error('MinistryReferenceCode cannot exceed 64 characters.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof MinistryReferenceCode && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

