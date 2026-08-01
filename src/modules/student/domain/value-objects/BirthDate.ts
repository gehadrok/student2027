import { ValueObject } from './ValueObject';

export class BirthDate extends ValueObject<string> {
  public readonly value: Date;

  constructor(value: string | Date) {
    super();
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new Error('BirthDate must be a valid date.');
    }
    if (date > new Date()) {
      throw new Error('BirthDate cannot be in the future.');
    }
    this.value = Object.freeze(date);
    Object.freeze(this);
  }

  ageAt(referenceDate: Date = new Date()): number {
    let age = referenceDate.getUTCFullYear() - this.value.getUTCFullYear();
    const monthDelta = referenceDate.getUTCMonth() - this.value.getUTCMonth();
    const dayDelta = referenceDate.getUTCDate() - this.value.getUTCDate();
    if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
      age -= 1;
    }
    return age;
  }

  isAtLeast(age: number, referenceDate?: Date): boolean {
    return this.ageAt(referenceDate) >= age;
  }

  isAtMost(age: number, referenceDate?: Date): boolean {
    return this.ageAt(referenceDate) <= age;
  }

  equals(other: unknown): boolean {
    return other instanceof BirthDate && other.toJSON() === this.toJSON();
  }

  toJSON(): string {
    return this.value.toISOString().slice(0, 10);
  }

  toString(): string {
    return this.toJSON();
  }
}
