import { ValueObject } from './ValueObject';

const LANGUAGE_PATTERN = /^[A-Z]{2,3}$/;

/**
 * Language of instruction, represented by an ISO 639 two- or three-letter
 * code such as AR, EN, FR, ARA.
 */
export class TeachingLanguage extends ValueObject<string> {
  public readonly value: string;

  constructor(value: string) {
    super();
    const normalized = value.trim().toUpperCase();
    if (!LANGUAGE_PATTERN.test(normalized)) {
      throw new Error('TeachingLanguage must be a 2-3 letter language code.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof TeachingLanguage && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

