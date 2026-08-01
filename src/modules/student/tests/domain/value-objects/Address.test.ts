import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { Address } from '../../../domain/value-objects/Address';

test('Address normalizes, serializes, and compares equality', () => {
  const first = new Address({ street: ' Main   Street ', city: ' Dhalie ', governorate: ' Dhalie ', country: ' Yemen ', postalCode: ' ab12 ' });
  const second = new Address({ street: 'Main Street', city: 'Dhalie', governorate: 'Dhalie', country: 'Yemen', postalCode: 'AB12' });

  assert.equal(first.toString(), 'Main Street, Dhalie, Dhalie, Yemen, AB12');
  assert.deepEqual(first.toJSON(), second.toJSON());
  assert.equal(first.equals(second), true);
  assert.equal(Object.isFrozen(first), true);
});

test('Address rejects missing required fields', () => {
  assert.throws(() => new Address({ street: '', city: 'Dhalie', country: 'Yemen' }));
  assert.throws(() => new Address({ street: 'Main Street', city: '', country: 'Yemen' }));
});
