import { ValueObject } from './ValueObject';

export class StatusReason extends ValueObject<string> {
  public readonly value: string;

  constructor(value: string) {
    super();
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (normalized.length === 0) {
      throw new Error('StatusReason is required.');
    }
    if (normalized.length > 300) {
      throw new Error('StatusReason cannot exceed 300 characters.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof StatusReason && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

