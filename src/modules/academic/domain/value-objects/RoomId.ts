import { IdentifierValue } from './IdentifierValue';

export class RoomId extends IdentifierValue {
  constructor(value: string) {
    super(value, 'RoomId');
  }
}

