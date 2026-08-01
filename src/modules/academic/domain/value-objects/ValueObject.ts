export abstract class ValueObject<TSerialized> {
  abstract equals(other: unknown): boolean;
  abstract toJSON(): TSerialized;
  abstract toString(): string;
}

