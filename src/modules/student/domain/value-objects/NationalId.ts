import { ValueObject } from './ValueObject';

export class NationalId extends ValueObject<string> {
  public readonly value: string;

  constructor(value: string) {
    super();
    const normalized = value.replace(/[\s-]/g, '');
    if (!/^\d{6,20}$/.test(normalized)) {
      throw new Error('NationalId must contain 6-20 digits.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof NationalId && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  hasChecksumCandidate(): boolean {
    return this.value.length >= 8;
  }
}
