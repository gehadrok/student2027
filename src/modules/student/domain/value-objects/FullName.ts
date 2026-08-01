import { ValueObject } from './ValueObject';

export interface FullNameProps {
  firstName: string;
  middleName?: string;
  lastName: string;
}

export class FullName extends ValueObject<FullNameProps> {
  public readonly firstName: string;
  public readonly middleName?: string;
  public readonly lastName: string;

  constructor(props: FullNameProps) {
    super();
    const firstName = FullName.normalizePart(props.firstName);
    const middleName = props.middleName ? FullName.normalizePart(props.middleName) : undefined;
    const lastName = FullName.normalizePart(props.lastName);

    if (!firstName || !lastName) {
      throw new Error('FullName requires firstName and lastName.');
    }
    if ([firstName, middleName, lastName].filter(Boolean).join(' ').length > 120) {
      throw new Error('FullName cannot exceed 120 characters.');
    }

    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof FullName && JSON.stringify(other.toJSON()) === JSON.stringify(this.toJSON());
  }

  toJSON(): FullNameProps {
    return {
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName
    };
  }

  toString(): string {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }

  private static normalizePart(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
