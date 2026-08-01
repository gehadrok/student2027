import { ValueObject } from './ValueObject';

export interface AddressProps {
  street: string;
  city: string;
  governorate?: string;
  country: string;
  postalCode?: string;
}

export class Address extends ValueObject<AddressProps> {
  public readonly street: string;
  public readonly city: string;
  public readonly governorate?: string;
  public readonly country: string;
  public readonly postalCode?: string;

  constructor(props: AddressProps) {
    super();
    const normalized: AddressProps = {
      street: Address.normalizePart(props.street),
      city: Address.normalizePart(props.city),
      governorate: props.governorate ? Address.normalizePart(props.governorate) : undefined,
      country: Address.normalizePart(props.country),
      postalCode: props.postalCode ? props.postalCode.trim().toUpperCase() : undefined
    };

    if (!normalized.street || !normalized.city || !normalized.country) {
      throw new Error('Address requires street, city, and country.');
    }

    this.street = normalized.street;
    this.city = normalized.city;
    this.governorate = normalized.governorate;
    this.country = normalized.country;
    this.postalCode = normalized.postalCode;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof Address && JSON.stringify(other.toJSON()) === JSON.stringify(this.toJSON());
  }

  toJSON(): AddressProps {
    return {
      street: this.street,
      city: this.city,
      governorate: this.governorate,
      country: this.country,
      postalCode: this.postalCode
    };
  }

  toString(): string {
    return [this.street, this.city, this.governorate, this.country, this.postalCode].filter(Boolean).join(', ');
  }

  private static normalizePart(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
