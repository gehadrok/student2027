import { ValueObject } from './ValueObject';

export class SubjectName extends ValueObject<string> {
  public readonly value: string;

  constructor(value: string) {
    super();
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (normalized.length === 0) {
      throw new Error('SubjectName is required.');
    }
    if (normalized.length > 120) {
      throw new Error('SubjectName cannot exceed 120 characters.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof SubjectName && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

