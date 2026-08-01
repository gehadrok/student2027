import { ValueObject } from './ValueObject';

export type BloodTypeValue = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

const allowedBloodTypes = new Set<BloodTypeValue>(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

export class BloodType extends ValueObject<BloodTypeValue> {
  public readonly value: BloodTypeValue;

  constructor(value: string) {
    super();
    const normalized = value.trim().toUpperCase() as BloodTypeValue;
    if (!allowedBloodTypes.has(normalized)) {
      throw new Error('BloodType must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.');
    }
    this.value = normalized;
    Object.freeze(this);
  }

  equals(other: unknown): boolean {
    return other instanceof BloodType && other.value === this.value;
  }

  toJSON(): BloodTypeValue {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
