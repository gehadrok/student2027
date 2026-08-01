import { IdentifierValue } from './IdentifierValue';

export class HolidayId extends IdentifierValue {
  constructor(value: string) {
    super(value, 'HolidayId');
  }
}

