import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PhoneNumber } from '../../../domain/value-objects/PhoneNumber';

test('PhoneNumber normalizes punctuation and supports default country code', () => {
  const local = new PhoneNumber(' 0777 123 456 ', '967');
  const international = new PhoneNumber('+967777123456');

  assert.equal(local.toString(), '+967777123456');
  assert.equal(local.toJSON(), '+967777123456');
  assert.equal(local.equals(international), true);
  assert.equal(Object.isFrozen(local), true);
});

test('PhoneNumber rejects invalid values', () => {
  assert.throws(() => new PhoneNumber('123'));
  assert.throws(() => new PhoneNumber('phone-number'));
});
