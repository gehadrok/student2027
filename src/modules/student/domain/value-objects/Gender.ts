import { ValueObject } from './ValueObject';

export type GenderValue = 'male' | 'female';

export class Gender extends ValueObject<GenderValue> {
  public readonly value: GenderValue;

  constructor(value: string) {
    super();
    const normalized = value.trim().toLowerCase();
    if (normalized !== 'male' && normalized !== 'female') {
      throw new Error('Gender must be male or female.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof Gender && other.value === this.value;
  }

  toJSON(): GenderValue {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
