import { ValueObject } from './ValueObject';

export class PhoneNumber extends ValueObject<string> {
  public readonly value: string;

  constructor(value: string, defaultCountryCode?: string) {
    super();
    const compact = value.trim().replace(/[()\s.-]/g, '');
    const normalized = compact.startsWith('+')
      ? compact
      : defaultCountryCode
        ? `+${defaultCountryCode.replace(/^\+/, '')}${compact.replace(/^0+/, '')}`
        : compact;

    if (!/^\+?\d{7,15}$/.test(normalized)) {
      throw new Error('PhoneNumber must contain 7-15 digits and may start with +.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof PhoneNumber && other.value === this.value;
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
